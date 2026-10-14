export type Language = 'my' | 'en';

export interface UserProfile {
  username: string;
  displayName: string;
  createdAt: string;
  lastLoginAt: string;
  settings: ModelSettings;
  chatCount: number;
  metadata: {
    sessionsCount: number;
    encryptionAlgorithm: 'AES-256-GCM';
    totalTokensEstimated: number;
  };
  vaultInfo: {
    cipherAlgorithm: string;
    keyDerivation: string;
    sessionFile: string;
    rawEncryptedBytes: number;
    fingerprint: string;
    saltHex: string;
    ivHex: string;
    authTagHex: string;
  };
}

export interface ModelSettings {
  systemPrompt: string;
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  maxOutputTokens: number;
  contextWindowDepth: number;
  vpsLlamaEndpoint: string;
  inferenceMode: 'vps_llama' | 'gemini_bridge' | 'auto';
  modelIdentifier: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: string;
}

export interface RawEncryptedPayload {
  version: string;
  algorithm: string;
  salt: string;
  iv: string;
  authTag: string;
  ciphertext: string;
  iterations: number;
  createdAt: string;
  fingerprint: string;
}
