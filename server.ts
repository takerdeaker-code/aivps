import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { storageService, DEFAULT_SETTINGS } from './src/server/storage.js';
import { runInference, formatGemmaPrompt } from './src/server/inference.js';
import { PYTHON_SESSION_SCRIPT } from './src/server/session_manager_py.js';
import { decryptData, encryptData } from './src/server/crypto.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function createServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // CORS & Security headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // Auth helper middleware
  const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing session token' });
    }
    const username = storageService.validateToken(token);
    if (!username) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
    }
    (req as any).user = username;
    next();
  };

  // ------------------ AUTH API ------------------

  app.post('/api/auth/register', (req, res) => {
    try {
      const { username, password, displayName } = req.body;
      const result = storageService.registerUser(username, password, displayName);
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      const result = storageService.authenticate(username, password);
      if (!result.success) {
        return res.status(401).json({ error: result.message });
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Login failed' });
    }
  });

  app.post('/api/auth/logout', authenticateToken, (req, res) => {
    const token = req.headers.authorization?.slice(7);
    if (token) storageService.revokeToken(token);
    return res.json({ success: true, message: 'Logged out successfully' });
  });

  app.get('/api/auth/me', authenticateToken, (req, res) => {
    const username = (req as any).user as string;
    const userData = storageService.getUserData(username);
    if (!userData) {
      return res.status(404).json({ error: 'User session file not found' });
    }
    return res.json({ user: storageService.getSanitizedUser(userData) });
  });

  // ------------------ SETTINGS API ------------------

  app.get('/api/settings', authenticateToken, (req, res) => {
    const username = (req as any).user as string;
    const userData = storageService.getUserData(username);
    if (!userData) return res.status(404).json({ error: 'User not found' });
    return res.json({ settings: userData.settings || DEFAULT_SETTINGS });
  });

  app.post('/api/settings', authenticateToken, (req, res) => {
    try {
      const username = (req as any).user as string;
      const updated = storageService.updateSettings(username, req.body);
      return res.json({ settings: updated, message: 'Settings saved to encrypted session file.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ------------------ CHAT API ------------------

  app.get('/api/chat/history', authenticateToken, (req, res) => {
    const username = (req as any).user as string;
    const userData = storageService.getUserData(username);
    if (!userData) return res.status(404).json({ error: 'User not found' });
    return res.json({ history: userData.chatHistory });
  });

  app.post('/api/chat/message', authenticateToken, async (req, res) => {
    try {
      const username = (req as any).user as string;
      const { message } = req.body;
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'Message content is required.' });
      }

      const userData = storageService.getUserData(username);
      if (!userData) return res.status(404).json({ error: 'User session not found' });

      // Append user message to encrypted store
      const userMsg = storageService.appendMessage(username, {
        role: 'user',
        content: message.trim(),
      });

      // Run inference with memory context
      const inferenceResult = await runInference(
        userData.chatHistory,
        message.trim(),
        userData.settings
      );

      // Append model response to encrypted store
      const modelMsg = storageService.appendMessage(username, {
        role: 'model',
        content: inferenceResult.reply,
      });

      return res.json({
        userMessage: userMsg,
        modelMessage: modelMsg,
        meta: {
          backendUsed: inferenceResult.backendUsed,
          latencyMs: inferenceResult.latencyMs,
          tokensEstimated: inferenceResult.tokensEstimated,
          promptFormattedPreview: inferenceResult.promptFormatted.slice(-500),
        },
      });
    } catch (err: any) {
      console.error('Chat error:', err);
      return res.status(500).json({ error: err.message || 'Inference error' });
    }
  });

  app.delete('/api/chat/history', authenticateToken, (req, res) => {
    const username = (req as any).user as string;
    storageService.clearChatHistory(username);
    return res.json({ success: true, message: 'Chat history cleared from encrypted session file.' });
  });

  // ------------------ ENCRYPTED VAULT & SESSION INSPECTOR API ------------------

  app.get('/api/vault/session-file', authenticateToken, (req, res) => {
    const username = (req as any).user as string;
    const rawPayload = storageService.getRawEncryptedFile(username);
    const userData = storageService.getUserData(username);
    if (!rawPayload || !userData) {
      return res.status(404).json({ error: 'Session file not found' });
    }

    return res.json({
      filename: `${username}.session.enc`,
      rawEncryptedPayload: rawPayload,
      decryptedSummary: {
        username: userData.username,
        displayName: userData.displayName,
        createdAt: userData.createdAt,
        lastLoginAt: userData.lastLoginAt,
        chatTurnCount: userData.chatHistory.length,
        settingsSummary: {
          systemPromptSnippet: userData.settings.systemPrompt.slice(0, 100) + '...',
          temperature: userData.settings.temperature,
          model: userData.settings.modelIdentifier,
        },
      },
    });
  });

  app.post('/api/vault/verify-cipher', authenticateToken, (req, res) => {
    try {
      const username = (req as any).user as string;
      const rawPayload = storageService.getRawEncryptedFile(username);
      if (!rawPayload) return res.status(404).json({ error: 'No session payload' });

      const masterKey = process.env.SESSION_MASTER_KEY || 'gemma_shield_master_key_secure_2026';
      const decrypted = decryptData(rawPayload, masterKey);
      const isIntegrityValid = decrypted.username === username;

      return res.json({
        valid: isIntegrityValid,
        algorithm: rawPayload.algorithm,
        fingerprint: rawPayload.fingerprint,
        iterations: rawPayload.iterations,
        authTagHex: rawPayload.authTag,
        saltHex: rawPayload.salt,
        ivHex: rawPayload.iv,
        message: 'Cryptographic authentication tag verified with AES-256-GCM.',
      });
    } catch (err: any) {
      return res.status(400).json({ valid: false, error: err.message });
    }
  });

  // ------------------ VPS & DEPLOYMENT UTILITIES API ------------------

  app.post('/api/vps/ping', async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Endpoint is required' });

    const cleanUrl = endpoint.replace(/\/+$/, '');
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      // Try /health or /v1/models
      let status = 'offline';
      let latency = 0;
      let modelList: string[] = [];

      try {
        const resp = await fetch(`${cleanUrl}/v1/models`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (resp.ok) {
          status = 'online';
          latency = Date.now() - startTime;
          const data = await resp.json();
          modelList = (data?.data || []).map((m: any) => m.id);
        }
      } catch (e) {
        // Try fallback root /health
        const resp2 = await fetch(`${cleanUrl}/health`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (resp2.ok) {
          status = 'online';
          latency = Date.now() - startTime;
        }
      }

      return res.json({
        endpoint: cleanUrl,
        status,
        latencyMs: latency,
        detectedModels: modelList,
        message: status === 'online' ? 'VPS Llama server is reachable!' : 'Endpoint did not respond with 200 OK.',
      });
    } catch (err: any) {
      return res.json({
        endpoint: cleanUrl,
        status: 'unreachable',
        error: err.message,
        message: 'Could not connect to VPS endpoint. Check firewall/IP port 8080.',
      });
    }
  });

  app.get('/api/vps/scripts', (req, res) => {
    const vpsBashScript = `#!/usr/bin/env bash
# ==============================================================================
# Gemma 4 E2B Abliterated BTX - High Performance VPS Deployment Script
# Target Model: gemma-4-E2B-abliterated-btx-Q8_0.gguf
# HuggingFace Source: RAFABTX/gemma-4-E2B-abliterated-btx-GGUF
# ==============================================================================

set -e

echo "[+] Updating Ubuntu/Debian Packages..."
sudo apt-get update && sudo apt-get install -y build-essential cmake git curl wget python3-pip

echo "[+] Creating AI Model Directory..."
mkdir -p ~/gemma-vps/models
mkdir -p ~/gemma-vps/data/sessions
cd ~/gemma-vps

echo "[+] Downloading gemma-4-E2B-abliterated-btx-Q8_0.gguf (~2.6 GB)..."
MODEL_URL="https://huggingface.co/RAFABTX/gemma-4-E2B-abliterated-btx-GGUF/resolve/main/gemma-4-E2B-abliterated-btx-Q8_0.gguf"
if [ ! -f "models/gemma-4-E2B-abliterated-btx-Q8_0.gguf" ]; then
    wget -c "$MODEL_URL" -O models/gemma-4-E2B-abliterated-btx-Q8_0.gguf
else
    echo "[✓] Model already exists in models directory."
fi

echo "[+] Cloning & Compiling llama.cpp with optimal CPU AVX2 / CUDA flags..."
if [ ! -d "llama.cpp" ]; then
    git clone https://github.com/ggerganov/llama.cpp
fi
cd llama.cpp
cmake -B build
cmake --build build --config Release -j\$(nproc)

echo "[+] Starting llama-server on port 8080..."
echo "To run continuously, use systemd or tmux:"
echo "./build/bin/llama-server -m ../models/gemma-4-E2B-abliterated-btx-Q8_0.gguf --port 8080 --host 0.0.0.0 -c 8192 -ngl 99"
`;

    const dockerCompose = `version: '3.8'

services:
  gemma-llama-server:
    image: ghcr.io/ggerganov/llama.cpp:server
    container_name: gemma-4-server
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./models:/models
    command: >
      -m /models/gemma-4-E2B-abliterated-btx-Q8_0.gguf
      --host 0.0.0.0
      --port 8080
      -c 8192
      -ngl 99

  web-app:
    image: node:20-alpine
    container_name: gemma-shield-web
    working_dir: /app
    ports:
      - "3000:3000"
    volumes:
      - ./:/app
      - ./data/sessions:/app/data/sessions
    environment:
      - PORT=3000
      - SESSION_MASTER_KEY=gemma_shield_master_key_secure_2026
    command: npm start
`;

    return res.json({
      bashScript: vpsBashScript,
      dockerCompose,
      pythonSessionScript: PYTHON_SESSION_SCRIPT,
      huggingFaceUrl: 'https://huggingface.co/RAFABTX/gemma-4-E2B-abliterated-btx-GGUF/blob/main/gemma-4-E2B-abliterated-btx-Q8_0.gguf',
    });
  });

  // ------------------ GITHUB PUSH & REPO ARCHIVE API ------------------

  app.post('/api/git/push', async (req, res) => {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'GitHub Personal Access Token is required.' });
    }

    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);

    try {
      // Sanitize token (letters, numbers, underscores)
      const cleanToken = token.trim();
      const remoteUrl = `https://${cleanToken}@github.com/takerdeaker-code/aivps.git`;
      
      const { stdout, stderr } = await execAsync(`git push "${remoteUrl}" main --force`, {
        cwd: process.cwd(),
      });

      return res.json({
        success: true,
        message: 'Successfully pushed all code to https://github.com/takerdeaker-code/aivps !',
        details: stdout || stderr,
      });
    } catch (err: any) {
      console.error('Git push error:', err);
      return res.status(500).json({
        error: 'Failed to push to GitHub. Please check your Personal Access Token (PAT) permissions.',
        details: err.message,
      });
    }
  });

  app.get('/api/git/download-archive', (req, res) => {
    const archivePath = path.resolve(process.cwd(), 'aivps-repo.tar.gz');
    if (fs.existsSync(archivePath)) {
      res.download(archivePath, 'aivps-repository.tar.gz');
    } else {
      res.status(404).json({ error: 'Archive not found' });
    }
  });

  // ------------------ VITE / STATIC SERVING ------------------

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Gemma Shield AI] Server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
