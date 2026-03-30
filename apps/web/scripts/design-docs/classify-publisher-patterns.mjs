import { classifyPublisherPatterns } from "../../src/lib/admin/design-docs-pipeline.ts";
import { parseArgs, readRequiredFile, writeJsonOutput } from "./_cli.mjs";

const args = parseArgs(process.argv.slice(2));
const articleUrl = args["article-url"];
if (!articleUrl || typeof articleUrl !== "string") {
  throw new Error("Missing required --article-url argument");
}

const sourceHtml = await readRequiredFile(args["source-html-path"], "source-html-path");
const result = classifyPublisherPatterns({ articleUrl, sourceHtml });
await writeJsonOutput(args.output, result);
