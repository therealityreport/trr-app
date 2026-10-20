import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const source = fileURLToPath(new URL('./node-baseline-smoke.sh', import.meta.url));
async function fixture(t, { version = 'v24.22.0', pnpm = '11.5.2', helper = false } = {}) {
  const root = await fs.mkdtemp(join(tmpdir(), 'trr-app-node-smoke-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const app = join(root, 'TRR-APP'), bin = join(root, 'bin');
  await fs.mkdir(join(app, 'scripts'), { recursive: true }); await fs.mkdir(bin);
  await fs.copyFile(source, join(app, 'scripts/node-baseline-smoke.sh'));
  await fs.writeFile(join(app, 'package.json'), JSON.stringify({ packageManager: 'pnpm@11.5.2', engines: { node: '24.x' } }));
  // Intercept only version reporting; JSON reads run under the real test Node.
  await fs.writeFile(join(bin, 'node'), `#!/bin/sh\nif [ "$1" = "--version" ]; then echo '${version}'; else exec '${process.execPath}' "$@"; fi\n`, { mode: 0o755 });
  await fs.writeFile(join(bin, 'npm'), '#!/bin/sh\necho 12.2.0\n', { mode: 0o755 });
  await fs.writeFile(join(bin, 'pnpm'), `#!/bin/sh\necho '${pnpm}'\n`, { mode: 0o755 });
  if (helper) {
    const library = join(root, 'scripts/lib/node-baseline.sh');
    await fs.mkdir(dirname(library), { recursive: true });
    await fs.writeFile(library, 'echo helper-invoked >&2\ntrr_ensure_node_baseline_or_exit() { return 0; }\n');
  }
  return args => spawnSync('bash', [join(app, 'scripts/node-baseline-smoke.sh'), ...args], {
    encoding: 'utf8', cwd: app, env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, COREPACK_ENABLE_NETWORK: '0', COREPACK_ENABLE_AUTO_PIN: '0' },
  });
}

test('standalone checkout verifies the Node 24 and pinned pnpm contract', async t => {
  const run = await fixture(t);
  const result = run([]); assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /mode=node24-default/); assert.match(result.stdout, /status=ok/); assert.match(result.stdout, /engines.node=24.x/);
});
test('explicit Node 26 preview keeps that runtime even when the workspace helper exists', async t => {
  const run = await fixture(t, { version: 'v26.5.0', helper: true });
  const result = run(['--mode=node26-preview']); assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /node=v26.5.0/); assert.doesNotMatch(result.stderr, /helper-invoked/);
});
test('the default workspace mode preserves the existing activation helper', async t => {
  const run = await fixture(t, { helper: true });
  const result = run([]); assert.equal(result.status, 0, result.stderr); assert.match(result.stderr, /helper-invoked/);
});
test('preview rejects Node 24 rather than reporting a switched runtime as compatible', async t => {
  const run = await fixture(t);
  const result = run(['--mode=node26-preview']); assert.equal(result.status, 1); assert.match(result.stderr, /requires Node 26.x/);
});
test('standalone default rejects Node 22 and mismatched package manager versions', async t => {
  const oldNode = await fixture(t, { version: 'v22.23.2' });
  const rejected = oldNode([]); assert.match(rejected.stderr, /requires Node 24.x/); assert.equal(rejected.status, 1);
  const wrongPnpm = await fixture(t, { pnpm: '10.33.0' });
  const result = wrongPnpm([]); assert.equal(result.status, 1); assert.match(result.stderr, /Expected pnpm 11.5.2/);
});
test('unknown modes and extra arguments fail closed', async t => {
  const run = await fixture(t);
  assert.equal(run(['--mode=node22']).status, 1); assert.equal(run(['--mode=node26-preview', '--mode=node24-default']).status, 1);
});
