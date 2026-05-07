#!/bin/bash
exec > /tmp/training.log 2>&1

# Fix locale for TRL model card generation
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export PYTHONIOENCODING=utf-8

echo "=== Insmile AI Training Starting ==="
echo "Date: $(date)"
echo "Instance: $(curl -s http://169.254.169.254/latest/meta-data/instance-type)"

# Wait for GPU driver to be ready
echo "Waiting for NVIDIA driver..."
for i in $(seq 1 30); do
    nvidia-smi && break
    echo "  Attempt $i - waiting..."
    sleep 10
done

nvidia-smi

# Install Python packages
echo "=== Installing packages ==="
pip install -q torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
pip install -q transformers accelerate bitsandbytes peft trl datasets
pip install -q qwen-vl-utils huggingface_hub scipy kaggle "pillow<11"

echo "=== Downloading training script ==="
aws s3 cp s3://insmile-ai-training-585008043505/code/sagemaker_train.py /tmp/train.py

# Set env vars
export HF_TOKEN="${HF_TOKEN}"
export KAGGLE_API_TOKEN="${KAGGLE_API_TOKEN}"
export PYTORCH_CUDA_ALLOC_CONF="expandable_segments:True"

echo "=== Starting training ==="
cd /tmp
python3 train.py
TRAIN_EXIT=$?

echo "=== Training exit code: $TRAIN_EXIT ==="
echo "Date: $(date)"

# Upload log to S3 regardless of outcome
aws s3 cp /tmp/training.log s3://insmile-ai-training-585008043505/output/training.log

if [ $TRAIN_EXIT -eq 0 ]; then
    echo "SUCCESS — shutting down"
else
    echo "FAILED — log uploaded to S3, shutting down"
fi

# Self-terminate
shutdown -h now
