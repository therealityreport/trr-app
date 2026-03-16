export function isCastScreentimeAdminEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = (env.TRR_CAST_SCREENTIME_ADMIN_ENABLED ?? "").trim().toLowerCase();
  if (!raw) return true;
  return !["0", "false", "off", "disabled", "no"].includes(raw);
}
