#!/usr/bin/env node

import { readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_BATCH_SIZE = 4;
const DEFAULT_HEAP_MB = 4096;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const batchSize = parsePositiveInt(process.env.TEST_CI_BATCH_SIZE, DEFAULT_BATCH_SIZE);
const heapMb = parsePositiveInt(process.env.TEST_CI_HEAP_MB, DEFAULT_HEAP_MB);
const onlyBatch = parsePositiveInt(process.env.TEST_CI_ONLY_BATCH, 0);
const extraArgs = process.argv.slice(2);

function collectTestFiles(rootDir) {
  const pending = [rootDir];
  const files = [];

  while (pending.length > 0) {
    const currentDir = pending.pop();
    const entries = readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        pending.push(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) continue;
      files.push(path.relative(process.cwd(), absolutePath));
    }
  }

  return files.sort();
}

const testFiles = collectTestFiles(path.join(process.cwd(), 'tests'));

if (testFiles.length === 0) {
  console.error('[test:ci] No test files found.');
  process.exit(1);
}

const batches = [];
for (let index = 0; index < testFiles.length; index += batchSize) {
  batches.push(testFiles.slice(index, index + batchSize));
}

console.log(
  `[test:ci] Running ${testFiles.length} files across ${batches.length} fresh Vitest batches (size <= ${batchSize}, heap ${heapMb} MB).`,
);

const nodeOptions = [`--max-old-space-size=${heapMb}`, process.env.NODE_OPTIONS]
  .filter(Boolean)
  .join(' ');

for (const [index, batch] of batches.entries()) {
  const batchNumber = index + 1;
  if (onlyBatch !== 0 && batchNumber !== onlyBatch) {
    continue;
  }

  console.log(`\n[test:ci] Batch ${batchNumber}/${batches.length} (${batch.length} files)`);

  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'vitest',
      'run',
      '-c',
      'vitest.config.ts',
      '--pool=forks',
      '--poolOptions.forks.singleFork',
      ...extraArgs,
      ...batch,
    ],
    {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_OPTIONS: nodeOptions,
      },
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
