const DEFAULT_GEMINI_IMAGE_MODELS = {
  flash: "gemini-3.1-flash-image-preview",
  pro: "gemini-3-pro-image-preview",
} as const;

const GEMINI_IMAGE_MODEL_ENV_KEYS = {
  flash: "GEMINI_FLASH_IMAGE_MODEL",
  pro: "GEMINI_PRO_IMAGE_MODEL",
} as const;

export type GeminiModelVariant = keyof typeof DEFAULT_GEMINI_IMAGE_MODELS;

export function resolveGeminiImageModel(
  modelVariant: GeminiModelVariant,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const configuredModel = env[GEMINI_IMAGE_MODEL_ENV_KEYS[modelVariant]]?.trim();
  return configuredModel || DEFAULT_GEMINI_IMAGE_MODELS[modelVariant];
}
