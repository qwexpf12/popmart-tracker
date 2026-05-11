import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_NAME, verifySession } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: '服务端未配置 AUTH_SECRET' }, { status: 500 });
  }
  const cookie = cookies().get(COOKIE_NAME)?.value;
  const userId = await verifySession(cookie, secret);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const sb = getSupabase();
  const { data, error } = await sb
    .from('app_users')
    .select('id, username, display_name')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: '账号不存在' }, { status: 401 });
  }
  return NextResponse.json({ user_id: data.id, username: data.username, display_name: data.display_name });
}
