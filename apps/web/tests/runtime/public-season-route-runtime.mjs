import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer, request as httpRequest } from "node:http";
import { once } from "node:events";
import { mkdir, rm, stat } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LOOPBACK_HOST = "127.0.0.1";
const PUBLIC_HOST = "public.e14.localhost";
const ADMIN_HOST = "admin.e14.localhost";
const SHOW_SLUG = "the-real-housewives-of-beverly-hills";
const CANONICAL_SEASON_PATH = `/shows/${SHOW_SLUG}/seasons/15`;
const IDENTITY_PATH = `/api/v2/identities/shows/${SHOW_SLUG}/seasons/15`;
const DEV_DIST_DIR_NAME = ".next-e14-public-season-runtime";
const STARTUP_TIMEOUT_MS = 60_000;
const REQUEST_TIMEOUT_MS = 60_000;

function parseMode(argv) {
  const argumentsWithoutSeparator = argv.filter((argument) => argument !== "--");
  const modeArgument = argumentsWithoutSeparator.find((argument) => argument.startsWith("--mode="));
  const mode = modeArgument?.slice("--mode=".length);
  if (mode !== "dev" && mode !== "start") {
    throw new Error("Usage: node tests/runtime/public-season-route-runtime.mjs --mode=dev|start");
  }
  if (argumentsWithoutSeparator.some((argument) => argument !== modeArgument)) {
    throw new Error("Only --mode=dev or --mode=start is supported.");
  }
  return mode;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function formatResponse(response) {
  return `status=${response.status} location=${response.headers.location ?? "<none>"} body=${JSON.stringify(
    response.body.slice(0, 400),
  )}`;
}

async function reserveLoopbackPort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, LOOPBACK_HOST, resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object", "Expected a loopback port reservation.");
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  return address.port;
}

async function startIdentityStub(identityCalls) {
  const server = createServer((request, response) => {
    const call = { method: request.method ?? "", url: request.url ?? "" };
    identityCalls.push(call);

    const isExpectedCall = call.method === "GET" && call.url === IDENTITY_PATH;
    const isFirstExpectedCall = isExpectedCall && identityCalls.length === 1;
    if (!isFirstExpectedCall) {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Unexpected or repeated loopback identity request.", call }));
      return;
    }

    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        resource_type: "season",
        season_id: "22222222-2222-4222-8222-222222222222",
        show_id: "11111111-1111-4111-8111-111111111111",
        show_name: "The Real Housewives of Beverly Hills",
        season_number: 15,
        season_title: "Season 15",
        requested_show_slug: SHOW_SLUG,
        canonical_show_slug: SHOW_SLUG,
        show_match_kind: "canonical",
        canonical_path: CANONICAL_SEASON_PATH,
      }),
    );
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, LOOPBACK_HOST, resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object", "Expected the loopback identity stub to bind a port.");
  return { server, port: address.port };
}

function requestLoopback(port, pathname, timeoutMs = REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: LOOPBACK_HOST,
        port,
        path: pathname,
        method: "GET",
        headers: { Host: `${PUBLIC_HOST}:${port}` },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.once("error", reject);
        response.once("end", () => {
          clearTimeout(timeout);
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    const timeout = setTimeout(() => {
      request.destroy(new Error(`Timed out after ${timeoutMs}ms requesting ${pathname}.`));
    }, timeoutMs);
    request.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    request.end();
  });
}

function appendOutput(current, chunk) {
  const merged = `${current}${chunk.toString()}`;
  return merged.length > 16_000 ? merged.slice(-16_000) : merged;
}

async function waitForNextServer(port, child, getOutput) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  let lastError = null;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next exited during startup (code ${child.exitCode}).\n${getOutput()}`);
    }
    try {
      await requestLoopback(port, "/favicon.ico", 1_000);
      return;
    } catch (error) {
      lastError = error;
      await delay(150);
    }
  }
  throw new Error(`Timed out waiting for Next on loopback. ${String(lastError)}\n${getOutput()}`);
}

async function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null) return;
  await Promise.race([
    once(child, "exit"),
    delay(timeoutMs),
  ]);
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  if (process.platform !== "win32" && child.pid) {
    process.kill(-child.pid, "SIGTERM");
  } else {
    child.kill("SIGTERM");
  }
  await waitForChildExit(child, 10_000);
  if (child.exitCode === null) {
    if (process.platform !== "win32" && child.pid) {
      process.kill(-child.pid, "SIGKILL");
    } else {
      child.kill("SIGKILL");
    }
    await waitForChildExit(child, 5_000);
  }
}

async function closeServer(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

function assertOwnedDistDir(distDir) {
  assert.equal(path.dirname(distDir), APP_ROOT, "Runtime cleanup must stay inside the web app root.");
  assert.equal(path.basename(distDir), DEV_DIST_DIR_NAME, "Runtime cleanup must stay inside its owned distDir.");
}

async function assertStartArtifact(distDir) {
  try {
    await stat(path.join(distDir, "BUILD_ID"));
  } catch {
    throw new Error(
      `--mode=start requires an existing local Next build at ${distDir}. Run the separately approved build first.`,
    );
  }
}

async function run() {
  const mode = parseMode(process.argv.slice(2));
  const identityCalls = [];
  let ownedDevDistDir = null;
  let identityStub = null;
  let nextServer = null;

  try {
    if (mode === "dev") {
      const candidateDistDir = path.join(APP_ROOT, DEV_DIST_DIR_NAME);
      assertOwnedDistDir(candidateDistDir);
      try {
        await mkdir(candidateDistDir, { recursive: false });
      } catch (error) {
        if (error?.code === "EEXIST") {
          throw new Error(
            `Refusing to reuse or delete pre-existing runtime distDir ${candidateDistDir}: collision or stale artifact (EEXIST).`,
          );
        }
        throw error;
      }
      ownedDevDistDir = candidateDistDir;
    }

    const configuredDistDir = mode === "dev"
      ? DEV_DIST_DIR_NAME
      : process.env.NEXT_DIST_DIR?.trim() || ".next";
    const resolvedDistDir = path.resolve(APP_ROOT, configuredDistDir);
    if (mode === "start") {
      await assertStartArtifact(resolvedDistDir);
    }

    identityStub = await startIdentityStub(identityCalls);
    const appPort = await reserveLoopbackPort();
    const nextBin = path.join(APP_ROOT, "node_modules/next/dist/bin/next");
    const args = mode === "dev"
      ? [nextBin, "dev", "--webpack", "--hostname", LOOPBACK_HOST, "--port", String(appPort)]
      : [nextBin, "start", "--hostname", LOOPBACK_HOST, "--port", String(appPort)];
    let nextOutput = "";
    nextServer = spawn(process.execPath, args, {
      cwd: APP_ROOT,
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        ADMIN_APP_ORIGIN: `http://${ADMIN_HOST}:${appPort}`,
        ADMIN_APP_HOSTS: ADMIN_HOST,
        ADMIN_ENFORCE_HOST: "true",
        ADMIN_STRICT_HOST_ROUTING: "false",
        NEXT_DIST_DIR: configuredDistDir,
        NEXT_TELEMETRY_DISABLED: "1",
        SENTRY_DSN: "",
        TRR_API_URL: `http://${LOOPBACK_HOST}:${identityStub.port}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    nextServer.stdout.on("data", (chunk) => {
      nextOutput = appendOutput(nextOutput, chunk);
    });
    nextServer.stderr.on("data", (chunk) => {
      nextOutput = appendOutput(nextOutput, chunk);
    });

    await waitForNextServer(appPort, nextServer, () => nextOutput);

    const resetCalls = () => {
      identityCalls.splice(0, identityCalls.length);
    };
    const assertNoIdentityCalls = (label) => {
      assert.deepEqual(identityCalls, [], `${label} unexpectedly called the loopback identity stub.`);
    };

    resetCalls();
    const bareAlias = await requestLoopback(appPort, `/${SHOW_SLUG}/s15`);
    assert.equal(bareAlias.status, 308, `Bare season alias: ${formatResponse(bareAlias)}`);
    assert.equal(
      bareAlias.headers.location,
      CANONICAL_SEASON_PATH,
      `Bare season alias: ${formatResponse(bareAlias)}`,
    );
    assert.deepEqual(identityCalls, [{ method: "GET", url: IDENTITY_PATH }]);

    resetCalls();
    const seasonSubpath = await requestLoopback(appPort, `/${SHOW_SLUG}/s15/cast`);
    assert.equal(seasonSubpath.status, 200, `Season subpath: ${formatResponse(seasonSubpath)}`);
    assert.match(seasonSubpath.body, /Season 15/);
    assertNoIdentityCalls("Season subpath");

    for (const [pathname, marker] of [
      [`/${SHOW_SLUG}/social`, /Public show social route/],
      [`/${SHOW_SLUG}/settings`, /Public show settings route/],
      [`/${SHOW_SLUG}/surveys`, /Public show surveys route/],
    ]) {
      resetCalls();
      const response = await requestLoopback(appPort, pathname);
      assert.equal(response.status, 200, `Static show route ${pathname}: ${formatResponse(response)}`);
      assert.match(response.body, marker);
      assertNoIdentityCalls(`Static show route ${pathname}`);
    }

    for (const pathname of ["/social/s15", "/settings/s15", "/surveys/s15"]) {
      resetCalls();
      const response = await requestLoopback(appPort, pathname);
      assert.notEqual(response.status, 308, `Reserved route ${pathname}: ${formatResponse(response)}`);
      assert.notEqual(response.headers.location, CANONICAL_SEASON_PATH, `Reserved route ${pathname}`);
      assertNoIdentityCalls(`Reserved route ${pathname}`);
    }

    for (const pathname of [
      `/${SHOW_SLUG}/15`,
      `/${SHOW_SLUG}/season15`,
      `/${SHOW_SLUG}/s`,
      `/${SHOW_SLUG}/s1000`,
    ]) {
      resetCalls();
      const response = await requestLoopback(appPort, pathname);
      assert.equal(response.status, 200, `Invalid season token ${pathname}: ${formatResponse(response)}`);
      assert.match(response.body, /Public show alias route/);
      assertNoIdentityCalls(`Invalid season token ${pathname}`);
    }

    console.log(
      JSON.stringify({
        status: "PASS",
        mode,
        loopbackOnly: true,
        checked: ["bare-alias", "season-subpath", "static-show-routes", "reserved-roots", "invalid-tokens"],
      }),
    );
  } finally {
    if (nextServer) await stopChild(nextServer);
    if (identityStub) await closeServer(identityStub.server);
    if (ownedDevDistDir) {
      assertOwnedDistDir(ownedDevDistDir);
      await rm(ownedDevDistDir, { recursive: true, force: true });
    }
  }
}

await run();
