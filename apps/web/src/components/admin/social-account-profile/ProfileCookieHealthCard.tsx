import { Button } from "@/components/ui/button";
import type { SocialPlatformSlug, SocialProfileCookieHealth } from "@/lib/admin/social-account-profile";
import type { useProfileCookieHealth } from "./use-profile-cookie-health";

type AuthStatusCopy = { tone: string; text: string } | null;
type CookieHealthActions = ReturnType<typeof useProfileCookieHealth>;

type ProfileCookieHealthCardProps = {
  platform: SocialPlatformSlug;
  cookieHealth: SocialProfileCookieHealth | null;
  showCookieHealthLoading: boolean;
  showCookieHealthError: boolean;
  instagramCommentsAuthOwnsCurrentSurface: boolean;
  cookieHealthPrimaryLabel: string | null;
  cookieRefreshing: boolean;
  cookieRefreshConfirmationPending: boolean;
  instagramPostsAuthStatusCopy: AuthStatusCopy;
  instagramCookiePayloadStatusCopy: AuthStatusCopy;
  cookieRefreshMessage: string | null;
  fetchCookieHealth: CookieHealthActions["fetchCookieHealth"];
  handleCookieRefresh: CookieHealthActions["handleCookieRefresh"];
  buttonClassName: string;
};

const formatCookieHealthWarningLabel = (cookieHealth?: SocialProfileCookieHealth | null): string => {
  if (cookieHealth?.warning_code === "env_json_source_refresh_writes_file") {
    return "Sync writes file";
  }
  return "Warning";
};

export function ProfileCookieHealthCard({
  platform,
  cookieHealth,
  showCookieHealthLoading,
  showCookieHealthError,
  instagramCommentsAuthOwnsCurrentSurface,
  cookieHealthPrimaryLabel,
  cookieRefreshing,
  cookieRefreshConfirmationPending,
  instagramPostsAuthStatusCopy,
  instagramCookiePayloadStatusCopy,
  cookieRefreshMessage,
  fetchCookieHealth,
  handleCookieRefresh,
  buttonClassName,
}: ProfileCookieHealthCardProps) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
      {showCookieHealthLoading ? (
        <>
          <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-zinc-400" />
          <span className="text-xs text-zinc-500">Checking cookies…</span>
        </>
      ) : showCookieHealthError ? (
        <>
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="text-xs text-zinc-500">Cookie check failed</span>
          <Button
            onClick={() => void fetchCookieHealth(true)}
            size="sm"
            variant="outline"
            className={buttonClassName}
          >
            Retry
          </Button>
        </>
      ) : instagramCommentsAuthOwnsCurrentSurface ? (
        <>
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-zinc-600">Comments auth active</span>
        </>
      ) : cookieHealth?.degraded ? (
        <>
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="text-xs text-zinc-600">Cookie check unavailable</span>
        </>
      ) : cookieHealth?.healthy === true ? (
        <>
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-zinc-600">
            {cookieHealthPrimaryLabel ?? "Local cookies healthy"}
          </span>
        </>
      ) : cookieHealth?.healthy === false ? (
        <>
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="text-xs text-zinc-600">
            {cookieHealth.auth_surface_blocked ? "Instagram auth blocked" : "Cookies expired"}
            {cookieHealth.reason ? ` — ${cookieHealth.reason}` : ""}
          </span>
          {cookieHealth.refresh_available ? (
            <Button
              onClick={() =>
                void handleCookieRefresh({
                  confirmed:
                    platform === "instagram" &&
                    cookieHealth.refresh_action === "instagram_auth_repair" &&
                    cookieRefreshConfirmationPending,
                })
              }
              disabled={cookieRefreshing}
              size="sm"
              variant="outline"
              className={buttonClassName}
            >
              {cookieRefreshing
                ? platform === "instagram" && cookieHealth.refresh_action === "instagram_auth_repair"
                  ? "Syncing…"
                  : "Refreshing…"
                : platform === "instagram" &&
                    cookieHealth.refresh_action === "instagram_auth_repair" &&
                    cookieRefreshConfirmationPending
                  ? "Confirm Manual Auth Check"
                  : cookieHealth.refresh_label || "Refresh Cookies"}
            </Button>
          ) : (
            <span className="text-xs text-zinc-400" title="Cookie refresh requires local dev server">
              {(cookieHealth.refresh_label || "Refresh Cookies") + " unavailable (requires local dev)"}
            </span>
          )}
        </>
      ) : null}
      {instagramPostsAuthStatusCopy ? (
        <span className={`text-xs ${instagramPostsAuthStatusCopy.tone}`}>
          {instagramPostsAuthStatusCopy.text}
        </span>
      ) : null}
      {instagramCookiePayloadStatusCopy ? (
        <span className={`text-xs ${instagramCookiePayloadStatusCopy.tone}`}>
          {instagramCookiePayloadStatusCopy.text}
        </span>
      ) : null}
      {cookieRefreshMessage && !instagramCommentsAuthOwnsCurrentSurface ? (
        <span className="text-xs text-zinc-500">{cookieRefreshMessage}</span>
      ) : null}
      {cookieHealth?.warning_message ? (
        <span className="text-xs text-amber-600" title={cookieHealth.warning_message}>
          ⚠ {formatCookieHealthWarningLabel(cookieHealth)}
        </span>
      ) : null}
    </div>
  );
}
