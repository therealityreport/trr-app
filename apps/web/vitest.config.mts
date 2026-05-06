import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const { default: tsconfigPaths } = await import('vite-tsconfig-paths');
  const isCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const coverageReporters = isCi ? ['text', 'lcovonly'] : ['text', 'html', 'lcov'];

  return {
    plugins: [tsconfigPaths()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        'server-only': path.resolve(__dirname, 'tests/mocks/server-only.ts'),
      },
    },
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: 'react',
    },
    test: {
      environment: 'jsdom',
      globals: true,
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
