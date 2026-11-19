// Parses every .js and .mjs file in evals-lab/src, tests and scripts with `node --check`. Catches syntax errors without running anything.
// Usage: npm run check
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const files = ["evals-lab/src", "tests", "scripts"]
  .flatMap((dir) => readdirSync(join(root, dir), { recursive: true }).map((f) => join(root, dir, f)))
  .filter((f) => /\.m?js$/.test(f));

const failed = files.filter((f) => {
  const { status, stderr } = spawnSync(process.execPath, ["--check", f], { encoding: "utf8" });
  if (status !== 0) console.error(stderr);
  return status !== 0;
});
console.log(failed.length ? `${failed.length} of ${files.length} files have syntax errors` : `${files.length} files OK`);
process.exit(failed.length ? 1 : 0);
