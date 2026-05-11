import { NextResponse } from 'next/server';
import { COOKIE_NAME, hashPassword, signSession } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: Request) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: '服务端未配置 AUTH_SECRET 环境变量' }, { status: 500 });
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体不合法' }, { status: 400 });
  }

  const username = (body.username || '').trim();
  const password = body.password || '';
  if (!username || !password) {
    return NextResponse.json({ error: '请输入账号和密码' }, { status: 400 });
  }

  const sb = getSupabase();
  const { data: user, error } = await sb
    .from('app_users')
    .select('id, username, password_hash')
    .eq('username', username)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: '登录服务异常，请稍后再试' }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  const expectedHash = await hashPassword(username, password);
  if (expectedHash !== user.password_hash) {
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  const cookieValue = await signSession(user.id, secret);
  const res = NextResponse.json({ ok: true, user_id: user.id });
  res.cookies.set({
    name: COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
  return res;
}
