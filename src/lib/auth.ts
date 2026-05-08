export const COOKIE_NAME = 'pp_session';

export async function tokenFor(username: string, password: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(`${username}:${password}:${secret}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function expectedToken(): Promise<string | null> {
  const u = process.env.AUTH_USERNAME;
  const p = process.env.AUTH_PASSWORD;
  const s = process.env.AUTH_SECRET;
  if (!u || !p || !s) return null;
  return tokenFor(u, p, s);
}
