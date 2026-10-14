/**
 * Companion Python script template provided to the user for running on VPS.
 * This Python script reads, decrypts, verifies, and manages the exact session files
 * created by this application on the VPS.
 */

export const PYTHON_SESSION_SCRIPT = `#!/usr/bin/env python3
"""
Python Session Manager for Gemma VPS Shield AI
Model: gemma-4-E2B-abliterated-btx-Q8_0.gguf
Compatibility: Python 3.8+ (requires 'cryptography')
Usage: pip install cryptography requests
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
    """Derive 256-bit key matching PBKDF2 Node.js implementation"""
    return hashlib.pbkdf2_hmac(
        hash_name='sha512',
        password=secret.encode('utf-8'),
        salt=salt,
        iterations=100000,
        dklen=32
    )

def load_session(username: str, secret: str = DEFAULT_SECRET) -> dict:
    """Load and decrypt a user session file"""
    filename = os.path.join(SESSIONS_DIR, f"{username}.session.enc")
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
    # In cryptography library, tag is appended to ciphertext
    decrypted_bytes = aesgcm.decrypt(iv, ciphertext + auth_tag, None)
    return json.loads(decrypted_bytes.decode('utf-8'))

def save_session(username: str, data: dict, secret: str = DEFAULT_SECRET) -> str:
    """Encrypt and save user session data to disk"""
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    filename = os.path.join(SESSIONS_DIR, f"{username}.session.enc")

    salt = os.urandom(16)
    iv = os.urandom(12)
    key = derive_key(secret, salt)

    raw_json = json.dumps(data, ensure_ascii=False).encode('utf-8')
    aesgcm = AESGCM(key)
    # aesgcm.encrypt returns ciphertext + 16-byte tag
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
    print("[*] Python Gemma Session File Utility")
    if len(sys.argv) > 1 and sys.argv[1] == "--demo":
        sample = {
            "username": "demo_vps_user",
            "chat_history": [
                {"role": "user", "content": "Hello Gemma!"},
                {"role": "model", "content": "Hello! I am gemma-4-E2B-abliterated-btx ready on your VPS."}
            ],
            "settings": {"temperature": 0.7, "max_tokens": 1024}
        }
        path = save_session("demo_vps_user", sample)
        print(f"[+] Saved encrypted session to {path}")
        recovered = load_session("demo_vps_user")
        print(f"[+] Successfully decrypted! Chat turns: {len(recovered['chat_history'])}")
    else:
        print("Usage: python session_manager.py --demo")
`;
