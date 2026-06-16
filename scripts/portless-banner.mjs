#!/usr/bin/env node

const urls = [
  ["TRR-APP", process.env.PORTLESS_APP_URL || "https://trr.localhost"],
  ["TRR-APP Admin", `${process.env.PORTLESS_ADMIN_URL || "https://admin.trr.localhost"}/admin`],
  ["TRR-Backend", `${process.env.TRR_API_URL || "https://api.trr.localhost"}/health/live`],
];

console.log("[workspace] Portless clean URLs:");
for (const [label, url] of urls) {
  console.log(`  ${label.padEnd(14)} ${url}`);
}
