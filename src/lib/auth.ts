export const COOKIE_NAME = 'pp_session';

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassword(username: string, password: string): Promise<string> {
  return sha256Hex(`${username}:${password}`);
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function signSession(userId: string, secret: string): Promise<string> {
  return `${userId}.${await hmac(userId, secret)}`;
}

export async function verifySession(cookieValue: string | undefined, secret: string): Promise<string | null> {
  if (!cookieValue) return null;
  const dot = cookieValue.indexOf('.');
  if (dot <= 0) return null;
  const userId = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const expected = await hmac(userId, secret);
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? userId : null;
}
