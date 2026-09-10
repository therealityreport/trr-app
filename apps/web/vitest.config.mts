import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig(() => {
  const isCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const coverageReporters = isCi ? ['text', 'lcovonly'] : ['text', 'html', 'lcov'];

  return {
    resolve: {
      tsconfigPaths: true,
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
        'server-only': path.resolve(import.meta.dirname, 'tests/mocks/server-only.ts'),
      },
    },
    oxc: {
      jsx: { runtime: 'automatic', importSource: 'react' },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      // Shared setup owns mock cleanup after each test.
      clearMocks: false,
      setupFiles: ['tests/setup.ts'],
      include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
      coverage: {
        provider: 'v8',
        reporter: coverageReporters,
        reportsDirectory: 'coverage',
        exclude: ['tests/**'],
      },
    },
  };
});
