export type NetworkStreamingEntityType = "network" | "streaming" | "production";

export const normalizeEntityKey = (name: string): string => name.trim().toLowerCase();

export const toEntitySlug = (nameOrKey: string): string =>
  normalizeEntityKey(nameOrKey)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const parseEntityType = (value: string): NetworkStreamingEntityType | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "network" || normalized === "streaming" || normalized === "production") {
    return normalized;
  }
  return null;
};
