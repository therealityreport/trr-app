import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';
import { afterEach, vi } from 'vitest';
import { __resetSharedLiveResourceRegistryForTests } from '@/lib/admin/shared-live-resource';

declare global {
  // Global admin route caches are persisted on globalThis between test files.
  // Clearing them here keeps dedupe/cache tests independent from suite order.
  var __trrAdminRouteCache: Map<string, unknown> | undefined;
  var __trrAdminRouteInFlight: Map<string, Promise<unknown>> | undefined;
}

afterEach(() => {
  cleanup();
  __resetSharedLiveResourceRegistryForTests();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllTimers();
  vi.useRealTimers();
  globalThis.__trrAdminRouteCache?.clear();
  globalThis.__trrAdminRouteInFlight?.clear();
  try {
    window.localStorage.clear();
  } catch {
    // best-effort in jsdom
  }
  try {
    window.sessionStorage.clear();
  } catch {
    // best-effort in jsdom
  }
  document.head.innerHTML = '';
});

vi.mock('next/image', () => ({
  __esModule: true,
  default: (
    props: React.ImgHTMLAttributes<HTMLImageElement> & {
      priority?: boolean;
      unoptimized?: boolean;
      fill?: boolean;
    }
  ) => {
    const { priority: _priority, unoptimized: _unoptimized, fill: _fill, ...rest } = props;
    void _priority;
    void _unoptimized;
    void _fill;
    return React.createElement('img', rest);
  },
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/firebase', () => ({
  auth: {
    onAuthStateChanged: vi.fn(() => () => {}),
  },
  signInWithGoogle: vi.fn(),
  logout: vi.fn(),
  initAnalytics: vi.fn(),
}));

vi.mock('@/lib/firebase-db', () => ({
  getDb: vi.fn(() => ({})),
}));

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

window.scrollTo = vi.fn() as typeof window.scrollTo;
