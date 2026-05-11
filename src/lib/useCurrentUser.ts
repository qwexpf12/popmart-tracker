'use client';

import { useEffect, useState } from 'react';

export interface CurrentUser {
  user_id: string;
  username: string;
  display_name: string | null;
}

let cached: CurrentUser | null = null;
let inflight: Promise<CurrentUser> | null = null;

export async function fetchCurrentUser(): Promise<CurrentUser> {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch('/api/me', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error('未登录');
        const data = (await r.json()) as CurrentUser;
        cached = data;
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function clearCurrentUserCache() {
  cached = null;
}

export function useCurrentUser(): { user: CurrentUser | null; error: string | null } {
  const [user, setUser] = useState<CurrentUser | null>(cached);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetchCurrentUser()
      .then((u) => {
        if (alive) setUser(u);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : '加载用户失败');
      });
    return () => {
      alive = false;
    };
  }, []);
  return { user, error };
}
