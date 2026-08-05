import "server-only";

import {
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  AdminReadProxyError,
  buildAdminBackendStatusError,
  fetchAdminBackendJson,
  type AdminBackendJsonResult,
} from "@/lib/server/trr-api/admin-read-proxy";
import type { VerifiedAdminContext } from "@/lib/server/trr-api/internal-admin-auth";

export type ImageType = "cast" | "episode" | "season";
export type ReassignMode = "preserve" | "copy";

interface ArchiveParams {
  imageType: ImageType;
  imageId: string;
  adminContext: VerifiedAdminContext;
  reason?: string;
}

interface ReassignParams {
  imageType: ImageType;
  imageId: string;
  toType?: ImageType;
  toEntityId: string;
  mode: ReassignMode;
  adminContext: VerifiedAdminContext;
}

const imagePath = (imageType: ImageType, imageId: string): string =>
  `/admin/images/${encodeURIComponent(imageType)}/${encodeURIComponent(imageId)}`;

const throwImageStatusError = (
  upstream: AdminBackendJsonResult,
  routeName: string,
  fallbackMessage: string,
): never => {
  throw buildAdminBackendStatusError({
    status: upstream.status,
    data: upstream.data,
    fallbackMessage,
    routeName,
    requestRole: "primary",
  });
};

const requireSuccess = (
  upstream: AdminBackendJsonResult,
  routeName: string,
  fallbackMessage: string,
): void => {
  if (upstream.status !== 200) {
    throwImageStatusError(upstream, routeName, fallbackMessage);
  }
};

export async function archiveImage(params: ArchiveParams): Promise<void> {
  const routeName = "admin-image-archive";
  const upstream = await fetchAdminBackendJson(
    `${imagePath(params.imageType, params.imageId)}/archive`,
    {
      adminContext: params.adminContext,
      apiVersion: "v2",
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive: true, reason: params.reason ?? null }),
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName,
      requestRole: "primary",
    },
  );
  requireSuccess(upstream, routeName, "Failed to archive image.");
}

export async function unarchiveImage(
  params: Omit<ArchiveParams, "reason">,
): Promise<void> {
  const routeName = "admin-image-unarchive";
  const upstream = await fetchAdminBackendJson(
    `${imagePath(params.imageType, params.imageId)}/archive`,
    {
      adminContext: params.adminContext,
      apiVersion: "v2",
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive: false }),
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName,
      requestRole: "primary",
    },
  );
  requireSuccess(upstream, routeName, "Failed to unarchive image.");
}

export async function deleteImage(params: {
  imageType: ImageType;
  imageId: string;
  adminContext: VerifiedAdminContext;
}): Promise<void> {
  const routeName = "admin-image-delete";
  const upstream = await fetchAdminBackendJson(imagePath(params.imageType, params.imageId), {
    adminContext: params.adminContext,
    apiVersion: "v2",
    method: "DELETE",
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName,
    requestRole: "primary",
  });
  requireSuccess(upstream, routeName, "Failed to delete image.");
}

export async function reassignImage(params: ReassignParams): Promise<void> {
  const routeName = "admin-image-reassign";
  const upstream = await fetchAdminBackendJson(
    `${imagePath(params.imageType, params.imageId)}/reassign`,
    {
      adminContext: params.adminContext,
      apiVersion: "v2",
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to_entity_id: params.toEntityId,
        ...(params.toType ? { to_type: params.toType } : {}),
        mode: params.mode,
      }),
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName,
      requestRole: "primary",
    },
  );
  requireSuccess(upstream, routeName, "Failed to reassign image.");
}

export async function getImage(
  imageType: ImageType,
  imageId: string,
  options: { adminContext: VerifiedAdminContext },
): Promise<Record<string, unknown> | null> {
  const routeName = "admin-image-detail";
  const upstream = await fetchAdminBackendJson(imagePath(imageType, imageId), {
    adminContext: options.adminContext,
    apiVersion: "v2",
    timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
    routeName,
    requestRole: "primary",
  });
  if (upstream.status === 404) return null;
  if (upstream.status !== 200) {
    throwImageStatusError(upstream, routeName, "Failed to load image.");
  }
  if (!upstream.data.image || typeof upstream.data.image !== "object") {
    throw new AdminReadProxyError("Invalid image response from backend", 502, {
      code: "INVALID_BACKEND_RESPONSE",
      retryable: true,
      detail: { route: routeName },
    });
  }
  return upstream.data.image as Record<string, unknown>;
}
