#!/usr/bin/env python3
"""
Gemma VPS Shield AI - Python Session Manager
Target Model: gemma-4-E2B-abliterated-btx-Q8_0.gguf
HuggingFace Source: RAFABTX/gemma-4-E2B-abliterated-btx-GGUF

This script provides 100% interoperability with the Node.js / Express backend session files.
It reads, decrypts, and updates AES-256-GCM encrypted session files stored in data/sessions/.
Requirements: pip install cryptography
"""

import os
import sys
import json
import hashlib
from datetime import datetime
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

SESSIONS_DIR = os.getenv("SESSIONS_DIR", "./data/sessions")
DEFAULT_SECRET = os.getenv("SESSION_MASTER_KEY", "gemma_shield_master_key_secure_2026")

def derive_key(secret: str, salt: bytes) -> bytes:
    """Derive 256-bit key matching PBKDF2 Node.js implementation (100,000 iterations, SHA-512)"""
    return hashlib.pbkdf2_hmac(
        hash_name='sha512',
        password=secret.encode('utf-8'),
        salt=salt,
        iterations=100000,
        dklen=32
    )

def load_session(username: str, secret: str = DEFAULT_SECRET) -> dict:
    """Load and decrypt a user session file (.session.enc)"""
    safe_name = username.lower().replace('/', '_')
    filename = os.path.join(SESSIONS_DIR, f"{safe_name}.session.enc")
    if not os.path.exists(filename):
        raise FileNotFoundError(f"Session file not found: {filename}")

    with open(filename, 'r', encoding='utf-8') as f:
        payload = json.load(f)

    salt = bytes.fromhex(payload['salt'])
    iv = bytes.fromhex(payload['iv'])
    auth_tag = bytes.fromhex(payload['authTag'])
    ciphertext = bytes.fromhex(payload['ciphertext'])

    key = derive_key(secret, salt)
    aesgcm = AESGCM(key)
    # In python cryptography library, the 16-byte tag is concatenated to the ciphertext
    decrypted_bytes = aesgcm.decrypt(iv, ciphertext + auth_tag, None)
    return json.loads(decrypted_bytes.decode('utf-8'))

def save_session(username: str, data: dict, secret: str = DEFAULT_SECRET) -> str:
    """Encrypt and save user session data to disk with AES-256-GCM"""
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    safe_name = username.lower().replace('/', '_')
    filename = os.path.join(SESSIONS_DIR, f"{safe_name}.session.enc")

    salt = os.urandom(16)
    iv = os.urandom(12)
    key = derive_key(secret, salt)

    raw_json = json.dumps(data, ensure_ascii=False).encode('utf-8')
    aesgcm = AESGCM(key)
    encrypted = aesgcm.encrypt(iv, raw_json, None)
    ciphertext = encrypted[:-16]
    auth_tag = encrypted[-16:]

    fingerprint = hashlib.sha256(ciphertext).hexdigest()[:16]

    payload = {
        "version": "py_session_v1",
        "algorithm": "AES-256-GCM",
        "salt": salt.hex(),
        "iv": iv.hex(),
        "authTag": auth_tag.hex(),
        "ciphertext": ciphertext.hex(),
        "iterations": 100000,
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "fingerprint": fingerprint
    }

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2)

    return filename

if __name__ == "__main__":
    print("[*] Gemma VPS Shield AI - Python Session Manager Utility")
    if len(sys.argv) > 1 and sys.argv[1] == "--demo":
        sample = {
            "username": "demo_vps_user",
            "displayName": "Demo VPS Operator",
            "chatHistory": [
                {"role": "user", "content": "Hello Gemma!"},
                {"role": "model", "content": "Hello! I am gemma-4-E2B-abliterated-btx ready on your VPS."}
            ],
            "settings": {"temperature": 0.7, "maxOutputTokens": 2048}
        }
        path = save_session("demo_vps_user", sample)
        print(f"[+] Successfully encrypted & saved session: {path}")
        recovered = load_session("demo_vps_user")
        print(f"[+] Successfully decrypted! Chat history count: {len(recovered['chatHistory'])}")
    elif len(sys.argv) > 2 and sys.argv[1] == "--read":
        username = sys.argv[2]
        try:
            data = load_session(username)
            print(f"[+] Decrypted session for {username}:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        except Exception as e:
            print(f"[-] Error: {e}")
    else:
        print("Usage:")
        print("  python session_manager.py --demo")
        print("  python session_manager.py --read <username>")
