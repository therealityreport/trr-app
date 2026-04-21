import {
  SOCIAL_ACCOUNT_PROFILE_PLATFORMS,
  type SocialAccountProfileTab,
  type SocialPlatformSlug,
} from "@/lib/admin/social-account-profile";
import {
  buildSocialAccountProfileUrl,
  normalizeSocialAccountProfileHandle,
} from "@/lib/admin/show-admin-routes";

type SocialAccountProfileRouteInput = {
  platform: string;
  handle: string;
};

type SocialAccountProfileRouteOptions = {
  tab?: SocialAccountProfileTab;
  supportedPlatforms?: ReadonlyArray<SocialPlatformSlug>;
};

export type ResolvedSocialAccountProfileRoute = {
  platform: SocialPlatformSlug;
  handle: string;
  canonicalUrl: string;
  requiresRedirect: boolean;
};

const HANDLE_RE = /^[a-z0-9._-]{1,64}$/i;

export const resolveSocialAccountProfileRoute = (
  input: SocialAccountProfileRouteInput,
  options: SocialAccountProfileRouteOptions = {},
): ResolvedSocialAccountProfileRoute | null => {
  const supportedPlatforms = options.supportedPlatforms ?? SOCIAL_ACCOUNT_PROFILE_PLATFORMS;
  const trimmedPlatform = input.platform.trim();
  const normalizedPlatform = trimmedPlatform.toLowerCase();
  if (!supportedPlatforms.includes(normalizedPlatform as SocialPlatformSlug)) {
    return null;
  }

  const trimmedHandle = input.handle.trim();
  const handleWithoutAt = trimmedHandle.replace(/^@+/, "");
  const normalizedRawHandle = handleWithoutAt.toLowerCase();
  if (!HANDLE_RE.test(normalizedRawHandle)) {
    return null;
  }

  const normalizedHandle = normalizeSocialAccountProfileHandle(normalizedRawHandle);
  if (!normalizedHandle) {
    return null;
  }

  return {
    platform: normalizedPlatform as SocialPlatformSlug,
    handle: normalizedHandle,
    canonicalUrl: buildSocialAccountProfileUrl({
      platform: normalizedPlatform,
      handle: normalizedHandle,
      tab: options.tab,
    }),
    requiresRedirect:
      trimmedPlatform !== normalizedPlatform ||
      handleWithoutAt !== normalizedHandle ||
      normalizedRawHandle !== normalizedHandle,
  };
};
