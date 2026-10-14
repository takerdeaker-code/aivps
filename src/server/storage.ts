import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  encryptData,
  decryptData,
  hashPassword,
  verifyPassword,
  EncryptedPayload,
} from './crypto.js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: string;
}

export interface ModelSettings {
  systemPrompt: string;
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  maxOutputTokens: number;
  contextWindowDepth: number; // number of past turns to include
  vpsLlamaEndpoint: string; // e.g. http://localhost:8080/v1 or VPS IP:8080
  inferenceMode: 'vps_llama' | 'gemini_bridge' | 'auto';
  modelIdentifier: string;
}

export interface UserSessionData {
  username: string;
  displayName: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  lastLoginAt: string;
  settings: ModelSettings;
  chatHistory: ChatMessage[];
  metadata: {
    sessionsCount: number;
    encryptionAlgorithm: 'AES-256-GCM';
    totalTokensEstimated: number;
  };
}

export const DEFAULT_SETTINGS: ModelSettings = {
  systemPrompt: `You are Gemma 4 E2B Abliterated BTX, an unfiltered, highly capable, and truthful AI assistant running on a private VPS.
You have direct conversational memory and always provide precise, helpful, safe, and technical assistance. You understand both English and Myanmar (Burmese) fluently.`,
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  repeatPenalty: 1.15,
  maxOutputTokens: 2048,
  contextWindowDepth: 12,
  vpsLlamaEndpoint: 'http://localhost:8080',
  inferenceMode: 'auto',
  modelIdentifier: 'gemma-4-E2B-abliterated-btx-Q8_0.gguf',
};

const SESSIONS_DIR = path.resolve(process.cwd(), 'data', 'sessions');
const MASTER_KEY = process.env.SESSION_MASTER_KEY || 'gemma_shield_master_key_secure_2026';

// In-memory token to username mapping
const activeTokens = new Map<string, { username: string; expiresAt: number }>();

export class StorageService {
  constructor() {
    this.ensureDirectory();
    this.seedDemoUserIfNeeded();
  }

  private ensureDirectory() {
    if (!fs.existsSync(SESSIONS_DIR)) {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }
  }

  private getSessionFilePath(username: string): string {
    const safeUsername = username.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return path.join(SESSIONS_DIR, `${safeUsername}.session.enc`);
  }

  private seedDemoUserIfNeeded() {
    const demoPath = this.getSessionFilePath('admin');
    if (!fs.existsSync(demoPath)) {
      const { salt, hash } = hashPassword('admin123');
      const initialData: UserSessionData = {
        username: 'admin',
        displayName: 'Administrator (VPS Root)',
        passwordSalt: salt,
        passwordHash: hash,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        settings: { ...DEFAULT_SETTINGS },
        chatHistory: [
          {
            id: 'init-1',
            role: 'system',
            content: 'Gemma 4 E2B Abliterated initialized in private encrypted session vault.',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'init-2',
            role: 'user',
            content: 'မင်္ဂလာပါ model ရဲ့ အခြေအနေ ဘယ်လိုရှိလဲ?',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
          },
          {
            id: 'init-3',
            role: 'model',
            content: 'မင်္ဂလာပါ! ကျွန်တော်က gemma-4-E2B-abliterated-btx-Q8_0.gguf ဖြစ်ပါတယ်။ VPS ပေါ်မှာ အဆင်သင့်ရှိနေပြီး user ရဲ့ chat history တွေကို AES-256-GCM encryption စနစ်နဲ့ session file ထဲမှာ လုံခြုံစွာ မှတ်သားထားပေးနေပါပြီ။ ဘာအကူအညီလိုအပ်ပါသလဲခင်ဗျာ?',
            timestamp: new Date(Date.now() - 1750000).toISOString(),
          },
        ],
        metadata: {
          sessionsCount: 1,
          encryptionAlgorithm: 'AES-256-GCM',
          totalTokensEstimated: 240,
        },
      };

      this.saveEncryptedSession('admin', initialData);
    }
  }

  public saveEncryptedSession(username: string, data: UserSessionData): EncryptedPayload {
    this.ensureDirectory();
    const filePath = this.getSessionFilePath(username);
    const encrypted = encryptData(data, MASTER_KEY);
    fs.writeFileSync(filePath, JSON.stringify(encrypted, null, 2), 'utf-8');
    return encrypted;
  }

  public getRawEncryptedFile(username: string): EncryptedPayload | null {
    const filePath = this.getSessionFilePath(username);
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as EncryptedPayload;
  }

  public getUserData(username: string): UserSessionData | null {
    const encrypted = this.getRawEncryptedFile(username);
    if (!encrypted) return null;
    try {
      return decryptData<UserSessionData>(encrypted, MASTER_KEY);
    } catch (err) {
      console.error('Failed to decrypt session file for', username, err);
      return null;
    }
  }

  public registerUser(username: string, password: string, displayName?: string): { success: boolean; message: string; token?: string; user?: any } {
    const safeUsername = username.trim().toLowerCase();
    if (!safeUsername || safeUsername.length < 3) {
      return { success: false, message: 'Username must be at least 3 characters long.' };
    }
    if (!password || password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    if (this.getUserData(safeUsername)) {
      return { success: false, message: 'User already exists with this username.' };
    }

    const { salt, hash } = hashPassword(password);
    const newUser: UserSessionData = {
      username: safeUsername,
      displayName: displayName?.trim() || safeUsername,
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      settings: { ...DEFAULT_SETTINGS },
      chatHistory: [],
      metadata: {
        sessionsCount: 1,
        encryptionAlgorithm: 'AES-256-GCM',
        totalTokensEstimated: 0,
      },
    };

    this.saveEncryptedSession(safeUsername, newUser);
    const token = this.createSessionToken(safeUsername);
    return {
      success: true,
      message: 'User registered and encrypted session file created successfully.',
      token,
      user: this.getSanitizedUser(newUser),
    };
  }

  public authenticate(username: string, password: string): { success: boolean; message: string; token?: string; user?: any } {
    const safeUsername = username.trim().toLowerCase();
    const user = this.getUserData(safeUsername);
    if (!user) {
      return { success: false, message: 'Account not found. Please register first.' };
    }

    const valid = verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!valid) {
      return { success: false, message: 'Invalid password. Decryption authorization rejected.' };
    }

    user.lastLoginAt = new Date().toISOString();
    user.metadata.sessionsCount += 1;
    this.saveEncryptedSession(safeUsername, user);

    const token = this.createSessionToken(safeUsername);
    return {
      success: true,
      message: 'Authentication successful. Session decrypted.',
      token,
      user: this.getSanitizedUser(user),
    };
  }

  public createSessionToken(username: string): string {
    const token = 'gemma_sec_' + crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
    activeTokens.set(token, { username, expiresAt });
    return token;
  }

  public validateToken(token: string): string | null {
    if (!token) return null;
    const session = activeTokens.get(token);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      activeTokens.delete(token);
      return null;
    }
    return session.username;
  }

  public revokeToken(token: string) {
    activeTokens.delete(token);
  }

  public updateSettings(username: string, newSettings: Partial<ModelSettings>): ModelSettings {
    const user = this.getUserData(username);
    if (!user) throw new Error('User not found');
    user.settings = { ...user.settings, ...newSettings };
    this.saveEncryptedSession(username, user);
    return user.settings;
  }

  public appendMessage(username: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const user = this.getUserData(username);
    if (!user) throw new Error('User not found');

    const fullMessage: ChatMessage = {
      id: 'msg-' + crypto.randomBytes(8).toString('hex'),
      role: message.role,
      content: message.content,
      timestamp: new Date().toISOString(),
    };

    user.chatHistory.push(fullMessage);
    user.metadata.totalTokensEstimated += Math.ceil(message.content.length / 4);
    this.saveEncryptedSession(username, user);
    return fullMessage;
  }

  public clearChatHistory(username: string): void {
    const user = this.getUserData(username);
    if (!user) throw new Error('User not found');
    user.chatHistory = [];
    this.saveEncryptedSession(username, user);
  }

  public listAllSessionFiles(): Array<{ filename: string; sizeBytes: number; updatedAt: string }> {
    this.ensureDirectory();
    const files = fs.readdirSync(SESSIONS_DIR);
    return files
      .filter((f) => f.endsWith('.session.enc'))
      .map((f) => {
        const stats = fs.statSync(path.join(SESSIONS_DIR, f));
        return {
          filename: f,
          sizeBytes: stats.size,
          updatedAt: stats.mtime.toISOString(),
        };
      });
  }

  public getSanitizedUser(user: UserSessionData) {
    const rawFile = this.getRawEncryptedFile(user.username);
    return {
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      settings: user.settings,
      chatCount: user.chatHistory.length,
      metadata: user.metadata,
      vaultInfo: {
        cipherAlgorithm: 'AES-256-GCM',
        keyDerivation: 'PBKDF2-HMAC-SHA512 (100,000 rounds)',
        sessionFile: `${user.username}.session.enc`,
        rawEncryptedBytes: rawFile ? Buffer.byteLength(JSON.stringify(rawFile)) : 0,
        fingerprint: rawFile?.fingerprint || 'N/A',
        saltHex: rawFile?.salt || '',
        ivHex: rawFile?.iv || '',
        authTagHex: rawFile?.authTag || '',
      },
    };
  }
}

export const storageService = new StorageService();
