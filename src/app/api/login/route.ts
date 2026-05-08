import { NextResponse } from 'next/server';
import { COOKIE_NAME, tokenFor } from '@/lib/auth';

export async function POST(req: Request) {
  const u = process.env.AUTH_USERNAME;
  const p = process.env.AUTH_PASSWORD;
  const s = process.env.AUTH_SECRET;
  if (!u || !p || !s) {
    return NextResponse.json({ error: '服务端未配置 AUTH 环境变量' }, { status: 500 });
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体不合法' }, { status: 400 });
  }

  const inputUser = (body.username || '').trim();
  const inputPwd = body.password || '';
  if (inputUser !== u || inputPwd !== p) {
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  const token = await tokenFor(u, p, s);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
  return res;
}
