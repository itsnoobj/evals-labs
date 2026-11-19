// Run: node tests/scripts/serve.test.mjs
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { resolveSafe } from "../../scripts/serve.mjs";

const root = resolve("/srv/site");

assert.equal(resolveSafe(root, "/index.html"), resolve(root, "index.html"));
assert.equal(resolveSafe(root, "/"), resolve(root, "index.html"));
assert.equal(resolveSafe(root, "/src/app/main.js?v=2"), resolve(root, "src/app/main.js"));
assert.equal(resolveSafe(root, "/data/recorded-runs.json#x"), resolve(root, "data/recorded-runs.json"));

for (const attack of ["/../package.json", "/..", "/%2e%2e/package.json", "/%2E%2E%2Fpackage.json", "/src/../../package.json", "/%00", "/%E0%A4%A"]) {
  assert.equal(resolveSafe(root, attack), null, `must reject ${attack}`);
}
// A sibling directory that merely starts with the root's name is outside the root.
assert.equal(resolveSafe(root, "/../site-secrets/key"), null);

console.log("serve: all checks passed");
