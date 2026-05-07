import base64
import json
import os
from io import BytesIO

os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "1"

import gradio as gr
import torch
from PIL import Image
from peft import PeftModel
from qwen_vl_utils import process_vision_info
from transformers import AutoProcessor, Qwen2VLForConditionalGeneration

MODEL_ID = "Qwen/Qwen2-VL-2B-Instruct"
ADAPTER_ID = "joshuarebo/insmile-dental-vision-lora"

print("Loading model in float16 to reduce memory...")
model = Qwen2VLForConditionalGeneration.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float16,
    device_map="cpu",
    low_cpu_mem_usage=True,
)
print("Loading LoRA adapter...")
model = PeftModel.from_pretrained(model, ADAPTER_ID)
model = model.merge_and_unload()
model.eval()
print("Loading processor...")
processor = AutoProcessor.from_pretrained(MODEL_ID)
print("Model ready!")

SYSTEM_PROMPT = """You are an expert dental radiologist AI. Analyze the dental X-ray and return a JSON object with your findings.

Output format:
{"findings": [{"label": "specific finding", "tooth": "FDI number", "severity": "mild|moderate|severe", "confidence": 0.0-1.0, "bbox_norm": [x, y, w, h]}], "overall": "summary", "confidence": 0.0-1.0, "recommendations": ["action"], "image_quality": "good|fair|poor"}

Rules: bbox_norm values are 0.0-1.0 (normalized). Use FDI tooth numbering. Return JSON ONLY."""

USER_PROMPT = "Analyze this dental radiograph. Identify all visible pathology using FDI tooth numbering. Return ONLY the JSON object."


def analyze_image(image):
    if image is None:
        return json.dumps({"error": "No image provided"})

    if isinstance(image, str):
        if "base64," in image:
            image = image.split("base64,")[1]
        image = Image.open(BytesIO(base64.b64decode(image))).convert("RGB")

    image = image.resize((448, 448))

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image},
                {"type": "text", "text": USER_PROMPT},
            ],
        },
    ]

    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, video_inputs = process_vision_info(messages)

    inputs = processor(
        text=[text],
        images=image_inputs,
        videos=video_inputs,
        padding=True,
        return_tensors="pt",
    )

    with torch.no_grad():
        generated_ids = model.generate(
            **inputs,
            max_new_tokens=1500,
            temperature=0.1,
            do_sample=True,
        )

    generated_ids_trimmed = [
        out_ids[len(in_ids):]
        for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
    ]
    output = processor.batch_decode(
        generated_ids_trimmed,
        skip_special_tokens=True,
        clean_up_tokenization_spaces=False,
    )[0]

    return output


with gr.Blocks(title="Insmile Dental Vision") as demo:
    gr.Markdown("# Insmile Dental Vision AI\nUpload a dental X-ray for analysis.")

    with gr.Row():
        img_input = gr.Image(type="pil", label="Dental X-ray")
        output = gr.Textbox(label="Analysis (JSON)", lines=20)

    btn = gr.Button("Analyze", variant="primary")
    btn.click(fn=analyze_image, inputs=img_input, outputs=output)

demo.queue()
demo.launch(server_name="0.0.0.0", server_port=7860)
