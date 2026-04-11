import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERSON_EXTERNAL_ID_SOURCES, type PersonExternalIdRecord } from "@/lib/admin/person-external-ids";
import { usePersonSettingsController } from "@/lib/admin/person-page/use-person-settings-controller";
import type { TrrPerson } from "@/lib/admin/person-page/types";

const PERSON_ID = "11111111-2222-3333-4444-555555555555";

const buildPerson = (externalIds: Record<string, unknown> = {}): TrrPerson => ({
  id: PERSON_ID,
  full_name: "Andy Cohen",
  known_for: null,
  external_ids: externalIds,
  created_at: "2026-02-24T00:00:00.000Z",
  updated_at: "2026-02-24T00:00:00.000Z",
});

describe("usePersonSettingsController", () => {
  const getAuthHeaders = vi.fn<() => Promise<HeadersInit>>();
  const setPerson = vi.fn<(person: TrrPerson | null) => void>();
  const fetchPerson = vi.fn<() => Promise<TrrPerson | null>>();
  const runSecondaryRead = vi.fn<(task: () => Promise<void>) => Promise<void>>();

  beforeEach(() => {
    vi.restoreAllMocks();
    getAuthHeaders.mockReset();
    setPerson.mockReset();
    fetchPerson.mockReset();
    runSecondaryRead.mockReset();
    getAuthHeaders.mockResolvedValue({ authorization: "Bearer test-token" });
    fetchPerson.mockResolvedValue(null);
    runSecondaryRead.mockImplementation(async (task) => {
      await task();
    });
  });

  it("falls back to the loaded person external ids when the settings fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "external ids exploded" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const person = buildPerson({
      imdb: "nm4541706",
      tmdb: "1686599",
    });

    const { result } = renderHook(() =>
      usePersonSettingsController({
        personId: PERSON_ID,
        person,
        setPerson,
        fetchPerson,
        getAuthHeaders,
        hasAccess: true,
        settingsTabActive: false,
        runSecondaryRead,
      }),
    );

    await act(async () => {
      await result.current.fetchExternalIds({ fallbackPerson: person });
    });

    expect(result.current.externalIdDrafts).toEqual([
      { source_id: "imdb", external_id: "nm4541706" },
      { source_id: "tmdb", external_id: "1686599" },
    ]);
    expect(result.current.externalIdsError).toBe("external ids exploded");
    expect(result.current.externalIdsLoading).toBe(false);
    expect(runSecondaryRead).not.toHaveBeenCalled();
  });

  it("filters empty drafts when saving external ids and refreshes the person record", async () => {
    const savedRecords: PersonExternalIdRecord[] = [
      {
        id: 2,
        source_id: "tmdb",
        external_id: "1686599",
        is_primary: true,
        valid_from: null,
        valid_to: null,
        observed_at: null,
      },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes(`/api/admin/trr-api/people/${PERSON_ID}/external-ids`) && init?.method === "PUT") {
        return new Response(JSON.stringify({ external_ids: savedRecords }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "not mocked" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const person = buildPerson();

    const { result } = renderHook(() =>
      usePersonSettingsController({
        personId: PERSON_ID,
        person,
        setPerson,
        fetchPerson,
        getAuthHeaders,
        hasAccess: true,
        settingsTabActive: false,
        runSecondaryRead,
      }),
    );

    act(() => {
      result.current.handleAddExternalIdDraft();
      result.current.handleChangeExternalIdDraft(0, "source_id", "tmdb");
      result.current.handleChangeExternalIdDraft(0, "external_id", "1686599");
      result.current.handleAddExternalIdDraft();
    });

    await act(async () => {
      await result.current.saveExternalIds();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({
      external_ids: [{ source_id: "tmdb", external_id: "1686599" }],
    });
    expect(fetchPerson).toHaveBeenCalledTimes(1);
    expect(result.current.externalIdDrafts).toEqual([{ source_id: "tmdb", external_id: "1686599" }]);
    expect(result.current.externalIdsNotice).toBe("Saved external IDs.");
  });

  it("persists canonical source order and applies the server-confirmed ordering", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith(`/api/admin/trr-api/people/${PERSON_ID}`) && init?.method === "PATCH") {
        return new Response(
          JSON.stringify({
            person: buildPerson({
              canonical_profile_source_order: ["manual", "imdb", "tmdb", "fandom"],
            }),
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }
      return new Response(JSON.stringify({ error: "not mocked" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const person = buildPerson({
      canonical_profile_source_order: [...PERSON_EXTERNAL_ID_SOURCES.slice(0, 0)],
    });

    const { result } = renderHook(() =>
      usePersonSettingsController({
        personId: PERSON_ID,
        person,
        setPerson,
        fetchPerson,
        getAuthHeaders,
        hasAccess: true,
        settingsTabActive: false,
        runSecondaryRead,
      }),
    );

    act(() => {
      result.current.moveCanonicalSource("manual", "up");
      result.current.moveCanonicalSource("manual", "up");
      result.current.moveCanonicalSource("manual", "up");
    });

    expect(result.current.canonicalSourceOrderDirty).toBe(true);

    await act(async () => {
      await result.current.saveCanonicalSourceOrder();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      canonicalProfileSourceOrder: ["manual", "imdb", "tmdb", "fandom"],
    });
    expect(setPerson).toHaveBeenCalledWith(
      expect.objectContaining({
        external_ids: expect.objectContaining({
          canonical_profile_source_order: ["manual", "imdb", "tmdb", "fandom"],
        }),
      }),
    );
    expect(result.current.canonicalSourceOrder).toEqual(["manual", "imdb", "tmdb", "fandom"]);
    expect(result.current.canonicalSourceOrderDirty).toBe(false);
    expect(result.current.canonicalSourceOrderNotice).toBe("Saved source order.");
  });
});
