import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import SocialPostsSection from "@/components/admin/social-posts-section";

const { getClientAuthHeadersMock } = vi.hoisted(() => ({
  getClientAuthHeadersMock: vi.fn(),
}));

vi.mock("@/lib/admin/client-auth", () => ({
  getClientAuthHeaders: getClientAuthHeadersMock,
}));

const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const SEASON_ID = "22222222-2222-4222-8222-222222222222";

const buildPost = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "post-1",
  trr_show_id: SHOW_ID,
  trr_season_id: SEASON_ID,
  platform: "reddit",
  url: "https://reddit.com/r/bravorealhousewives/comments/abc123/thread/",
  title: "Thread",
  notes: null,
  created_by_firebase_uid: "admin-uid",
  created_at: "2026-01-01T10:00:00.000Z",
  updated_at: "2026-01-01T10:00:00.000Z",
  ...overrides,
});

describe("SocialPostsSection", () => {
  beforeEach(() => {
    getClientAuthHeadersMock.mockReset();
    getClientAuthHeadersMock.mockResolvedValue({ Authorization: "Bearer test-token" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads posts with season query forwarding", async () => {
    const fetchMock = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({ posts: [buildPost()] }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<SocialPostsSection showId={SHOW_ID} showName="RHOSLC" seasonId={SEASON_ID} />);

    await screen.findByText("Thread");

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/trr-api/shows/${SHOW_ID}/social-posts?trr_season_id=${SEASON_ID}`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      }),
    );
  });

  it("renders newest-updated posts first", async () => {
    const fetchMock = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({
          posts: [
            buildPost({ id: "post-old", title: "Older", updated_at: "2026-01-01T10:00:00.000Z" }),
            buildPost({ id: "post-new", title: "Newer", updated_at: "2026-01-02T10:00:00.000Z" }),
          ],
        }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<SocialPostsSection showId={SHOW_ID} showName="RHOSLC" seasonId={SEASON_ID} />);

    const rows = await screen.findAllByTestId("social-post-row");
    expect(within(rows[0]).getByText("Newer")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Older")).toBeInTheDocument();
  });

  it("rejects unsupported URL schemes before submit", async () => {
    const fetchMock = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({ posts: [] }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<SocialPostsSection showId={SHOW_ID} showName="RHOSLC" seasonId={SEASON_ID} />);

    await screen.findByText("No Social Posts Yet");
    fireEvent.click(screen.getByRole("button", { name: "Add First Post" }));

    fireEvent.change(screen.getByLabelText(/URL/), { target: { value: "javascript:alert(1)" } });
    const form = screen.getByText("Add New Post").closest("form");
    expect(form).toBeTruthy();
    fireEvent.click(within(form as HTMLFormElement).getByRole("button", { name: "Add Post" }));

    expect(await screen.findByText("URL must start with http:// or https:// and be valid.")).toBeInTheDocument();
    const postCalls = fetchMock.mock.calls.filter(([, options]) => (options as RequestInit | undefined)?.method === "POST");
    expect(postCalls).toHaveLength(0);
  });

  it("trims create payload fields before POST", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/social-posts") && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({ post: buildPost() }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ posts: [] }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<SocialPostsSection showId={SHOW_ID} showName="RHOSLC" seasonId={SEASON_ID} />);

    await screen.findByText("No Social Posts Yet");
    fireEvent.click(screen.getByRole("button", { name: "Add First Post" }));

    fireEvent.change(screen.getByLabelText(/URL/), { target: { value: "  https://example.com/post  " } });
    fireEvent.change(screen.getByLabelText("Title (optional)"), { target: { value: "  Episode Thread  " } });
    fireEvent.change(screen.getByLabelText("Notes (optional)"), { target: { value: "  keep me trimmed  " } });

    const form = screen.getByText("Add New Post").closest("form");
    expect(form).toBeTruthy();
    fireEvent.click(within(form as HTMLFormElement).getByRole("button", { name: "Add Post" }));

    await screen.findByText("Post created.");

    const postCall = fetchMock.mock.calls.find(([, options]) => (options as RequestInit | undefined)?.method === "POST");
    expect(postCall).toBeTruthy();
    const postBody = JSON.parse(String((postCall?.[1] as RequestInit)?.body ?? "{}")) as {
      url?: string;
      title?: string | null;
      notes?: string | null;
    };

    expect(postBody.url).toBe("https://example.com/post");
    expect(postBody.title).toBe("Episode Thread");
    expect(postBody.notes).toBe("keep me trimmed");
  });

  it("prevents duplicate delete requests while delete is in flight", async () => {
    let resolveDelete: ((value: Response) => void) | null = null;
    const pendingDelete = new Promise<Response>((resolve) => {
      resolveDelete = resolve;
    });

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "DELETE") {
        return pendingDelete;
      }
      return {
        ok: true,
        json: async () => ({ posts: [buildPost({ title: "Delete me" })] }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<SocialPostsSection showId={SHOW_ID} showName="RHOSLC" seasonId={SEASON_ID} />);

    await screen.findByText("Delete me");
    const deleteButton = screen.getByRole("button", { name: "Delete" });

    fireEvent.click(deleteButton);
    fireEvent.click(deleteButton);

    await waitFor(() => {
      const deleteCalls = fetchMock.mock.calls.filter(([, options]) => (options as RequestInit | undefined)?.method === "DELETE");
      expect(deleteCalls).toHaveLength(1);
    });

    resolveDelete?.({ ok: true, json: async () => ({ success: true }) } as Response);
    await waitFor(() => {
      expect(screen.getByText("Post deleted.")).toBeInTheDocument();
    });
  });

  it("does not render an external link action for unsupported stored URLs", async () => {
    const fetchMock = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({
          posts: [
            buildPost({
              title: "Unsafe Link",
              url: "javascript:alert('xss')",
            }),
          ],
        }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    render(<SocialPostsSection showId={SHOW_ID} showName="RHOSLC" seasonId={SEASON_ID} />);

    await screen.findByText("Unsafe Link");
    expect(screen.getByText("Unsupported URL scheme")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open" })).toBeDisabled();
  });
});
