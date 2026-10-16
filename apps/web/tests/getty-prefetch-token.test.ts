import path from "node:path";
import os from "node:os";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fs = vi.hoisted(() => ({
  readFile: vi.fn(), writeFile: vi.fn(), mkdir: vi.fn(), rm: vi.fn(), access: vi.fn(),
}));
vi.mock("node:fs/promises", () => ({ ...fs, default: fs }));
import {
  createGettyPrefetchJob, deleteGettyPrefetchPayload, hydrateGettyPrefetchPayload,
  InvalidGettyPrefetchTokenError, readGettyPrefetchPayload, startGettyPrefetchJob,
  updateGettyPrefetchPayload,
} from "@/lib/server/admin/getty-local-scrape";

const token = "01234567-89ab-4cde-8fab-0123456789ab";
beforeEach(() => {
  vi.resetAllMocks();
  fs.mkdir.mockResolvedValue(undefined);
  fs.writeFile.mockResolvedValue(undefined);
});

describe("Getty caller-controlled token paths", () => {
  it.each(["../inert", "a/b", "not-a-uuid", `${token}\n../inert`])(
    "rejects %s before filesystem access or job launch", async (badToken) => {
      expect(await readGettyPrefetchPayload(badToken)).toBeNull();
      expect(await updateGettyPrefetchPayload(badToken, {})).toBeNull();
      await deleteGettyPrefetchPayload(badToken);
      await expect(startGettyPrefetchJob(badToken, "Test Person")).rejects.toThrow("token is required");
      await expect(hydrateGettyPrefetchPayload(JSON.stringify({ getty_prefetch_token: badToken })))
        .rejects.toBeInstanceOf(InvalidGettyPrefetchTokenError);
      for (const mock of Object.values(fs)) expect(mock).not.toHaveBeenCalled();
    },
  );

  it("replaces an invalid requested job token with a fresh in-directory UUID", async () => {
    const job = await createGettyPrefetchJob("Test Person", null, { prefetchToken: "../inert" });
    expect(job.token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(fs.writeFile).toHaveBeenCalledOnce();
    expect(fs.writeFile.mock.calls[0][0]).toBe(path.join(os.tmpdir(), "trr-getty-prefetch", `${job.token}.json`));
  });

  it("accepts and trims a valid UUID without changing its payload", async () => {
    const payload = { person_name: "Test Person", merged: [] };
    fs.readFile.mockResolvedValue(JSON.stringify(payload));
    expect(await readGettyPrefetchPayload(` ${token} `)).toEqual(payload);
    expect(fs.readFile).toHaveBeenCalledWith(path.join(os.tmpdir(), "trr-getty-prefetch", `${token}.json`), "utf8");
    expect((await createGettyPrefetchJob("Test Person", null, { prefetchToken: token })).token).toBe(token);
  });
});
