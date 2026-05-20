// @ts-nocheck - Test files use different module resolution
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureExpectedConsoleLog } from './helpers/expected-console';

// Mock cookies and redirects
vi.mock('next/navigation', () => ({
  redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'cookie' }) }),
}));

describe('SSR guards', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns hub shell when guard is disabled (incomplete profile)', async () => {
    const expectedLog = captureExpectedConsoleLog(/^Hub guard: Server-side auth check disabled/);
    const hub = await import('@/app/hub/layout');
    const out = await hub.default({ children: 'x' } as any);
    expect(out).toMatchObject({ props: { children: 'x' } });
    expectedLog.expectCalled();
  });

  it('returns hub shell when guard is disabled (complete profile)', async () => {
    const expectedLog = captureExpectedConsoleLog(/^Hub guard: Server-side auth check disabled/);
    const hub = await import('@/app/hub/layout');
    const out = await hub.default({ children: 'ok' } as any);
    expect(out).toMatchObject({ props: { children: 'ok' } });
    expectedLog.expectCalled();
  });
});
