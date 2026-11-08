/**
 * `crypto.randomUUID` is restricted to secure contexts, and this app is meant
 * to be self-hosted — a plain `http://192.168.x.x:8082` is not one, so there
 * the method is simply absent and every call site throws.
 *
 * `crypto.getRandomValues` carries no such restriction, so the v4 layout is
 * assembled by hand when the shortcut is missing. Ids only have to be unique
 * within one browser's IndexedDB, but they are built from real random bytes
 * anyway — the correct version costs the same as a `Math.random` one.
 */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 1
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
