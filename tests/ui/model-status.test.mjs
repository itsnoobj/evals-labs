// Run: node --test tests/ui/model-status.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { modelStatusHtml } from "../../evals-lab/src/ui/model-status.js";

const text = (html) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

test("not loaded: words, hollow square, LOAD button with the size", () => {
  const h = modelStatusHtml({ kind: "not-loaded", hasRecorded: true });
  assert.equal(text(h), "AI: not loaded · LOAD (about 880 MB)");
  assert.match(h, /data-mstat="load"/);
  assert.match(h, /class="sq "/);
  assert.ok(!h.includes("mstat-bar"));
});

test("not loaded on an insecure page: LOAD is disabled and says why", () => {
  const h = modelStatusHtml({ kind: "not-loaded", secure: false });
  assert.match(h, /data-mstat="load" disabled/);
  assert.match(text(h), /Needs https or localhost/);
});

test("loading: the percent in words, a progress bar with the same number, no button", () => {
  const h = modelStatusHtml({ kind: "loading", pct: 43 });
  assert.equal(text(h), "AI: loading 43%");
  assert.match(h, /role="progressbar"[^>]*aria-valuenow="43"/);
  assert.match(h, /--w:43%/);
  assert.ok(!h.includes("<button"));
});

test("loading percent is clamped and rounded", () => {
  assert.match(modelStatusHtml({ kind: "loading", pct: 142.6 }), /loading 100%/);
  assert.match(modelStatusHtml({ kind: "loading", pct: -5 }), /loading 0%/);
  assert.match(modelStatusHtml({ kind: "loading", pct: "x" }), /loading 0%/);
});

test("ready: short model name, filled square", () => {
  const h = modelStatusHtml({ kind: "ready", modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC" });
  assert.equal(text(h), "AI: ready · Qwen2.5-1.5B runs in your browser");
  assert.match(h, /class="sq ok"/);
});

test("load failed: short escaped reason, offers recorded runs", () => {
  const h = modelStatusHtml({ kind: "not-loaded", error: `no <adapter> ${"x".repeat(200)}`, hasRecorded: true });
  assert.ok(text(h).startsWith("AI: load failed · no &lt;adapter&gt; xxx"));
  assert.ok(text(h).includes("use recorded runs"));
  assert.ok(!h.includes("<adapter>"));
  assert.match(h, /data-mstat="replay"/);
  assert.ok(text(h).length < 200, "reason is cut short");
});

test("load failed while recorded runs already run: says so, no button", () => {
  const h = modelStatusHtml({ kind: "replay", error: "out of memory", hasRecorded: true });
  assert.equal(text(h), "AI: load failed · out of memory · using recorded runs");
  assert.ok(!h.includes("<button"));
});

test("recorded runs in use: says no AI is loaded, can offer LOAD", () => {
  const h = modelStatusHtml({ kind: "replay", hasRecorded: true });
  assert.ok(text(h).startsWith("Using recorded runs (no AI loaded)"));
  assert.match(h, /data-mstat="load"/);
  assert.ok(!modelStatusHtml({ kind: "replay", secure: false }).includes("<button"));
});

test("recorded runs in use after the AI was loaded: does not claim nothing is loaded", () => {
  const h = modelStatusHtml({ kind: "replay", hadLive: true });
  assert.match(text(h), /AI loaded, not in use/);
  assert.ok(!text(h).includes("no AI loaded"));
});

test("every state has words (never colour alone)", () => {
  for (const kind of ["not-loaded", "loading", "ready", "replay"]) {
    assert.match(text(modelStatusHtml({ kind })), /[A-Za-z]{4}/);
  }
});
