import crypto from 'node:crypto';

export interface EncryptedPayload {
  version: 'py_session_v1';
  algorithm: 'AES-256-GCM';
  salt: string; // hex
  iv: string; // hex
  authTag: string; // hex
  ciphertext: string; // hex
  iterations: number;
  createdAt: string;
  fingerprint: string;
}

const ITERATIONS = 100000;
const KEY_LEN = 32; // 256 bits
const DIGEST = 'sha512';

/**
 * Derives a 256-bit AES key from a passphrase/secret and a salt using PBKDF2.
 */
export function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_LEN, DIGEST);
}

/**
 * Encrypts arbitrary JavaScript/JSON object into an AES-256-GCM encrypted envelope.
 * Compatible with standard Python session decryptor script.
 */
export function encryptData(data: unknown, masterSecret: string): EncryptedPayload {
  const jsonString = JSON.stringify(data);
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
  const key = deriveKey(masterSecret, salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(jsonString, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const fingerprint = crypto
    .createHash('sha256')
    .update(encrypted)
    .digest('hex')
    .substring(0, 16);

  return {
    version: 'py_session_v1',
    algorithm: 'AES-256-GCM',
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
    iterations: ITERATIONS,
    createdAt: new Date().toISOString(),
    fingerprint,
  };
}

/**
 * Decrypts an AES-256-GCM encrypted envelope back into the original object.
 */
export function decryptData<T = any>(payload: EncryptedPayload, masterSecret: string): T {
  const salt = Buffer.from(payload.salt, 'hex');
  const iv = Buffer.from(payload.iv, 'hex');
  const authTag = Buffer.from(payload.authTag, 'hex');
  const ciphertext = Buffer.from(payload.ciphertext, 'hex');

  const key = deriveKey(masterSecret, salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as T;
}

/**
 * Hash password with unique salt for user authentication.
 */
export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 50000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const hash = crypto.pbkdf2Sync(password, salt, 50000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
}
