#!/usr/bin/env bash
# ==============================================================================
# Gemma 4 E2B Abliterated BTX - High Performance VPS Deployment Script
# Target Model: gemma-4-E2B-abliterated-btx-Q8_0.gguf
# Hugging Face: https://huggingface.co/RAFABTX/gemma-4-E2B-abliterated-btx-GGUF
# ==============================================================================

set -e

echo "=========================================================="
echo "  Deploying Gemma 4 E2B Abliterated BTX on Linux VPS      "
echo "=========================================================="

# 1. Update and install dependencies
echo "[+] Step 1: Installing system build tools & dependencies..."
sudo apt-get update && sudo apt-get install -y \
    build-essential \
    cmake \
    git \
    curl \
    wget \
    python3 \
    python3-pip \
    nodejs \
    npm

pip3 install cryptography requests

# 2. Setup directory structure
echo "[+] Step 2: Preparing directory structure..."
mkdir -p models
mkdir -p data/sessions

# 3. Download Model directly from HuggingFace
MODEL_PATH="models/gemma-4-E2B-abliterated-btx-Q8_0.gguf"
MODEL_URL="https://huggingface.co/RAFABTX/gemma-4-E2B-abliterated-btx-GGUF/resolve/main/gemma-4-E2B-abliterated-btx-Q8_0.gguf"

if [ ! -f "$MODEL_PATH" ]; then
    echo "[+] Step 3: Downloading gemma-4-E2B-abliterated-btx-Q8_0.gguf (~2.6 GB)..."
    wget -c "$MODEL_URL" -O "$MODEL_PATH"
else
    echo "[✓] Step 3: Model file already present in $MODEL_PATH."
fi

# 4. Clone and compile llama.cpp
echo "[+] Step 4: Building llama.cpp with Release optimizations..."
if [ ! -d "llama.cpp" ]; then
    git clone https://github.com/ggerganov/llama.cpp
fi
cd llama.cpp
cmake -B build
cmake --build build --config Release -j$(nproc)
cd ..

# 5. Install Node.js app dependencies
echo "[+] Step 5: Installing Web Application dependencies..."
npm install

echo "=========================================================="
echo "  Setup Complete!                                         "
echo "=========================================================="
echo ""
echo "To run the llama-server in the background (Port 8080):"
echo "  ./llama.cpp/build/bin/llama-server -m models/gemma-4-E2B-abliterated-btx-Q8_0.gguf --host 0.0.0.0 --port 8080 -c 8192 -ngl 99 &"
echo ""
echo "To run the Shield Web App (Port 3000):"
echo "  npm start"
echo ""
echo "Access the app in your browser: http://<your-vps-ip>:3000"
