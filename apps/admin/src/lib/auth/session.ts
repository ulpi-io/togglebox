import { cookies } from 'next/headers';
import type { User } from '@/lib/api/types';

export interface Session {
  userId: string;
  email: string;
  role: 'admin' | 'developer' | 'viewer';
}

export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) return null;

    // Decode JWT (simple base64 decode for payload)
    // In production, use jose library for verification
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );

    return payload as Session;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireRole(role: string): Promise<Session> {
  const session = await requireAuth();
  if (session.role !== role && session.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return session;
}
