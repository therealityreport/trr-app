import '@testing-library/jest-dom/vitest';
import React from 'react';
import { vi } from 'vitest';

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    const { priority: _priority, ...rest } = props;
    void _priority;
    return React.createElement('img', rest);
  },
}));

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
