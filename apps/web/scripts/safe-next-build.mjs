#!/usr/bin/env node

import os from 'node:os';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const BYTES_PER_GIB = 1024 ** 3;
const DEFAULT_LOCAL_CPUS = 2;
const DEFAULT_LOCAL_NICE = 10;
const DEFAULT_LOCAL_HEAP_MB = 3072;
function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function formatGib(value) {
  return `${value.toFixed(1)} GiB`;
}

function readDarwinSwapUsedGib() {
  if (process.platform !== 'darwin') {
    return null;
  }

  const result = spawnSync('/usr/sbin/sysctl', ['-n', 'vm.swapusage'], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    return null;
  }

  const match = result.stdout.match(/used\s*=\s*([0-9.]+)([kmgt])?/i);
  if (!match) {
    return null;
  }

  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) {
    return null;
  }

  const unit = (match[2] ?? 'm').toLowerCase();
  if (unit === 't') return value * 1024;
  if (unit === 'g') return value;
  if (unit === 'k') return value / 1024 / 1024;
  return value / 1024;
}

function appendNodeOption(existingOptions, option) {
  return [option, existingOptions].filter(Boolean).join(' ');
}

const isCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const isDryRun = process.env.TRR_BUILD_DRY_RUN === '1';

const freeGib = os.freemem() / BYTES_PER_GIB;
const swapUsedGib = readDarwinSwapUsedGib();
const localCpuCount = parsePositiveInt(process.env.TRR_NEXT_BUILD_CPUS, DEFAULT_LOCAL_CPUS);
const localNice = parsePositiveInt(process.env.TRR_BUILD_NICE, DEFAULT_LOCAL_NICE);
const localHeapMb = parsePositiveInt(process.env.TRR_BUILD_HEAP_MB, DEFAULT_LOCAL_HEAP_MB);

const pnpmCommand =
  process.env.npm_execpath && process.env.npm_execpath.includes('pnpm')
    ? process.env.npm_execpath
    : 'pnpm';
const cliArgs = process.argv.slice(2);
const useTurbopack = cliArgs.includes('--turbopack');
const forwardedCliArgs = cliArgs.filter((arg) => arg !== '--turbopack');
const nextArgs = [
  'exec',
  'next',
  'build',
  useTurbopack ? '--turbopack' : '--webpack',
  ...forwardedCliArgs,
];
const childEnv = { ...process.env };

if (!isCi) {
  childEnv.TRR_NEXT_BUILD_CPUS = String(localCpuCount);
  if (!childEnv.NODE_OPTIONS?.includes('--max-old-space-size=')) {
    childEnv.NODE_OPTIONS = appendNodeOption(childEnv.NODE_OPTIONS, `--max-old-space-size=${localHeapMb}`);
  }
}

const command = !isCi && process.platform !== 'win32' ? 'nice' : pnpmCommand;
const args = command === 'nice' ? ['-n', String(localNice), pnpmCommand, ...nextArgs] : nextArgs;
const summary = [
  `free=${formatGib(freeGib)}`,
  swapUsedGib === null ? null : `swap=${formatGib(swapUsedGib)}`,
  isCi ? 'ci=true' : `cpus=${childEnv.TRR_NEXT_BUILD_CPUS}`,
  isCi ? null : `nice=${localNice}`,
].filter(Boolean);

console.log(`[safe-next-build] ${summary.join(' ')}`);

if (isDryRun) {
  console.log(`[safe-next-build] Dry run: would run ${command} ${args.join(' ')}`);
  process.exit(0);
}

const result = spawnSync(command, args, {
  cwd: process.cwd(),
  env: childEnv,
  stdio: 'inherit',
});

if (result.error) {
  console.error(`[safe-next-build] Failed to start build: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
