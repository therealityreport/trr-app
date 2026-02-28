import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
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
  db: {},
  signInWithGoogle: vi.fn(),
  logout: vi.fn(),
  initAnalytics: vi.fn(),
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
