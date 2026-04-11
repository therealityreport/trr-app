#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';

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

const fileOutput = execFileSync(
  'rg',
  ['--files', 'tests', '-g', '*.test.ts', '-g', '*.test.tsx'],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
  },
);

const testFiles = fileOutput
  .split('\n')
  .map((value) => value.trim())
  .filter(Boolean)
  .sort();

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
