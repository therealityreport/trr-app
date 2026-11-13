import React from "react";
import { act, render, renderHook, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import type { SocialPlatformSlug, SocialProfileCookieHealth } from "@/lib/admin/social-account-profile";
import { ProfileCookieHealthCard, isInstagramPublicOnlyAccess } from "@/components/admin/social-account-profile/ProfileCookieHealthCard";
import { useProfileCookieHealth } from "@/components/admin/social-account-profile/use-profile-cookie-health";

const publicHealth: SocialProfileCookieHealth = {
  platform: "instagram", required: false, healthy: true, reason: "public_only_policy", source_kind: "public_only", refresh_supported: false, refresh_available: false,
  comments_auth_health: { platform: "instagram", status: "public", category: "public", ready: false, public_ready: true, authenticated_ready: false, auth_probe_skipped: true, reason: "public_only_policy" },
};
const fetchHealth = vi.fn();
const refreshCookies = vi.fn();
const card = (health: SocialProfileCookieHealth, platform: SocialPlatformSlug = "instagram") => <ProfileCookieHealthCard
  platform={platform} cookieHealth={health} showCookieHealthLoading={false} showCookieHealthError={false}
  instagramCommentsAuthOwnsCurrentSurface={false} cookieHealthPrimaryLabel={null} cookieRefreshing={false} cookieRefreshConfirmationPending={false}
  instagramPostsAuthStatusCopy={null} instagramCookiePayloadStatusCopy={null} cookieRefreshMessage={null}
  fetchCookieHealth={fetchHealth} handleCookieRefresh={refreshCookies} buttonClassName=""
/>;

beforeEach(() => { fetchHealth.mockReset(); refreshCookies.mockReset(); });

describe("Instagram public-only access policy", () => {
  it("shows public access without treating healthy as cookie or authenticated readiness", () => {
    render(card(publicHealth));
    expect(screen.getByText("Public access only")).toBeInTheDocument();
    expect(screen.getByText("Instagram sign-in is disabled")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/Local cookies healthy|Comments auth active|auth blocked|Refresh Cookies/i)).not.toBeInTheDocument();
    expect(fetchHealth).not.toHaveBeenCalled();
    expect(refreshCookies).not.toHaveBeenCalled();
  });
  it("gives policy precedence over stale auth failures, loading, fingerprints, warnings, and repair actions", () => {
    render(<ProfileCookieHealthCard platform="instagram" cookieHealth={{ ...publicHealth, healthy: false, degraded: true, refresh_available: true, refresh_action: "instagram_auth_repair", refresh_label: "Manual Instagram Auth", auth_surface_blocked: true, warning_message: "stale cookie warning" }}
      showCookieHealthLoading showCookieHealthError instagramCommentsAuthOwnsCurrentSurface cookieHealthPrimaryLabel="Local cookies healthy"
      cookieRefreshing={false} cookieRefreshConfirmationPending instagramPostsAuthStatusCopy={{ tone: "text-red-600", text: "Instagram posts auth blocked" }}
      instagramCookiePayloadStatusCopy={{ tone: "text-red-600", text: "Modal cookie payload differs from local file" }} cookieRefreshMessage="Sync validated cookies"
      fetchCookieHealth={fetchHealth} handleCookieRefresh={refreshCookies} buttonClassName="" />);
    expect(screen.getByText("Instagram sign-in is disabled")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/auth blocked|cookie payload|Sync validated cookies|Checking cookies|Comments auth active|stale cookie warning/i)).not.toBeInTheDocument();
  });
  it("preserves legacy Instagram repair and other platforms' healthy-cookie presentation", () => {
    const legacy: SocialProfileCookieHealth = { ...publicHealth, required: true, healthy: false, source_kind: "default_file", refresh_available: true, refresh_action: "instagram_auth_repair", refresh_label: "Manual Instagram Auth" };
    const { unmount } = render(card(legacy));
    expect(screen.getByRole("button", { name: "Manual Instagram Auth" })).toBeInTheDocument();
    unmount();
    render(card({ ...publicHealth, platform: "tiktok", source_kind: "default_file" }, "tiktok"));
    expect(screen.getByText("Local cookies healthy")).toBeInTheDocument();
    expect(isInstagramPublicOnlyAccess({ ...publicHealth, platform: "tiktok" })).toBe(false);
  });
  it("rechecks old Instagram health cache without clearing any sessions or other platform cache", async () => {
    const values = new Map<string, string>();
    const storage: Storage = { get length() { return values.size; }, key: index => [...values.keys()][index] ?? null, getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: vi.fn(), clear: vi.fn() };
    vi.spyOn(window, "sessionStorage", "get").mockReturnValue(storage);
    const cached = { cached_at: Date.now(), cookie_health: { ...publicHealth, source_kind: "default_file", required: true } };
    storage.setItem("trr-social-cookie-health:instagram:bravotv", JSON.stringify(cached));
    const otherKey = "trr-social-cookie-health:tiktok:bravotv";
    const other = JSON.stringify({ cached_at: Date.now(), cookie_health: { ...publicHealth, platform: "tiktok", source_kind: "default_file" } });
    storage.setItem(otherKey, other);
    const request = vi.fn(async () => new Response(JSON.stringify(publicHealth), { status: 200 }));
    const common = { handle: "bravotv", selectedTab: "catalog" as const, user: { uid: "test-admin" } as User, checking: false, hasAccess: true, hasCurrentSummary: true, platformRequiresCookies: true, shouldDeferSecondaryCatalogReads: false, secondaryReadBudgetSlot: 3, fetchAdminWithAuth: request, pauseSecondaryReadsForPressure: vi.fn(() => false) };
    const { result, unmount } = renderHook(() => useProfileCookieHealth({ ...common, platform: "instagram" }));
    await act(async () => { await result.current.fetchCookieHealth(); });
    expect(request).toHaveBeenCalledTimes(1);
    expect(result.current.cookieHealth?.source_kind).toBe("public_only");
    expect(storage.getItem("trr-social-cookie-health-access-policy-v2:instagram:bravotv")).toContain('"source_kind":"public_only"');
    expect(storage.getItem(otherKey)).toBe(other);
    expect(storage.clear).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    unmount();
    request.mockClear();
    const tiktok = renderHook(() => useProfileCookieHealth({ ...common, platform: "tiktok" }));
    await act(async () => { await tiktok.result.current.fetchCookieHealth(); });
    expect(request).not.toHaveBeenCalled();
    expect(tiktok.result.current.cookieHealth?.platform).toBe("tiktok");
  });
});
