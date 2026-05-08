"""
Insmile AI — Model Evaluation Script
Runs inference on DENTEX test set and computes F1, precision, recall.

Usage:
  python evaluate.py --model joshuarebo/insmile-dental-vision-lora
  python evaluate.py --model joshuarebo/insmile-dental-vision-lora --samples 50
"""
import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "1"

import torch
from PIL import Image
from peft import PeftModel
from qwen_vl_utils import process_vision_info
from transformers import AutoProcessor, Qwen2VLForConditionalGeneration, BitsAndBytesConfig
from huggingface_hub import snapshot_download


# ============================================================
# EVALUATION METRICS
# ============================================================

def compute_iou(box1, box2):
    """Compute IoU between two [x, y, w, h] normalized boxes."""
    x1, y1, w1, h1 = box1
    x2, y2, w2, h2 = box2

    xi1 = max(x1, x2)
    yi1 = max(y1, y2)
    xi2 = min(x1 + w1, x2 + w2)
    yi2 = min(y1 + h1, y2 + h2)

    inter_area = max(0, xi2 - xi1) * max(0, yi2 - yi1)
    box1_area = w1 * h1
    box2_area = w2 * h2
    union_area = box1_area + box2_area - inter_area

    if union_area == 0:
        return 0.0
    return inter_area / union_area


def match_findings(predicted, ground_truth, iou_threshold=0.3, label_match=True):
    """
    Match predicted findings to ground truth.
    Returns (true_positives, false_positives, false_negatives).

    Matching criteria:
    - If label_match=True: same pathology class AND IoU > threshold
    - If label_match=False: just IoU > threshold (location-only)
    """
    matched_gt = set()
    tp = 0
    fp = 0

    for pred in predicted:
        pred_label = normalize_label(pred.get("label", ""))
        pred_bbox = pred.get("bbox_norm")
        best_iou = 0
        best_gt_idx = -1

        for gt_idx, gt in enumerate(ground_truth):
            if gt_idx in matched_gt:
                continue

            gt_label = normalize_label(gt.get("label", ""))
            gt_bbox = gt.get("bbox_norm")

            if label_match and pred_label != gt_label:
                continue

            if pred_bbox and gt_bbox:
                iou = compute_iou(pred_bbox, gt_bbox)
                if iou > best_iou:
                    best_iou = iou
                    best_gt_idx = gt_idx
            elif not pred_bbox and not gt_bbox:
                # No bbox for either — match on label alone
                best_iou = 1.0
                best_gt_idx = gt_idx
                break

        if best_iou >= iou_threshold and best_gt_idx >= 0:
            tp += 1
            matched_gt.add(best_gt_idx)
        else:
            fp += 1

    fn = len(ground_truth) - len(matched_gt)
    return tp, fp, fn


def normalize_label(label):
    """Normalize finding label for comparison."""
    label = label.lower()
    # Remove "on tooth XX" suffix
    label = re.sub(r"\s*on\s+tooth\s+\d+", "", label)
    # Standardize common names
    label = label.replace("periapical lesion", "periapical")
    label = label.replace("impacted tooth", "impacted")
    label = label.replace("deep caries", "deep_caries")
    label = label.strip()
    return label


def compute_metrics(all_tp, all_fp, all_fn):
    """Compute precision, recall, F1 from aggregated counts."""
    precision = all_tp / (all_tp + all_fp) if (all_tp + all_fp) > 0 else 0.0
    recall = all_tp / (all_tp + all_fn) if (all_tp + all_fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    return precision, recall, f1


# ============================================================
# GROUND TRUTH PARSER (DENTEX COCO format)
# ============================================================

DENTEX_CLASSES = {1: "Caries", 2: "Deep Caries", 3: "Periapical Lesion", 4: "Impacted Tooth"}


def load_dentex_ground_truth(dentex_dir):
    """Load DENTEX test set ground truth annotations."""
    dentex_dir = Path(dentex_dir)

    # Find the diagnosis annotations JSON
    json_candidates = (
        list(dentex_dir.rglob("*test*annotations*.json")) +
        list(dentex_dir.rglob("*diagnosis*test*.json")) +
        list(dentex_dir.rglob("*val*annotations*.json")) +
        list(dentex_dir.rglob("*train*annotations*.json"))
    )

    if not json_candidates:
        json_candidates = [f for f in dentex_dir.rglob("*.json") if f.stat().st_size > 5000]

    print(f"Found {len(json_candidates)} annotation files")

    ground_truth = {}  # image_path -> [findings]

    for json_path in json_candidates:
        try:
            with open(json_path) as f:
                coco = json.load(f)
        except:
            continue

        if "annotations" not in coco or "images" not in coco:
            continue

        # Check if this has diagnosis annotations
        categories = {c["id"]: c["name"] for c in coco.get("categories", [])}
        has_diagnosis = any(name.lower() in ("caries", "deep caries", "periapical lesion", "impacted tooth", "impacted")
                          for name in categories.values())

        if not has_diagnosis and len(categories) > 10:
            continue  # Skip quadrant/enumeration-only annotations

        id_to_file = {img["id"]: img["file_name"] for img in coco["images"]}
        id_to_size = {img["id"]: (img["width"], img["height"]) for img in coco["images"]}

        # Group by image
        img_anns = {}
        for ann in coco["annotations"]:
            img_id = ann["image_id"]
            if img_id not in img_anns:
                img_anns[img_id] = []
            img_anns[img_id].append(ann)

        for img_id, anns in img_anns.items():
            file_name = id_to_file.get(img_id)
            if not file_name:
                continue

            # Find image path
            img_path = None
            for candidate in dentex_dir.rglob(file_name):
                img_path = candidate
                break

            if not img_path or not img_path.exists():
                continue

            w_img, h_img = id_to_size.get(img_id, (1, 1))
            findings = []

            for ann in anns:
                cat_id = ann["category_id"]
                cat_name = categories.get(cat_id, DENTEX_CLASSES.get(cat_id, f"Class {cat_id}"))

                bbox = ann["bbox"]  # COCO: [x, y, width, height] in pixels
                bbox_norm = [
                    round(bbox[0] / w_img, 4),
                    round(bbox[1] / h_img, 4),
                    round(bbox[2] / w_img, 4),
                    round(bbox[3] / h_img, 4),
                ]

                findings.append({
                    "label": cat_name,
                    "bbox_norm": bbox_norm,
                })

            if findings:
                ground_truth[str(img_path)] = findings

    return ground_truth


# ============================================================
# MODEL INFERENCE
# ============================================================

SYSTEM_PROMPT = """You are an expert dental radiologist AI. Analyze the dental X-ray and return a JSON object with your findings.

Output format:
{"findings": [{"label": "specific finding", "tooth": "FDI number", "severity": "mild|moderate|severe", "confidence": 0.0-1.0, "bbox_norm": [x, y, w, h]}], "overall": "summary", "confidence": 0.0-1.0, "recommendations": ["action"], "image_quality": "good|fair|poor"}

Rules: bbox_norm values are 0.0-1.0 (normalized). Use FDI tooth numbering. Return JSON ONLY."""

USER_PROMPT = "Analyze this dental radiograph. Identify all visible pathology using FDI tooth numbering. Return ONLY the JSON object."


def load_model(adapter_id, use_gpu=True):
    """Load base model + LoRA adapter."""
    base_model = "Qwen/Qwen2-VL-2B-Instruct"
    device = "cuda" if use_gpu and torch.cuda.is_available() else "cpu"
    dtype = torch.bfloat16 if device == "cuda" and torch.cuda.is_bf16_supported() else torch.float16

    if device == "cuda":
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=dtype,
        )
        model = Qwen2VLForConditionalGeneration.from_pretrained(
            base_model, quantization_config=bnb_config, device_map="auto", torch_dtype=dtype,
        )
    else:
        model = Qwen2VLForConditionalGeneration.from_pretrained(
            base_model, torch_dtype=dtype, device_map="cpu", low_cpu_mem_usage=True,
        )

    model = PeftModel.from_pretrained(model, adapter_id)
    model.eval()

    processor = AutoProcessor.from_pretrained(base_model)
    return model, processor, device


def run_inference(model, processor, image_path, device):
    """Run model on a single image, return parsed findings."""
    image = Image.open(image_path).convert("RGB").resize((448, 448))

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": [
            {"type": "image", "image": image},
            {"type": "text", "text": USER_PROMPT},
        ]},
    ]

    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, video_inputs = process_vision_info(messages)

    inputs = processor(
        text=[text], images=image_inputs, videos=video_inputs,
        padding=True, return_tensors="pt",
    )
    if device == "cuda":
        inputs = {k: v.to(device) if hasattr(v, 'to') else v for k, v in inputs.items()}

    with torch.no_grad():
        generated_ids = model.generate(
            **inputs, max_new_tokens=1500, temperature=0.1,
            do_sample=True, repetition_penalty=1.3, no_repeat_ngram_size=5,
        )

    generated_ids_trimmed = [
        out_ids[len(in_ids):]
        for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
    ]
    output = processor.batch_decode(
        generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False,
    )[0]

    # Parse JSON from output
    try:
        # Try direct parse
        parsed = json.loads(output)
        return parsed.get("findings", [])
    except:
        pass

    # Try to extract JSON
    match = re.search(r'\{[\s\S]*\}', output)
    if match:
        try:
            parsed = json.loads(match.group())
            return parsed.get("findings", [])
        except:
            pass

    return []


# ============================================================
# MAIN EVALUATION LOOP
# ============================================================

def evaluate(args):
    print("=" * 60)
    print("INSMILE DENTAL VISION — MODEL EVALUATION")
    print("=" * 60)

    # Download DENTEX if needed
    dentex_dir = Path(args.data_dir)
    if not dentex_dir.exists() or len(list(dentex_dir.rglob("*.png"))) < 50:
        print("\nDownloading DENTEX dataset...")
        snapshot_download(
            repo_id="ibrahimhamamci/DENTEX",
            repo_type="dataset",
            local_dir=str(dentex_dir),
        )

    # Load ground truth
    print("\nLoading ground truth annotations...")
    ground_truth = load_dentex_ground_truth(dentex_dir)
    print(f"Ground truth: {len(ground_truth)} images with annotations")

    if not ground_truth:
        print("ERROR: No ground truth found. Check DENTEX directory structure.")
        sys.exit(1)

    # Load model
    print(f"\nLoading model: {args.model}")
    model, processor, device = load_model(args.model, use_gpu=not args.cpu)
    print(f"Model loaded on: {device}")

    # Select evaluation samples
    all_images = list(ground_truth.keys())
    if args.samples > 0 and args.samples < len(all_images):
        import random
        random.seed(42)
        eval_images = random.sample(all_images, args.samples)
    else:
        eval_images = all_images

    print(f"\nEvaluating on {len(eval_images)} images...")
    print("-" * 60)

    # Run evaluation
    total_tp, total_fp, total_fn = 0, 0, 0
    total_tp_loose, total_fp_loose, total_fn_loose = 0, 0, 0
    results = []
    class_stats = {}

    for i, img_path in enumerate(eval_images):
        gt_findings = ground_truth[img_path]
        start = time.time()
        pred_findings = run_inference(model, processor, img_path, device)
        elapsed = time.time() - start

        # Strict matching (label + IoU)
        tp, fp, fn = match_findings(pred_findings, gt_findings, iou_threshold=0.3, label_match=True)
        total_tp += tp
        total_fp += fp
        total_fn += fn

        # Loose matching (IoU only, ignore label)
        tp_l, fp_l, fn_l = match_findings(pred_findings, gt_findings, iou_threshold=0.3, label_match=False)
        total_tp_loose += tp_l
        total_fp_loose += fp_l
        total_fn_loose += fn_l

        # Per-class stats
        for gt in gt_findings:
            cls = normalize_label(gt["label"])
            if cls not in class_stats:
                class_stats[cls] = {"tp": 0, "fn": 0, "fp": 0, "total": 0}
            class_stats[cls]["total"] += 1

        for pred in pred_findings:
            cls = normalize_label(pred.get("label", ""))
            matched = any(
                normalize_label(gt["label"]) == cls and
                compute_iou(pred.get("bbox_norm", [0,0,0,0]), gt.get("bbox_norm", [0,0,0,0])) > 0.3
                for gt in gt_findings
            )
            if cls in class_stats:
                if matched:
                    class_stats[cls]["tp"] += 1
                else:
                    class_stats[cls]["fp"] += 1

        # Count missed GT per class
        for gt in gt_findings:
            cls = normalize_label(gt["label"])
            matched = any(
                normalize_label(pred.get("label", "")) == cls and
                compute_iou(pred.get("bbox_norm", [0,0,0,0]), gt.get("bbox_norm", [0,0,0,0])) > 0.3
                for pred in pred_findings
            )
            if not matched:
                class_stats[cls]["fn"] += 1

        results.append({
            "image": Path(img_path).name,
            "gt_count": len(gt_findings),
            "pred_count": len(pred_findings),
            "tp": tp, "fp": fp, "fn": fn,
            "latency_s": round(elapsed, 1),
        })

        # Progress
        if (i + 1) % 5 == 0 or i == 0:
            p, r, f = compute_metrics(total_tp, total_fp, total_fn)
            print(f"  [{i+1}/{len(eval_images)}] Running F1={f:.3f} P={p:.3f} R={r:.3f} | "
                  f"Last: GT={len(gt_findings)} Pred={len(pred_findings)} ({elapsed:.1f}s)")

    # Final metrics
    print("\n" + "=" * 60)
    print("FINAL RESULTS")
    print("=" * 60)

    precision, recall, f1 = compute_metrics(total_tp, total_fp, total_fn)
    precision_l, recall_l, f1_l = compute_metrics(total_tp_loose, total_fp_loose, total_fn_loose)

    print(f"\n{'Metric':<25} {'Strict (label+IoU)':<20} {'Loose (IoU only)':<20}")
    print(f"{'-'*65}")
    print(f"{'Precision':<25} {precision:<20.4f} {precision_l:<20.4f}")
    print(f"{'Recall':<25} {recall:<20.4f} {recall_l:<20.4f}")
    print(f"{'F1 Score':<25} {f1:<20.4f} {f1_l:<20.4f}")
    print(f"{'True Positives':<25} {total_tp:<20} {total_tp_loose:<20}")
    print(f"{'False Positives':<25} {total_fp:<20} {total_fp_loose:<20}")
    print(f"{'False Negatives':<25} {total_fn:<20} {total_fn_loose:<20}")

    print(f"\n{'Per-Class Breakdown:'}")
    print(f"{'Class':<25} {'TP':<6} {'FP':<6} {'FN':<6} {'Precision':<10} {'Recall':<10} {'F1':<10}")
    print(f"{'-'*73}")
    for cls, stats in sorted(class_stats.items()):
        cp = stats["tp"] / (stats["tp"] + stats["fp"]) if (stats["tp"] + stats["fp"]) > 0 else 0
        cr = stats["tp"] / (stats["tp"] + stats["fn"]) if (stats["tp"] + stats["fn"]) > 0 else 0
        cf = 2 * cp * cr / (cp + cr) if (cp + cr) > 0 else 0
        print(f"{cls:<25} {stats['tp']:<6} {stats['fp']:<6} {stats['fn']:<6} {cp:<10.3f} {cr:<10.3f} {cf:<10.3f}")

    # Summary
    avg_latency = sum(r["latency_s"] for r in results) / len(results)
    avg_pred_count = sum(r["pred_count"] for r in results) / len(results)
    diversity = len(set(normalize_label(cls) for cls in class_stats.keys()))

    print(f"\n{'Summary Statistics:'}")
    print(f"  Total images evaluated: {len(results)}")
    print(f"  Avg predictions per image: {avg_pred_count:.1f}")
    print(f"  Avg latency per image: {avg_latency:.1f}s")
    print(f"  Class diversity: {diversity} unique pathology types")
    print(f"  Overall F1 (strict): {f1:.4f}")
    print(f"  Overall F1 (loose): {f1_l:.4f}")

    # Save results
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "model": args.model,
        "samples": len(results),
        "metrics": {
            "strict": {"precision": precision, "recall": recall, "f1": f1},
            "loose": {"precision": precision_l, "recall": recall_l, "f1": f1_l},
        },
        "per_class": class_stats,
        "per_image": results,
        "avg_latency_s": avg_latency,
        "diversity": diversity,
    }
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nDetailed results saved to: {output_path}")

    # Verdict
    print(f"\n{'=' * 60}")
    if f1 >= 0.8:
        print("VERDICT: Model PASSES production threshold (F1 >= 0.8)")
        print("Action: Safe to promote to HF_PROVIDER_MODE=primary")
    elif f1 >= 0.5:
        print(f"VERDICT: Model shows improvement but needs more training (F1 = {f1:.3f})")
        print("Action: Keep in shadow mode, retrain with more data or epochs")
    else:
        print(f"VERDICT: Model underperforming (F1 = {f1:.3f})")
        print("Action: Investigate training issues, increase data diversity")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Insmile dental vision model")
    parser.add_argument("--model", default="joshuarebo/insmile-dental-vision-lora", help="HuggingFace adapter ID")
    parser.add_argument("--data-dir", default="/tmp/dentex_eval", help="DENTEX dataset directory")
    parser.add_argument("--samples", type=int, default=50, help="Number of images to evaluate (0=all)")
    parser.add_argument("--output", default="/tmp/eval_results.json", help="Output JSON path")
    parser.add_argument("--cpu", action="store_true", help="Force CPU inference")
    args = parser.parse_args()
    evaluate(args)
