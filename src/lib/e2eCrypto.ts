const DB_NAME = 'tekxai_e2e_keys';
const DB_VERSION = 1;
const STORE_NAME = 'keypairs';
const KEY_RECORD_ID = 'self';

interface StoredKeyPair {
  id: string;
  privateKey: CryptoKey;
  publicKeySpkiB64: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(db: IDBDatabase, id: string): Promise<StoredKeyPair | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result as StoredKeyPair | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(db: IDBDatabase, record: StoredKeyPair): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function bufToB64(buf: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function generateKeyPair(): Promise<{ privateKey: CryptoKey; publicKeySpkiB64: string }> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits'],
  );
  const spki = await crypto.subtle.exportKey('spki', pair.publicKey);
  const publicKeySpkiB64 = bufToB64(spki);
  return { privateKey: pair.privateKey, publicKeySpkiB64 };
}

export async function getOrCreateKeyPair(): Promise<{ privateKey: CryptoKey; publicKeySpkiB64: string; isNew: boolean }> {
  const db = await openDb();
  const existing = await idbGet(db, KEY_RECORD_ID);
  if (existing) {
    return { privateKey: existing.privateKey, publicKeySpkiB64: existing.publicKeySpkiB64, isNew: false };
  }
  const generated = await generateKeyPair();
  await idbPut(db, { id: KEY_RECORD_ID, privateKey: generated.privateKey, publicKeySpkiB64: generated.publicKeySpkiB64 });
  return { ...generated, isNew: true };
}

export async function importPublicKey(base64Spki: string): Promise<CryptoKey> {
  const bytes = b64ToBuf(base64Spki);
  return crypto.subtle.importKey('spki', bytes, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

export async function deriveSharedKey(privateKey: CryptoKey, peerPublicKey: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptMessage(aesKey: CryptoKey, plaintext: string): Promise<{ ciphertextB64: string; ivB64: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded);
  return { ciphertextB64: bufToB64(ciphertext), ivB64: bufToB64(iv.buffer) };
}

export async function decryptMessage(aesKey: CryptoKey, ciphertextB64: string, ivB64: string): Promise<string | null> {
  try {
    const iv = new Uint8Array(b64ToBuf(ivB64));
    const ciphertext = b64ToBuf(ciphertextB64);
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, ciphertext);
    return new TextDecoder().decode(plainBuf);
  } catch {
    return null;
  }
}
