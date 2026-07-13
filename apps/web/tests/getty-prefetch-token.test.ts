import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGettyPrefetchJob,
  hydrateGettyPrefetchPayload,
  readGettyPrefetchPayload,
} from "@/lib/server/admin/getty-local-scrape";

const {
  accessMock,
  mkdirMock,
  readFileMock,
  rmMock,
  writeFileMock,
} = vi.hoisted(() => ({
  accessMock: vi.fn(),
  mkdirMock: vi.fn(),
  readFileMock: vi.fn(),
  rmMock: vi.fn(),
  writeFileMock: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  access: accessMock,
  default: {
    access: accessMock,
    mkdir: mkdirMock,
    readFile: readFileMock,
    rm: rmMock,
    writeFile: writeFileMock,
  },
  mkdir: mkdirMock,
  readFile: readFileMock,
  rm: rmMock,
  writeFile: writeFileMock,
}));

const GETTY_PREFETCH_TOKEN_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GETTY_PREFETCH_TMP_DIR = path.join(os.tmpdir(), "trr-getty-prefetch");
const VALID_TOKEN = "123e4567-e89b-12d3-a456-426614174000";

describe("Getty prefetch token validation", () => {
  beforeEach(() => {
    accessMock.mockReset();
    mkdirMock.mockReset();
    readFileMock.mockReset();
    rmMock.mockReset();
    writeFileMock.mockReset();
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
  });

  it("rejects traversal tokens before reading from disk", async () => {
    await expect(readGettyPrefetchPayload("../../evil")).resolves.toBeNull();

    expect(readFileMock).not.toHaveBeenCalled();
  });

  it("rejects non-UUID tokens before reading from disk", async () => {
    await expect(readGettyPrefetchPayload("not-a-uuid")).resolves.toBeNull();

    expect(readFileMock).not.toHaveBeenCalled();
  });

  it("accepts valid UUID tokens when reading payloads", async () => {
    const storedPayload = {
      person_name: "Jane Doe",
      revision: 3,
      status: "completed",
    };
    readFileMock.mockResolvedValue(JSON.stringify(storedPayload));

    await expect(readGettyPrefetchPayload(VALID_TOKEN)).resolves.toEqual(storedPayload);

    expect(readFileMock).toHaveBeenCalledWith(
      path.join(GETTY_PREFETCH_TMP_DIR, `${VALID_TOKEN}.json`),
      "utf8",
    );
  });

  it("falls back to a fresh UUID for invalid requested job tokens", async () => {
    const result = await createGettyPrefetchJob("Jane Doe", null, {
      prefetchToken: "../evil",
    });

    expect(result.token).toMatch(GETTY_PREFETCH_TOKEN_RE);
    expect(result.token).not.toBe("../evil");
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const writePath = writeFileMock.mock.calls[0]?.[0];
    expect(typeof writePath).toBe("string");
    const writePathString = String(writePath);
    expect(writePathString).not.toContain("..");
    expect(path.dirname(writePathString)).toBe(GETTY_PREFETCH_TMP_DIR);
    expect(writePathString).toBe(
      path.join(GETTY_PREFETCH_TMP_DIR, `${result.token}.json`),
    );
  });

  it("short-circuits invalid body tokens during hydration", async () => {
    const rawBody = JSON.stringify({ getty_prefetch_token: "a/b" });

    await expect(hydrateGettyPrefetchPayload(rawBody)).resolves.toBe(rawBody);

    expect(readFileMock).not.toHaveBeenCalled();
  });
});
