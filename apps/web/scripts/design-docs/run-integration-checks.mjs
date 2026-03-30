import { runDesignDocsIntegrationChecks } from "../../src/lib/admin/design-docs-pipeline-validators.ts";
import { parseArgs, writeJsonOutput } from "./_cli.mjs";

const args = parseArgs(process.argv.slice(2));
const result = await runDesignDocsIntegrationChecks();
await writeJsonOutput(args.output, result);
if (!result.passed) {
  process.exitCode = 1;
}
