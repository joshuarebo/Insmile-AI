"""
HuggingFace Inference Endpoint handler for Insmile Dental Vision model.
Loads Qwen2-VL-2B-Instruct + LoRA adapter, processes dental X-rays.

Upload this file to the root of joshuarebo/insmile-dental-vision-lora on HuggingFace.
"""

import base64
import json
import re
from io import BytesIO
from typing import Any, Dict

import torch
from PIL import Image
from peft import PeftModel
from qwen_vl_utils import process_vision_info
from transformers import AutoProcessor, Qwen2VLForConditionalGeneration, BitsAndBytesConfig


class EndpointHandler:
    def __init__(self, path=""):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16

        base_model_id = "Qwen/Qwen2-VL-2B-Instruct"

        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=self.dtype,
            bnb_4bit_use_double_quant=True,
        )

        self.model = Qwen2VLForConditionalGeneration.from_pretrained(
            base_model_id,
            quantization_config=quantization_config,
            device_map="auto",
            torch_dtype=self.dtype,
        )

        # Merge LoRA adapter (path = the HF repo directory on the endpoint)
        self.model = PeftModel.from_pretrained(self.model, path)
        self.model.eval()

        self.processor = AutoProcessor.from_pretrained(base_model_id)

        # Match training config
        self.max_pixels = 256 * 28 * 28
        self.min_pixels = 56 * 56

    def __call__(self, data: Dict[str, Any]) -> Dict[str, Any]:
        inputs = data.get("inputs", data)

        # Extract image (base64 string)
        image_b64 = inputs.get("image", "")
        if not image_b64:
            return {"error": "No image provided"}

        # Strip data URL prefix if present
        if "base64," in image_b64:
            image_b64 = image_b64.split("base64,")[1]

        try:
            image = Image.open(BytesIO(base64.b64decode(image_b64))).convert("RGB")
        except Exception as e:
            return {"error": f"Invalid image: {str(e)}"}

        # Extract messages or use defaults
        messages = inputs.get("messages", None)
        if not messages:
            messages = [
                {
                    "role": "system",
                    "content": "You are an expert dental radiologist AI. Analyze the dental X-ray and return a JSON object with your findings.\n\nOutput format:\n{\"findings\": [{\"label\": \"specific finding\", \"tooth\": \"FDI number\", \"severity\": \"mild|moderate|severe\", \"confidence\": 0.0-1.0, \"bbox_norm\": [x, y, w, h]}], \"overall\": \"summary\", \"confidence\": 0.0-1.0, \"recommendations\": [\"action\"], \"image_quality\": \"good|fair|poor\"}\n\nRules: bbox_norm values are 0.0-1.0 (normalized). Use FDI tooth numbering. Return JSON ONLY.",
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": image},
                        {"type": "text", "text": "Analyze this dental radiograph. Identify all visible pathology using FDI tooth numbering. Return ONLY the JSON object."},
                    ],
                },
            ]
        else:
            # Inject PIL image into user message content
            for msg in messages:
                if msg["role"] == "user" and isinstance(msg["content"], list):
                    for item in msg["content"]:
                        if item.get("type") == "image":
                            item["image"] = image

        # Build model inputs
        text = self.processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        image_inputs, video_inputs = process_vision_info(messages)

        model_inputs = self.processor(
            text=[text],
            images=image_inputs,
            videos=video_inputs,
            padding=True,
            return_tensors="pt",
        ).to(self.device)

        # Generation parameters
        params = data.get("parameters", {})
        max_new_tokens = params.get("max_new_tokens", 1500)
        temperature = params.get("temperature", 0.1)

        with torch.no_grad():
            generated_ids = self.model.generate(
                **model_inputs,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                do_sample=temperature > 0,
            )

        # Decode only generated tokens
        generated_ids_trimmed = [
            out_ids[len(in_ids):]
            for in_ids, out_ids in zip(model_inputs.input_ids, generated_ids)
        ]
        output_text = self.processor.batch_decode(
            generated_ids_trimmed,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=False,
        )[0]

        return {"generated_text": output_text}
