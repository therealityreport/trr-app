import { auditGeneratedConfigIntegrity } from "../../src/lib/admin/design-docs-pipeline-validators.ts";
import { parseArgs, writeJsonOutput } from "./_cli.mjs";

const args = parseArgs(process.argv.slice(2));
const articleId = args["article-id"];
if (!articleId || typeof articleId !== "string") {
  throw new Error("Missing required --article-id argument");
}

const result = await auditGeneratedConfigIntegrity({ articleId });
await writeJsonOutput(args.output, result);
if (!result.passed) {
  process.exitCode = 1;
}
