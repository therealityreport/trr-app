// @ts-nocheck - Test files use different module resolution
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    delete process.env.TRR_HUB_GUARD_DIAGNOSTICS;
  });

  it('returns hub shell when guard is disabled without logging by default (incomplete profile)', async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const hub = await import('@/app/hub/layout');
    const out = await hub.default({ children: 'x' } as any);
    expect(out).toMatchObject({ props: { children: 'x' } });
    expect(logSpy).not.toHaveBeenCalledWith(
      "Hub guard: Server-side auth check disabled - using client-side auth only",
    );
    logSpy.mockRestore();
  });

  it('returns hub shell when guard diagnostics are enabled', async () => {
    process.env.TRR_HUB_GUARD_DIAGNOSTICS = "true";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const hub = await import('@/app/hub/layout');
    const out = await hub.default({ children: 'ok' } as any);
    expect(out).toMatchObject({ props: { children: 'ok' } });
    expect(logSpy).toHaveBeenCalledWith(
      "Hub guard: Server-side auth check disabled - using client-side auth only",
    );
    logSpy.mockRestore();
  });
});
