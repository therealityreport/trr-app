// @ts-nocheck - Test files use different module resolution
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock cookies and redirects
vi.mock('next/navigation', () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'cookie' }) }),
}));

// Mocks for Admin SDK used by layouts
interface MockDocData {
  [key: string]: unknown;
}

const makeDoc = (exists: boolean, data?: MockDocData) => ({ 
  get: async () => ({ exists, data: () => data }) 
});
const collection = (docData: MockDocData) => ({ 
  doc: () => makeDoc(!!docData, docData) 
});

describe('SSR guards', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('redirects to /auth/finish when profile incomplete', async () => {
    vi.doMock('@/lib/firebaseAdmin', () => ({
      adminAuth: { verifySessionCookie: vi.fn().mockResolvedValue({ uid: 'u1' }) },
      adminDb: { collection: vi.fn(() => collection({ username: 'abc', shows: ['A'], birthday: '' })) },
    }));
    const hub = await import('@/app/hub/layout');
    await expect(hub.default({ children: 'x' } as any)).rejects.toThrow(/REDIRECT:\/auth\/finish/);
  });

  it('allows render when complete', async () => {
    vi.doMock('@/lib/firebaseAdmin', () => ({
      adminAuth: { verifySessionCookie: vi.fn().mockResolvedValue({ uid: 'u1' }) },
      adminDb: { collection: vi.fn(() => collection({ username: 'abc', shows: ['A','B','C'], birthday: '2000-01-01' })) },
    }));
    const hub = await import('@/app/hub/layout');
    const out = await hub.default({ children: 'ok' } as any);
    expect(out).toBe('ok');
  });
});

