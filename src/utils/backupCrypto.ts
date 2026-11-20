import { LocalSnapshot } from '../db/storage';
import { APP_PACKAGE_NAME } from '../types/dream';

const FORMAT_HEADER = 'HUIXU_ENCRYPTED_BACKUP_V1';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function createEncryptedBackup(
  snapshot: LocalSnapshot,
  password: string
): Promise<string> {
  if (!password.trim()) {
    throw new Error('请设置备份密码');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(password, salt);

  const payload = JSON.stringify({
    exportedAt: Date.now(),
    app: '回序梦境',
    packageName: APP_PACKAGE_NAME,
    version: '1.0',
    data: snapshot,
  });

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    new TextEncoder().encode(payload)
  );

  const envelope = {
    format: FORMAT_HEADER,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(cipherBuffer)),
  };

  return JSON.stringify(envelope, null, 2);
}

export async function decryptBackupContent(
  rawText: string,
  password: string
): Promise<LocalSnapshot> {
  let parsed: {
    format?: string;
    salt?: string;
    iv?: string;
    ciphertext?: string;
  };
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('备份文件格式无效，无法解析');
  }

  if (parsed.format !== FORMAT_HEADER || !parsed.salt || !parsed.iv || !parsed.ciphertext) {
    throw new Error('非回序梦境加密备份文件');
  }

  const salt = fromBase64(parsed.salt);
  const iv = fromBase64(parsed.iv);
  const cipherBytes = fromBase64(parsed.ciphertext);

  try {
    const key = await deriveAesKey(password, salt);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      cipherBytes.buffer as ArrayBuffer
    );
    const decoded = new TextDecoder().decode(plainBuffer);
    const inner = JSON.parse(decoded) as { data?: LocalSnapshot };
    if (!inner.data || !Array.isArray(inner.data.dreams)) {
      throw new Error('备份内容结构损坏');
    }
    return inner.data;
  } catch {
    throw new Error('备份密码错误或文件已损坏');
  }
}
