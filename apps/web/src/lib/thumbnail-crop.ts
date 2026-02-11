export type ThumbnailCropMode = "manual" | "auto";

export interface ThumbnailCrop {
  x: number;
  y: number;
  zoom: number;
  mode: ThumbnailCropMode;
}

export interface ThumbnailViewportRect {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}

export const THUMBNAIL_DEFAULTS = Object.freeze({
  x: 50,
  y: 32,
  zoom: 1,
});

export const THUMBNAIL_CROP_LIMITS = Object.freeze({
  xMin: 0,
  xMax: 100,
  yMin: 0,
  yMax: 100,
  zoomMin: 1,
  zoomMax: 4,
});

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

export function isThumbnailCropMode(value: unknown): value is ThumbnailCropMode {
  return value === "manual" || value === "auto";
}

export function isThumbnailCropWithinRange(crop: ThumbnailCrop): boolean {
  return (
    crop.x >= THUMBNAIL_CROP_LIMITS.xMin &&
    crop.x <= THUMBNAIL_CROP_LIMITS.xMax &&
    crop.y >= THUMBNAIL_CROP_LIMITS.yMin &&
    crop.y <= THUMBNAIL_CROP_LIMITS.yMax &&
    crop.zoom >= THUMBNAIL_CROP_LIMITS.zoomMin &&
    crop.zoom <= THUMBNAIL_CROP_LIMITS.zoomMax
  );
}

export function clampThumbnailCrop(crop: ThumbnailCrop): ThumbnailCrop {
  return {
    x: clamp(crop.x, THUMBNAIL_CROP_LIMITS.xMin, THUMBNAIL_CROP_LIMITS.xMax),
    y: clamp(crop.y, THUMBNAIL_CROP_LIMITS.yMin, THUMBNAIL_CROP_LIMITS.yMax),
    zoom: clamp(crop.zoom, THUMBNAIL_CROP_LIMITS.zoomMin, THUMBNAIL_CROP_LIMITS.zoomMax),
    mode: crop.mode,
  };
}

export function parseThumbnailCrop(
  value: unknown,
  options?: { clamp?: boolean },
): ThumbnailCrop | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const mode = record.mode;
  const x = toFiniteNumber(record.x);
  const y = toFiniteNumber(record.y);
  const zoom = toFiniteNumber(record.zoom);

  if (!isThumbnailCropMode(mode) || x === null || y === null || zoom === null) {
    return null;
  }

  const parsed: ThumbnailCrop = { x, y, zoom, mode };
  if (options?.clamp ?? true) {
    return clampThumbnailCrop(parsed);
  }

  return isThumbnailCropWithinRange(parsed) ? parsed : null;
}

export function resolveAutoThumbnailFocus(
  width: number | null | undefined,
  height: number | null | undefined,
): { x: number; y: number } {
  if (typeof width === "number" && Number.isFinite(width) && typeof height === "number" && Number.isFinite(height)) {
    if (width > height) {
      return { x: THUMBNAIL_DEFAULTS.x, y: 35 };
    }
    return { x: THUMBNAIL_DEFAULTS.x, y: 30 };
  }

  return { x: THUMBNAIL_DEFAULTS.x, y: THUMBNAIL_DEFAULTS.y };
}

function isLandscape(width: number | null | undefined, height: number | null | undefined): boolean | null {
  if (
    typeof width === "number" &&
    Number.isFinite(width) &&
    typeof height === "number" &&
    Number.isFinite(height)
  ) {
    return width > height;
  }
  return null;
}

export function resolveThumbnailPresentation(params: {
  width: number | null | undefined;
  height: number | null | undefined;
  peopleCount?: number | null;
  crop?: ThumbnailCrop | null;
}): {
  objectPosition: string;
  zoom: number;
  mode: ThumbnailCropMode;
} {
  const crop = params.crop;
  if (crop && (crop.mode === "manual" || crop.mode === "auto")) {
    const normalized = clampThumbnailCrop(crop);
    return {
      objectPosition: `${normalized.x}% ${normalized.y}%`,
      zoom: normalized.zoom,
      mode: normalized.mode,
    };
  }

  const autoFocus = resolveAutoThumbnailFocus(params.width, params.height);
  const landscape = isLandscape(params.width, params.height);
  const isSolo = params.peopleCount === 1;
  const autoY = isSolo
    ? landscape === true
      ? 32
      : landscape === false
        ? 28
        : 30
    : autoFocus.y;
  const autoZoom = isSolo
    ? landscape === true
      ? 1.12
      : 1.1
    : THUMBNAIL_DEFAULTS.zoom;
  return {
    objectPosition: `${autoFocus.x}% ${autoY}%`,
    zoom: clamp(autoZoom, THUMBNAIL_CROP_LIMITS.zoomMin, THUMBNAIL_CROP_LIMITS.zoomMax),
    mode: "auto",
  };
}

export function resolveThumbnailViewportRect(params: {
  imageWidth: number | null | undefined;
  imageHeight: number | null | undefined;
  focusX: number;
  focusY: number;
  zoom: number;
  aspectRatio?: number;
}): ThumbnailViewportRect | null {
  const imageWidth = params.imageWidth;
  const imageHeight = params.imageHeight;
  if (
    typeof imageWidth !== "number" ||
    !Number.isFinite(imageWidth) ||
    imageWidth <= 0 ||
    typeof imageHeight !== "number" ||
    !Number.isFinite(imageHeight) ||
    imageHeight <= 0
  ) {
    return null;
  }

  const thumbnailAspect = (() => {
    const value = params.aspectRatio;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
    return 4 / 5;
  })();

  const imageAspect = imageWidth / imageHeight;
  const baseVisibleWidth =
    imageAspect > thumbnailAspect ? imageHeight * thumbnailAspect : imageWidth;
  const baseVisibleHeight =
    imageAspect > thumbnailAspect ? imageHeight : imageWidth / thumbnailAspect;

  const zoom = clamp(
    Number.isFinite(params.zoom) ? params.zoom : THUMBNAIL_DEFAULTS.zoom,
    THUMBNAIL_CROP_LIMITS.zoomMin,
    THUMBNAIL_CROP_LIMITS.zoomMax,
  );

  const visibleWidth = baseVisibleWidth / zoom;
  const visibleHeight = baseVisibleHeight / zoom;
  const maxLeft = Math.max(0, imageWidth - visibleWidth);
  const maxTop = Math.max(0, imageHeight - visibleHeight);

  const centerX = (clamp(params.focusX, 0, 100) / 100) * imageWidth;
  const centerY = (clamp(params.focusY, 0, 100) / 100) * imageHeight;
  const left = clamp(centerX - visibleWidth / 2, 0, maxLeft);
  const top = clamp(centerY - visibleHeight / 2, 0, maxTop);

  return {
    leftPct: (left / imageWidth) * 100,
    topPct: (top / imageHeight) * 100,
    widthPct: (visibleWidth / imageWidth) * 100,
    heightPct: (visibleHeight / imageHeight) * 100,
  };
}
