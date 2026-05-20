/**
 * Secure session secret store.
 *
 * Replaces the old approach of writing the wallet password to
 * `sessionStorage` in plaintext (any storage dump, devtools inspection,
 * accidental log, or non-code-exec exfiltration leaked it directly).
 *
 * How it works now:
 *  - A 256-bit AES-GCM key is generated once and persisted in IndexedDB as a
 *    NON-EXTRACTABLE `CryptoKey`. WebCrypto never exposes its raw bytes to
 *    JS, even when the object is read back from IndexedDB.
 *  - The session secret (the wallet password) is AES-GCM encrypted under that
 *    key; only the ciphertext+iv live in `sessionStorage`. This preserves the
 *    exact lifetime semantics we want (survives a reload, gone when the
 *    webview/tab is torn down) while a storage dump now yields only ciphertext.
 *
 * Honest limits: this is defense-in-depth, NOT a hardware boundary. An
 * attacker with script execution inside the page can still call
 * `subtle.decrypt` with the same key. The real fix on iOS is to hold this
 * secret in the Secure Enclave / Keychain behind biometrics — see
 * `isHardwareBacked()` and the native seam below. We fail closed: if WebCrypto
 * is unavailable we store nothing and the user simply re-enters the password.
 */

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'JustinSecureSession';
const STORE = 'keys';
const WRAP_KEY_ID = 'wrap';
const CIPHERTEXT_KEY = 'wallet_session_enc';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE);
                }
            },
        });
    }
    return dbPromise;
}

function subtle(): SubtleCrypto | null {
    const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
    return c && c.subtle ? c.subtle : null;
}

/** Get the persisted non-extractable wrap key, creating it on first use. */
async function getWrapKey(): Promise<CryptoKey | null> {
    const s = subtle();
    if (!s) return null;
    try {
        const db = await getDB();
        const existing = (await db.get(STORE, WRAP_KEY_ID)) as CryptoKey | undefined;
        if (existing) return existing;

        const key = await s.generateKey(
            { name: 'AES-GCM', length: 256 },
            false, // extractable = false: raw bytes never leave WebCrypto
            ['encrypt', 'decrypt']
        );
        await db.put(STORE, key, WRAP_KEY_ID);
        return key;
    } catch {
        return null;
    }
}

function toB64(data: ArrayBuffer | Uint8Array): string {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
}

function fromB64(b64: string): ArrayBuffer {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
}

/**
 * Encrypt and stash the session secret. Best-effort: if WebCrypto is
 * unavailable nothing is stored (the user re-enters their password on
 * reload) — we never fall back to storing plaintext.
 */
export async function setSessionSecret(secret: string): Promise<void> {
    const s = subtle();
    const key = await getWrapKey();
    if (!s || !key) return;
    try {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = await s.encrypt(
            { name: 'AES-GCM', iv },
            key,
            new TextEncoder().encode(secret)
        );
        sessionStorage.setItem(
            CIPHERTEXT_KEY,
            JSON.stringify({ iv: toB64(iv), ct: toB64(ct) })
        );
    } catch {
        // Leave nothing rather than risk a plaintext fallback.
        sessionStorage.removeItem(CIPHERTEXT_KEY);
    }
}

/** Decrypt and return the session secret, or null if absent/undecryptable. */
export async function getSessionSecret(): Promise<string | null> {
    const s = subtle();
    if (!s) return null;
    const raw = sessionStorage.getItem(CIPHERTEXT_KEY);
    if (!raw) return null;
    try {
        const { iv, ct } = JSON.parse(raw) as { iv: string; ct: string };
        const key = await getWrapKey();
        if (!key) return null;
        const pt = await s.decrypt(
            { name: 'AES-GCM', iv: fromB64(iv) },
            key,
            fromB64(ct)
        );
        return new TextDecoder().decode(pt);
    } catch {
        return null;
    }
}

/** Wipe the stored session secret (logout / failed unlock). */
export function clearSessionSecret(): void {
    try {
        sessionStorage.removeItem(CIPHERTEXT_KEY);
    } catch {
        /* sessionStorage may be unavailable; nothing to clear */
    }
}

/**
 * Whether the session secret is held behind a hardware boundary (Secure
 * Enclave / Keychain + biometrics). Currently always false: the software
 * path above is the only implementation. This is the seam the native iOS
 * implementation plugs into — gate native Keychain storage on
 * `Capacitor.isNativePlatform()` and flip this to true there.
 */
export function isHardwareBacked(): boolean {
    return false;
}
