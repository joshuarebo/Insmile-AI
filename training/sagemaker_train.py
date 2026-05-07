"""
Insmile AI — Fine-tune Qwen2-VL-2B on dental X-ray dataset via SageMaker.
This script runs as a SageMaker training job on ml.g5.xlarge (A10G, 24GB VRAM).
"""
import os
import json
import re
import random
import subprocess
import sys
import locale
from pathlib import Path

# Fix locale for TRL model card generation
os.environ["LANG"] = "en_US.UTF-8"
os.environ["LC_ALL"] = "en_US.UTF-8"
os.environ["PYTHONIOENCODING"] = "utf-8"

def install_deps():
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q",
                           "qwen-vl-utils", "peft", "trl", "bitsandbytes",
                           "datasets", "accelerate", "kaggle", "pillow<11"])

install_deps()

import torch
from torch.utils.data import Dataset as TorchDataset
from transformers import AutoProcessor, Qwen2VLForConditionalGeneration, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer, SFTConfig
from functools import partial
from qwen_vl_utils import process_vision_info
from huggingface_hub import login, HfApi
from PIL import Image

# ============================================================
# CONFIG
# ============================================================
BASE_MODEL = "Qwen/Qwen2-VL-2B-Instruct"
HF_REPO_NAME = "joshuarebo/insmile-dental-vision-lora"
HF_TOKEN = os.environ["HF_TOKEN"]
KAGGLE_TOKEN = os.environ["KAGGLE_API_TOKEN"]

EPOCHS = 1
BATCH_SIZE = 2
GRAD_ACCUM_STEPS = 4
LEARNING_RATE = 2e-4
MAX_SEQ_LENGTH = 1536
MAX_TRAIN_SAMPLES = 2000
LORA_R = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.05
MIN_PIXELS = 128 * 28 * 28
MAX_PIXELS = 512 * 28 * 28

OUTPUT_DIR = "/opt/ml/model"
CHECKPOINT_DIR = "/opt/ml/checkpoints"
DATA_DIR = Path("/opt/ml/input/data/training") if Path("/opt/ml/input/data/training").exists() else Path("/tmp/dental_data")

print(f"PyTorch: {torch.__version__}")
print(f"CUDA: {torch.cuda.is_available()}, Device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")
print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB" if torch.cuda.is_available() else "")

# ============================================================
# AUTH
# ============================================================
login(token=HF_TOKEN)

# ============================================================
# DOWNLOAD DATASET (via Kaggle API with bearer token)
# ============================================================
DATA_DIR.mkdir(parents=True, exist_ok=True)
KAGGLE_DIR = DATA_DIR / "kaggle_dental"

if not KAGGLE_DIR.exists() or len(list(KAGGLE_DIR.rglob("*.jpg"))) < 10:
    KAGGLE_DIR.mkdir(parents=True, exist_ok=True)
    print("Downloading dataset from Kaggle...")
    import urllib.request
    import zipfile

    dataset_url = "https://www.kaggle.com/api/v1/datasets/download/lokisilvres/dental-disease-panoramic-detection-dataset"
    zip_path = DATA_DIR / "dataset.zip"

    req = urllib.request.Request(dataset_url)
    req.add_header("Authorization", f"Bearer {KAGGLE_TOKEN}")

    print("  Downloading zip...")
    with urllib.request.urlopen(req, timeout=600) as resp, open(zip_path, "wb") as f:
        total = int(resp.headers.get("Content-Length", 0))
        downloaded = 0
        while True:
            chunk = resp.read(8192 * 1024)
            if not chunk:
                break
            f.write(chunk)
            downloaded += len(chunk)
            if total:
                print(f"  {downloaded / 1e6:.0f}/{total / 1e6:.0f} MB", end="\r")
    print(f"\n  Downloaded: {zip_path.stat().st_size / 1e6:.1f} MB")

    print("  Extracting...")
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(KAGGLE_DIR)
    zip_path.unlink()
    print("  Done.")

kaggle_images = [p for p in KAGGLE_DIR.rglob("*")
                 if p.is_file() and p.suffix.lower() in (".png", ".jpg", ".jpeg")
                 and p.stat().st_size > 10000]
print(f"Dataset: {len(kaggle_images)} images")

# ============================================================
# PARSE YOLO ANNOTATIONS
# ============================================================
def estimate_fdi_from_bbox(bbox_norm):
    cx = bbox_norm[0] + bbox_norm[2] / 2
    cy = bbox_norm[1] + bbox_norm[3] / 2
    is_upper = cy < 0.5
    is_right_side = cx < 0.5
    if is_upper and is_right_side: quadrant = 1
    elif is_upper: quadrant = 2
    elif not is_right_side: quadrant = 3
    else: quadrant = 4
    dist_from_center = abs(cx - 0.5) * 2
    tooth_num = min(8, max(1, int(dist_from_center * 8) + 1))
    return f"{quadrant}{tooth_num}"

def generate_recommendations(findings):
    recs = []
    labels = [f["label"].split(" on ")[0].lower() for f in findings]
    if "deep caries" in labels:
        recs.append("Urgent: Root canal treatment or extraction may be needed for deep caries")
    if "caries" in labels:
        recs.append("Composite or amalgam restoration recommended for carious lesions")
    if "periapical lesion" in labels:
        recs.append("Periapical pathology detected — consider endodontic evaluation")
    if "impacted tooth" in labels:
        recs.append("Surgical evaluation recommended for impacted tooth")
    if not recs:
        recs.append("Regular follow-up and preventive care recommended")
    recs.append("Patient education on oral hygiene and dietary habits")
    return recs[:4]

# Find class names
class_names = []
yaml_files = list(KAGGLE_DIR.rglob("data.yaml")) + list(KAGGLE_DIR.rglob("*.yaml"))
for yf in yaml_files:
    try:
        content = yf.read_text()
        if "names:" in content:
            bracket_match = re.search(r"names:\s*\[([^\]]+)\]", content)
            if bracket_match:
                class_names = [n.strip().strip("'\"") for n in bracket_match.group(1).split(",")]
            else:
                lines = content.split("names:")[1].split("\n")
                for line in lines:
                    match = re.match(r"\s*\d+:\s*(.+)", line)
                    if match:
                        class_names.append(match.group(1).strip())
                    elif class_names:
                        break
            break
    except:
        continue

if not class_names:
    class_names = ["Caries", "Crown", "Filling", "Implant", "Malaligned",
                   "Mandibular Canal", "Missing teeth", "Periapical lesion",
                   "Retained root", "Root Canal Treatment", "Root Piece",
                   "Impacted tooth", "Maxillary sinus", "Bone Loss",
                   "Fracture teeth", "Permanent Teeth", "Supra Eruption",
                   "TAD", "Abutment", "Attrition", "Bone defect",
                   "Gingival former", "Metal band", "Orthodontic brackets",
                   "Permanent retainer", "Post-core", "Plating", "Wire",
                   "Cyst", "Root resorption", "Primary teeth"]

print(f"Classes: {len(class_names)}")

# Parse label files
txt_files = [f for f in KAGGLE_DIR.rglob("*.txt")
             if f.stem != "classes" and "README" not in f.name
             and f.parent.name in ("labels", "train", "val", "test")]
if not txt_files:
    txt_files = [f for f in KAGGLE_DIR.rglob("*.txt")
                 if f.stem != "classes" and "README" not in f.name
                 and f.stat().st_size > 0 and f.stat().st_size < 50000]

print(f"Label files: {len(txt_files)}")

all_examples = []
for txt_path in txt_files:
    img_path = None
    for ext in [".jpg", ".jpeg", ".png", ".bmp"]:
        candidate = txt_path.with_suffix(ext)
        if candidate.exists():
            img_path = candidate
            break
        for img_dir in [txt_path.parent.parent / "images" / txt_path.parent.name,
                        txt_path.parent.parent / "images"]:
            if img_dir.exists():
                candidate = img_dir / (txt_path.stem + ext)
                if candidate.exists():
                    img_path = candidate
                    break
        if img_path:
            break

    if img_path is None:
        continue

    findings = []
    try:
        for line in txt_path.read_text().strip().split("\n"):
            parts = line.strip().split()
            if len(parts) < 5:
                continue
            cls_id = int(parts[0])
            x_center, y_center, w, h = float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])
            x = x_center - w / 2
            y = y_center - h / 2
            bbox_norm = [round(x, 4), round(y, 4), round(w, 4), round(h, 4)]
            cat_name = class_names[cls_id] if cls_id < len(class_names) else f"Class {cls_id}"
            cat_lower = cat_name.lower()
            if any(k in cat_lower for k in ["deep", "periapical", "lesion", "fracture"]):
                severity = "severe"
            elif any(k in cat_lower for k in ["caries", "decay", "bone loss"]):
                severity = "moderate"
            else:
                severity = "mild"
            tooth = estimate_fdi_from_bbox(bbox_norm)
            findings.append({
                "label": f"{cat_name} on tooth {tooth}", "tooth": tooth,
                "severity": severity, "confidence": 0.92, "bbox_norm": bbox_norm,
            })
    except:
        continue

    if not findings:
        continue

    target = {
        "findings": findings[:6],
        "overall": f"Panoramic X-ray showing {len(findings)} finding{'s' if len(findings) > 1 else ''}: {', '.join(set(f['label'].split(' on ')[0] for f in findings[:6]))}.",
        "confidence": 0.88,
        "recommendations": generate_recommendations(findings),
        "image_quality": "good",
    }
    all_examples.append({"image_path": str(img_path), "target_json": json.dumps(target)})

print(f"Total examples: {len(all_examples)}")

# ============================================================
# BUILD DATASET
# ============================================================
SYSTEM_PROMPT = """You are an expert dental radiologist AI. Analyze the dental X-ray and return a JSON object with your findings.

Output format:
{"findings": [{"label": "specific finding", "tooth": "FDI number", "severity": "mild|moderate|severe", "confidence": 0.0-1.0, "bbox_norm": [x, y, w, h]}], "overall": "summary", "confidence": 0.0-1.0, "recommendations": ["action"], "image_quality": "good|fair|poor"}

Rules: bbox_norm values are 0.0-1.0 (normalized). Use FDI tooth numbering. Return JSON ONLY."""

USER_PROMPT = "Analyze this dental radiograph. Identify all visible pathology using FDI tooth numbering. Return ONLY the JSON object."

def build_conversation(example):
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": [
                {"type": "image", "image": example["image_path"]},
                {"type": "text", "text": USER_PROMPT},
            ]},
            {"role": "assistant", "content": example["target_json"]},
        ]
    }

class ChatDataset(TorchDataset):
    def __init__(self, conversations):
        self.conversations = conversations
    def __len__(self):
        return len(self.conversations)
    def __getitem__(self, idx):
        return self.conversations[idx]

random.seed(42)
random.shuffle(all_examples)
capped = all_examples[:MAX_TRAIN_SAMPLES]
split_idx = max(1, int(len(capped) * 0.9))
train_convos = [build_conversation(ex) for ex in capped[:split_idx]]
val_convos = [build_conversation(ex) for ex in capped[split_idx:]]

train_dataset = ChatDataset(train_convos)
val_dataset = ChatDataset(val_convos)
print(f"Train: {len(train_dataset)}, Val: {len(val_dataset)}")

# ============================================================
# LOAD MODEL
# ============================================================
compute_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=compute_dtype,
    bnb_4bit_use_double_quant=True,
)

print(f"Loading {BASE_MODEL} in 4-bit ({compute_dtype})...")
model = Qwen2VLForConditionalGeneration.from_pretrained(
    BASE_MODEL,
    quantization_config=bnb_config,
    torch_dtype=compute_dtype,
    device_map="auto",
    trust_remote_code=True,
    low_cpu_mem_usage=True,
)

processor = AutoProcessor.from_pretrained(
    BASE_MODEL, trust_remote_code=True,
    min_pixels=MIN_PIXELS, max_pixels=MAX_PIXELS,
)

model = prepare_model_for_kbit_training(model)
print(f"Model loaded. VRAM: {torch.cuda.memory_allocated() / 1e9:.1f} GB")

# LoRA
lora_config = LoraConfig(
    r=LORA_R, lora_alpha=LORA_ALPHA, lora_dropout=LORA_DROPOUT,
    bias="none", task_type="CAUSAL_LM",
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
)
model = get_peft_model(model, lora_config)
trainable, total = model.get_nb_trainable_parameters()
print(f"Trainable: {trainable:,} / {total:,} ({100*trainable/total:.2f}%)")

# ============================================================
# TRAINING
# ============================================================
total_steps = len(train_convos) // (BATCH_SIZE * GRAD_ACCUM_STEPS)
warmup_steps = max(1, int(total_steps * 0.05))

use_bf16 = torch.cuda.is_bf16_supported()

training_args = SFTConfig(
    output_dir=CHECKPOINT_DIR,
    num_train_epochs=EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    per_device_eval_batch_size=1,
    gradient_accumulation_steps=GRAD_ACCUM_STEPS,
    learning_rate=LEARNING_RATE,
    lr_scheduler_type="cosine",
    warmup_steps=warmup_steps,
    weight_decay=0.01,
    logging_steps=10,
    eval_strategy="steps",
    eval_steps=50,
    save_strategy="steps",
    save_steps=50,
    save_total_limit=2,
    bf16=use_bf16,
    fp16=not use_bf16,
    gradient_checkpointing=True,
    dataset_text_field="",
    dataset_kwargs={"skip_prepare_dataset": True},
    dataloader_pin_memory=False,
    remove_unused_columns=False,
    report_to="none",
    hub_model_id=None,
)

# Disable model card generation (causes UnicodeDecodeError on non-UTF8 systems)
import trl.trainer.sft_trainer
if hasattr(trl.trainer.sft_trainer.SFTTrainer, "create_model_card"):
    trl.trainer.sft_trainer.SFTTrainer.create_model_card = lambda self, **kwargs: None

def collate_fn(examples, processor):
    texts = []
    all_images = []
    for example in examples:
        messages = example["messages"]
        text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
        texts.append(text)
        images, _ = process_vision_info(messages)
        all_images.append(images)

    flat_images = []
    for imgs in all_images:
        if imgs:
            flat_images.extend(imgs)

    batch = processor(
        text=texts,
        images=flat_images if flat_images else None,
        padding=True, truncation=True,
        max_length=MAX_SEQ_LENGTH,
        return_tensors="pt",
    )
    batch["labels"] = batch["input_ids"].clone()
    return batch

trainer = SFTTrainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    data_collator=partial(collate_fn, processor=processor),
    processing_class=processor,
)

print(f"Training: {total_steps} steps, batch={BATCH_SIZE}x{GRAD_ACCUM_STEPS}")
train_result = trainer.train()
print(f"Training complete! Loss: {train_result.training_loss:.4f}")

# ============================================================
# SAVE & UPLOAD
# ============================================================
os.makedirs(OUTPUT_DIR, exist_ok=True)
model.save_pretrained(OUTPUT_DIR)
processor.save_pretrained(OUTPUT_DIR)

total_size = sum(os.path.getsize(os.path.join(OUTPUT_DIR, f))
                 for f in os.listdir(OUTPUT_DIR)
                 if os.path.isfile(os.path.join(OUTPUT_DIR, f)))
print(f"Adapter saved: {total_size / 1e6:.1f} MB")

# Upload to HuggingFace
api = HfApi()
try:
    api.create_repo(HF_REPO_NAME, private=True, exist_ok=True)
except Exception as e:
    print(f"Repo note: {e}")

api.upload_folder(
    folder_path=OUTPUT_DIR,
    repo_id=HF_REPO_NAME,
    commit_message="Insmile dental vision LoRA - trained on Kaggle dental dataset (SageMaker)",
)
print(f"Uploaded to: https://huggingface.co/{HF_REPO_NAME}")
print("DONE!")
