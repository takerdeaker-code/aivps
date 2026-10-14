# Gemma VPS Shield AI 🛡️

[![Model](https://img.shields.io/badge/Model-gemma--4--E2B--abliterated--btx--Q8__0.gguf-emerald.svg)](https://huggingface.co/RAFABTX/gemma-4-E2B-abliterated-btx-GGUF/blob/main/gemma-4-E2B-abliterated-btx-Q8_0.gguf)
[![Security](https://img.shields.io/badge/Security-AES--256--GCM-cyan.svg)](#security-architecture)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](#license)
[![Bilingual](https://img.shields.io/badge/Languages-Myanmar%20%7C%20English-amber.svg)](#features)

A private, high-security Web AI interface and dashboard tailored specifically for running **[gemma-4-E2B-abliterated-btx-Q8_0.gguf](https://huggingface.co/RAFABTX/gemma-4-E2B-abliterated-btx-GGUF/blob/main/gemma-4-E2B-abliterated-btx-Q8_0.gguf)** on Linux/Ubuntu VPS servers.

All user sessions, conversation histories, and settings are encrypted at rest using **AES-256-GCM + PBKDF2 (100,000 iterations)** into Python-compatible session files (`.session.enc`) that can be read, verified, or updated directly via Python on your VPS.

---

## 🌟 Key Features

- **Gemma-4-E2B-abliterated-btx-Q8_0 Support**: Tailored for the 8-bit quantized, un-censored/abliterated Gemma 4 E2B model with deep reasoning and zero artificial refusals.
- **Python Session Storage (`.session.enc`)**:
  - Automatically saves each user account into an encrypted session file inside `data/sessions/<username>.session.enc`.
  - Compatible with standard Python `cryptography` library (`session_manager.py` included).
- **Multi-Turn Conversational Memory**:
  - Retains multi-turn conversation context using Gemma's turn tokens:
    ```text
    <start_of_turn>system
    {system_prompt}<end_of_turn>
    <start_of_turn>user
    {user_message}<end_of_turn>
    <start_of_turn>model
    ```
  - Configurable sliding memory depth (4 to 32 turns).
- **Encrypted Session Vault & Inspector Dashboard**:
  - Real-time cryptographic metrics: Salt, IV/Nonce, GCM Authentication Tag (MAC), SHA-256 Fingerprint, and raw ciphertext viewer.
  - One-click cryptographic integrity verification.
  - Downloadable `.session.enc` files for backup or offline Python processing.
- **Model Hyperparameter & System Prompt Dashboard**:
  - Live system prompt customization with presets (Abliterated, Bilingual, DevOps/Coder, Default).
  - Sliders for Temperature, Top P, Top K, Repeat Penalty, Max Output Tokens, and Memory Depth.
  - Built-in VPS Llama.cpp latency ping tester.
- **Bilingual Interface**:
  - Instant toggle between **မြန်မာ (Burmese)** and **English**.

---

## 🚀 Quick Start on VPS

### Option A: One-Click Automated Script (Ubuntu / Debian)

Clone this repository and run the setup script:

```bash
git clone https://github.com/takerdeaker-code/aivps.git
cd aivps

chmod +x deploy.sh
./deploy.sh
```

The script will:
1. Install build essentials, CMake, Python 3, Node.js, and npm.
2. Download `gemma-4-E2B-abliterated-btx-Q8_0.gguf` (~2.6 GB) directly from HuggingFace.
3. Build `llama.cpp` release binaries.
4. Install web application dependencies.

### Option B: Docker Compose

```bash
# 1. Download model into models folder
mkdir -p models
wget -c "https://huggingface.co/RAFABTX/gemma-4-E2B-abliterated-btx-GGUF/resolve/main/gemma-4-E2B-abliterated-btx-Q8_0.gguf" -O models/gemma-4-E2B-abliterated-btx-Q8_0.gguf

# 2. Start services
docker compose up -d
```

Access the web interface at `http://<your-vps-ip>:3000`.

---

## 🐍 Python Session File Interoperability

This repository includes `session_manager.py`, allowing you to inspect and modify user session files in Python:

```bash
pip install cryptography

# Run interactive test
python3 session_manager.py --demo

# Read & decrypt any user's session file
python3 session_manager.py --read admin
```

Python decryption code snippet:
```python
import json, hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

with open("data/sessions/admin.session.enc", "r") as f:
    data = json.load(f)

salt = bytes.fromhex(data['salt'])
iv = bytes.fromhex(data['iv'])
tag = bytes.fromhex(data['authTag'])
cipher = bytes.fromhex(data['ciphertext'])

# Key derivation matching PBKDF2 (100,000 rounds, SHA-512)
key = hashlib.pbkdf2_hmac('sha512', b'gemma_shield_master_key_secure_2026', salt, 100000, 32)
session = json.loads(AESGCM(key).decrypt(iv, cipher + tag, None).decode('utf-8'))

print(f"Decrypted user: {session['username']}")
print(f"Chat turns in memory: {len(session['chatHistory'])}")
```

---

## 🔐 Security Architecture

- **Cipher**: `AES-256-GCM` (Galois/Counter Mode with 128-bit MAC authentication tag).
- **Key Derivation**: `PBKDF2` with `100,000` iterations, 16-byte random salt, and `SHA-512` hash.
- **Nonce/IV**: 96-bit cryptographically secure pseudorandom number generator (CSPRNG) per session write.
- **Passwords**: Salted PBKDF2 password hashes (never stored in plaintext).

---

## 📦 How to Push to Your GitHub Account

Run these commands in your terminal to initialize and push to your GitHub repository:

```bash
# 1. Initialize git (if not already done)
git init
git branch -M main

# 2. Add files and make initial commit
git add .
git commit -m "Initial commit: Gemma 4 E2B Abliterated VPS Shield AI"

# 3. Link your remote GitHub repository
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git

# 4. Push to GitHub
git push -u origin main
```

---

## 📄 License

Apache-2.0. Model weights are subject to Google Gemma and creator distribution terms on HuggingFace.
