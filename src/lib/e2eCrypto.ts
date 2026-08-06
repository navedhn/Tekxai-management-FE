// True end-to-end encryption for 1:1 DM channels — Web Crypto API only, no
// server-side crypto logic anywhere (the backend just stores/relays opaque
// base64 blobs: see PUT /user/me/public-key, GET /user/:id/public-key, and
// messages.iv/is_encrypted on the message row itself).
//
// Design constraint (deliberate, see the approved plan this implements):
// the private half of the ECDH keypair must NEVER exist as raw, exportable
// bytes in a JS-inspectable variable — not even transiently. Web Crypto's
// `generateKey` for an ECDH key PAIR applies a single `extractable` flag to
// both halves as generated (there's no way to request "extractable public,
// non-extractable private" in one call), so the pair is generated
// `extractable: true` and the private CryptoKey OBJECT is stored directly
// into IndexedDB — never passed through `exportKey`. IndexedDB's structured
// clone algorithm supports storing/retrieving native CryptoKey objects
// as opaque, non-serializable-to-JSON handles, which is what keeps this
// safe: only `crypto.subtle.exportKey` produces raw bytes, and it is never
// called on the private key anywhere in this file. Only the PUBLIC key is
// ever exported (SPKI, base64) for upload to the server.
//
// v1 is single-device only: the keypair lives in one browser's IndexedDB.
// Switching devices/browsers means old DM history is unreadable there (no
// passphrase-based key backup/export in this phase, by design).

const DB_NAME = 'tekxai_e2e_keys';
const DB_VERSION = 1;
const STORE_NAME = 'keypairs';
const KEY_RECORD_ID = 'self'; // single-user-per-browser-profile — one keypair per device

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

// Generates a fresh ECDH P-256 keypair, stores the private CryptoKey object
// (never its exported bytes) in IndexedDB, and returns the base64 SPKI
// export of the public half for upload.
export async function generateKeyPair(): Promise<{ privateKey: CryptoKey; publicKeySpkiB64: string }> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, // extractable — applies to both halves as generated; only the public key is ever actually exported below
    ['deriveKey', 'deriveBits'],
  );
  const spki = await crypto.subtle.exportKey('spki', pair.publicKey);
  const publicKeySpkiB64 = bufToB64(spki);
  return { privateKey: pair.privateKey, publicKeySpkiB64 };
}

// Opens/creates the IndexedDB keypair store, returns the existing keypair if
// present, otherwise generates and persists a new one. This is the single
// entry point chat/index.tsx's first-load effect should call.
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

// Imports a peer's base64 SPKI public key (as uploaded via PUT
// /user/me/public-key and fetched via GET /user/:id/public-key) into a
// CryptoKey usable with deriveSharedKey. Non-extractable-by-caller usage is
// irrelevant here since it's a PUBLIC key — extractable:true is harmless.
export async function importPublicKey(base64Spki: string): Promise<CryptoKey> {
  const bytes = b64ToBuf(base64Spki);
  return crypto.subtle.importKey('spki', bytes, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

// Derives the shared AES-GCM-256 key for a conversation directly via ECDH
// deriveKey (not a separate HKDF step — deriveKey's ECDH algorithm already
// performs the standard key-derivation internally per the Web Crypto spec).
// The resulting AES key is itself non-extractable — it never leaves this
// CryptoKey handle as raw bytes either.
export async function deriveSharedKey(privateKey: CryptoKey, peerPublicKey: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt'],
  );
}

// Encrypts plaintext with a fresh random 12-byte IV (AES-GCM's recommended
// nonce size). Returns both as base64 for transport/storage on the message
// row (content = ciphertextB64, iv = ivB64).
export async function encryptMessage(aesKey: CryptoKey, plaintext: string): Promise<{ ciphertextB64: string; ivB64: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded);
  return { ciphertextB64: bufToB64(ciphertext), ivB64: bufToB64(iv.buffer) };
}

// Reverses encryptMessage. Returns null (never throws to the caller) on any
// failure — wrong/missing key, corrupt ciphertext, tampered data (AES-GCM's
// auth tag fails to verify) — so the render path can show a clear "unable
// to decrypt" placeholder instead of crashing or showing garbage.
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
