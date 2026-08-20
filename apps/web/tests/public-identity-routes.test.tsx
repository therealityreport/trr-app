import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  resolvePublicPersonIdentityMock,
  resolvePublicSeasonIdentityMock,
  resolvePublicShowIdentityMock,
} = vi.hoisted(() => ({
  resolvePublicPersonIdentityMock: vi.fn(),
  resolvePublicSeasonIdentityMock: vi.fn(),
  resolvePublicShowIdentityMock: vi.fn(),
}));

vi.mock("@/lib/server/trr-api/public-identities", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/server/trr-api/public-identities")
  >();
  return {
    ...actual,
    resolvePublicPersonIdentity: resolvePublicPersonIdentityMock,
    resolvePublicSeasonIdentity: resolvePublicSeasonIdentityMock,
    resolvePublicShowIdentity: resolvePublicShowIdentityMock,
  };
});

import PersonPage, {
  generateMetadata as generatePersonMetadata,
} from "@/app/people/[personId]/[[...personTab]]/page";
import RootShowSeasonAliasPage from "@/app/[showId]/s[seasonNumber]/[[...rest]]/page";
import RootShowAliasPage from "@/app/[showId]/[[...rest]]/page";
import ShowSeasonPage, {
  generateMetadata as generateSeasonMetadata,
} from "@/app/shows/[showId]/seasons/[seasonNumber]/page";
import ShowPage, { generateMetadata as generateShowMetadata } from "@/app/shows/[showId]/page";
import { PublicIdentityApiError } from "@/lib/server/trr-api/public-identities";

const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const SEASON_ID = "22222222-2222-4222-8222-222222222222";
const PERSON_ID = "33333333-3333-4333-8333-333333333333";

const SHOW_IDENTITY = {
  resource_type: "show",
  show_id: SHOW_ID,
  show_name: "The Valley",
  requested_slug: "the-valley",
  canonical_slug: "the-valley",
  match_kind: "canonical",
  canonical_path: "/shows/the-valley",
} as const;

const SEASON_IDENTITY = {
  resource_type: "season",
  season_id: SEASON_ID,
  show_id: SHOW_ID,
  show_name: "The Valley",
  season_number: 2,
  season_title: "Reunion",
  requested_show_slug: "the-valley",
  canonical_show_slug: "the-valley",
  show_match_kind: "canonical",
  canonical_path: "/shows/the-valley/seasons/2",
} as const;

const PERSON_IDENTITY = {
  resource_type: "person",
  person_id: PERSON_ID,
  full_name: "Brandi Glanville",
  requested_slug: "brandi-glanville",
  canonical_slug: "brandi-glanville",
  match_kind: "canonical",
  canonical_path: "/people/brandi-glanville",
  show_context: null,
} as const;

const apiError = (status: number): PublicIdentityApiError =>
  new PublicIdentityApiError(`identity error ${status}`, {
    status,
    code: `IDENTITY_${status}`,
    retryable: status >= 500,
  });

const expectPermanentRedirect = async (
  promise: Promise<unknown>,
  path: string,
): Promise<void> => {
  await expect(promise).rejects.toMatchObject({
    digest: `NEXT_REDIRECT;replace;${path};308;`,
  });
};

describe("public identity routes", () => {
  beforeEach(() => {
    resolvePublicShowIdentityMock.mockReset().mockResolvedValue(SHOW_IDENTITY);
    resolvePublicSeasonIdentityMock.mockReset().mockResolvedValue(SEASON_IDENTITY);
    resolvePublicPersonIdentityMock.mockReset().mockResolvedValue(PERSON_IDENTITY);
  });

  it("renders a canonical show with its real name and absolute canonical metadata", async () => {
    const params = Promise.resolve({ showId: "the-valley" });
    const element = await ShowPage({ params });
    const metadata = await generateShowMetadata({
      params: Promise.resolve({ showId: "the-valley" }),
    });

    expect(element.props.title).toBe("The Valley");
    expect(element.props.details).toContainEqual({ label: "Show", value: "The Valley" });
    expect(metadata).toMatchObject({
      title: "The Valley | The Reality Report",
      alternates: { canonical: "https://thereality.report/shows/the-valley" },
    });
    expect(resolvePublicShowIdentityMock).toHaveBeenNthCalledWith(1, "the-valley");
    expect(resolvePublicShowIdentityMock).toHaveBeenNthCalledWith(2, "the-valley");
  });

  it("renders a canonical season with its real show and season names plus metadata", async () => {
    const element = await ShowSeasonPage({
      params: Promise.resolve({ showId: "the-valley", seasonNumber: "2" }),
    });
    const metadata = await generateSeasonMetadata({
      params: Promise.resolve({ showId: "the-valley", seasonNumber: "2" }),
    });

    expect(element.props.title).toBe("The Valley Season 2");
    expect(element.props.details).toContainEqual({ label: "Season", value: "Season 2: Reunion" });
    expect(metadata).toMatchObject({
      title: "The Valley Season 2 | The Reality Report",
      alternates: { canonical: "https://thereality.report/shows/the-valley/seasons/2" },
    });
    expect(resolvePublicSeasonIdentityMock).toHaveBeenNthCalledWith(1, "the-valley", 2);
    expect(resolvePublicSeasonIdentityMock).toHaveBeenNthCalledWith(2, "the-valley", 2);
  });

  it("renders a canonical person with its real name", async () => {
    const element = await PersonPage({
      params: Promise.resolve({ personId: "brandi-glanville" }),
    });

    expect(element.props.title).toBe("Brandi Glanville");
    expect(resolvePublicPersonIdentityMock).toHaveBeenCalledOnce();
    expect(resolvePublicPersonIdentityMock).toHaveBeenCalledWith("brandi-glanville", undefined);
  });

  it("preserves a person tab in metadata while dropping UUID disambiguation context", async () => {
    const personWithContext = {
      ...PERSON_IDENTITY,
      show_context: {
        show_id: SHOW_ID,
        show_name: "The Valley",
        canonical_slug: "the-valley",
      },
    };
    resolvePublicPersonIdentityMock.mockResolvedValue(personWithContext);

    const metadata = await generatePersonMetadata({
      params: Promise.resolve({ personId: "brandi-glanville", personTab: ["photos"] }),
      searchParams: Promise.resolve({ showId: SHOW_ID }),
    });

    expect(metadata).toMatchObject({
      title: "Brandi Glanville | The Reality Report",
      alternates: {
        canonical: "https://thereality.report/people/brandi-glanville/photos",
      },
    });
    expect(resolvePublicPersonIdentityMock).toHaveBeenCalledOnce();
    expect(resolvePublicPersonIdentityMock).toHaveBeenCalledWith("brandi-glanville", {
      showId: SHOW_ID,
    });
  });

  it("drops UUID disambiguation context even when the person path is already canonical", async () => {
    await expectPermanentRedirect(
      PersonPage({
        params: Promise.resolve({ personId: "brandi-glanville", personTab: ["photos"] }),
        searchParams: Promise.resolve({ showId: SHOW_ID }),
      }),
      "/people/brandi-glanville/photos",
    );

    expect(resolvePublicPersonIdentityMock).toHaveBeenCalledOnce();
    expect(resolvePublicPersonIdentityMock).toHaveBeenCalledWith("brandi-glanville", {
      showId: SHOW_ID,
    });
  });

  it("permanently redirects a show alias directly to its canonical path", async () => {
    resolvePublicShowIdentityMock.mockResolvedValue({
      ...SHOW_IDENTITY,
      requested_slug: "valley",
      match_kind: "alias",
    });

    await expectPermanentRedirect(
      ShowPage({ params: Promise.resolve({ showId: "valley" }) }),
      "/shows/the-valley",
    );

    expect(resolvePublicShowIdentityMock).toHaveBeenCalledOnce();
    expect(resolvePublicShowIdentityMock).toHaveBeenCalledWith("valley");
  });

  it("data-resolves a bare root show alias before permanently redirecting it", async () => {
    resolvePublicShowIdentityMock.mockResolvedValue({
      ...SHOW_IDENTITY,
      requested_slug: "valley",
      match_kind: "alias",
    });

    await expectPermanentRedirect(
      RootShowAliasPage({ params: Promise.resolve({ showId: "valley" }) }),
      "/shows/the-valley",
    );

    expect(resolvePublicShowIdentityMock).toHaveBeenCalledOnce();
    expect(resolvePublicShowIdentityMock).toHaveBeenCalledWith("valley");
  });

  it("keeps root show subpaths on the public-safe catch-all without resolving identity", async () => {
    const element = await RootShowAliasPage({
      params: Promise.resolve({ showId: "valley", rest: ["social"] }),
    });

    expect(element.props.title).toBe("Public show route");
    expect(resolvePublicShowIdentityMock).not.toHaveBeenCalled();
  });

  it("data-resolves a bare root season alias before permanently redirecting it", async () => {
    resolvePublicSeasonIdentityMock.mockResolvedValue({
      ...SEASON_IDENTITY,
      season_number: 15,
      requested_show_slug: "valley",
      show_match_kind: "alias",
      canonical_path: "/shows/the-valley/seasons/15",
    });

    await expectPermanentRedirect(
      RootShowSeasonAliasPage({
        params: Promise.resolve({ showId: "valley", seasonNumber: "15" }),
      }),
      "/shows/the-valley/seasons/15",
    );

    expect(resolvePublicSeasonIdentityMock).toHaveBeenCalledOnce();
    expect(resolvePublicSeasonIdentityMock).toHaveBeenCalledWith("valley", 15);
  });

  it("keeps strict season subpaths on their existing public-safe alias route", async () => {
    const element = await RootShowSeasonAliasPage({
      params: Promise.resolve({ showId: "valley", seasonNumber: "15", rest: ["social"] }),
    });

    expect(element.props.title).toBe("Season 15");
    expect(resolvePublicSeasonIdentityMock).not.toHaveBeenCalled();
  });

  it("permanently redirects a case variant directly to its canonical path", async () => {
    await expectPermanentRedirect(
      ShowPage({ params: Promise.resolve({ showId: "The-Valley" }) }),
      "/shows/the-valley",
    );

    expect(resolvePublicShowIdentityMock).toHaveBeenCalledOnce();
    expect(resolvePublicShowIdentityMock).toHaveBeenCalledWith("The-Valley");
  });

  it("permanently redirects a show alias and leading-zero season in one hop", async () => {
    resolvePublicSeasonIdentityMock.mockResolvedValue({
      ...SEASON_IDENTITY,
      requested_show_slug: "valley",
      show_match_kind: "alias",
    });

    await expectPermanentRedirect(
      ShowSeasonPage({
        params: Promise.resolve({ showId: "Valley", seasonNumber: "02" }),
      }),
      "/shows/the-valley/seasons/2",
    );

    expect(resolvePublicSeasonIdentityMock).toHaveBeenCalledOnce();
    expect(resolvePublicSeasonIdentityMock).toHaveBeenCalledWith("Valley", 2);
  });

  it("preserves person tabs while dropping slug disambiguation context from a redirect", async () => {
    resolvePublicPersonIdentityMock.mockResolvedValue({
      ...PERSON_IDENTITY,
      requested_slug: "brandi",
      match_kind: "alias",
      show_context: {
        show_id: SHOW_ID,
        show_name: "The Valley",
        canonical_slug: "the-valley",
      },
    });

    await expectPermanentRedirect(
      PersonPage({
        params: Promise.resolve({ personId: "Brandi", personTab: ["photos", "latest"] }),
        searchParams: Promise.resolve({ showId: "the-valley" }),
      }),
      "/people/brandi-glanville/photos/latest",
    );

    expect(resolvePublicPersonIdentityMock).toHaveBeenCalledOnce();
    expect(resolvePublicPersonIdentityMock).toHaveBeenCalledWith("Brandi", {
      showSlug: "the-valley",
    });
  });

  it.each([
    [400, "person"],
    [404, "season"],
    [409, "show"],
  ] as const)("maps user-addressable %i %s errors to notFound", async (status, route) => {
    if (route === "person") {
      resolvePublicPersonIdentityMock.mockRejectedValue(apiError(status));
      await expect(
        PersonPage({ params: Promise.resolve({ personId: "brandi" }) }),
      ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
      return;
    }
    if (route === "season") {
      resolvePublicSeasonIdentityMock.mockRejectedValue(apiError(status));
      await expect(
        ShowSeasonPage({
          params: Promise.resolve({ showId: "the-valley", seasonNumber: "2" }),
        }),
      ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
      return;
    }
    resolvePublicShowIdentityMock.mockRejectedValue(apiError(status));
    await expect(
      ShowPage({ params: Promise.resolve({ showId: "valley" }) }),
    ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  });

  it.each([500, 502, 503, 504])("rethrows infrastructure status %i", async (status) => {
    const error = apiError(status);
    resolvePublicShowIdentityMock.mockRejectedValue(error);

    await expect(
      ShowPage({ params: Promise.resolve({ showId: "the-valley" }) }),
    ).rejects.toBe(error);
  });
});
