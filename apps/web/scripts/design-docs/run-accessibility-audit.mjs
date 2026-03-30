import { readFile } from "node:fs/promises";

import { auditResponsiveAccessibility } from "../../src/lib/admin/design-docs-pipeline-validators.ts";
import { parseArgs, writeJsonOutput } from "./_cli.mjs";

const args = parseArgs(process.argv.slice(2));
const articleId = args["article-id"];
const brandSlug = args["brand-slug"];
const filesArg = args.files;

if (!articleId || typeof articleId !== "string") {
  throw new Error("Missing required --article-id argument");
}

if (!brandSlug || typeof brandSlug !== "string") {
  throw new Error("Missing required --brand-slug argument");
}

if (!filesArg || typeof filesArg !== "string") {
  throw new Error("Missing required --files argument");
}

const filePaths = filesArg.split(",").map((entry) => entry.trim()).filter(Boolean);
const fileSources = await Promise.all(
  filePaths.map(async (filePath) => ({
    path: filePath,
    content: await readFile(filePath, "utf8"),
  })),
);

const result = auditResponsiveAccessibility({ articleId, brandSlug, fileSources });
await writeJsonOutput(args.output, result);
if (!result.passed) {
  process.exitCode = 1;
}
