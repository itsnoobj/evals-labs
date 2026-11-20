// Run: node --test tests/ui/ask-row.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  askState,
  runLine,
  shortModelName,
  PICK_FIRST,
  PICK_ANOTHER,
  BUSY,
  NOT_READY,
} from "../../evals-lab/src/ui/ask-row.js";

test("nothing picked: disabled, reason says pick a question first", () => {
  assert.deepEqual(askState({}), { disabled: true, reason: "Pick a question first." });
  assert.equal(PICK_FIRST, "Pick a question first.");
});

test("a question is picked: enabled, no reason", () => {
  assert.deepEqual(askState({ picked: "C03" }), { disabled: false, reason: "" });
});

test("a question is typed: enabled; spaces alone do not count", () => {
  assert.deepEqual(askState({ typed: "Paying BESCOM" }), { disabled: false, reason: "" });
  assert.equal(askState({ typed: "   " }).disabled, true);
});

test("after a run with nothing picked: disabled, reason says pick another", () => {
  assert.deepEqual(askState({ ran: true }), { disabled: true, reason: "Pick another question to ask again." });
  assert.equal(PICK_ANOTHER, "Pick another question to ask again.");
  assert.equal(askState({ ran: true, picked: "C02" }).disabled, false);
});

test("busy and not ready win over a picked question, and say why", () => {
  assert.deepEqual(askState({ picked: "C03", busy: true }), { disabled: true, reason: BUSY });
  assert.deepEqual(askState({ picked: "C03", ready: false }), { disabled: true, reason: NOT_READY });
});

test("model name is shortened for the line", () => {
  assert.equal(shortModelName("Qwen2.5-1.5B-Instruct-q4f16_1-MLC"), "Qwen2.5-1.5B");
  assert.equal(shortModelName(undefined), "");
});

test("run line: recorded runs, with a button to switch to live", () => {
  const r = runLine({ kind: "replay" });
  assert.equal(r.text, "Running on: recorded runs (real answers saved earlier).");
  assert.deepEqual(r.button, { action: "live", label: "Use the live AI instead (about 880 MB)" });
});

test("run line: live AI, with a button back to recorded runs", () => {
  const r = runLine({ kind: "ready", modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC" });
  assert.equal(r.text, "Running on: live AI (Qwen2.5-1.5B).");
  assert.deepEqual(r.button, { action: "replay", label: "Use recorded runs" });
});

test("run line: loading shows the percent and no button", () => {
  assert.deepEqual(runLine({ kind: "loading", pct: 40 }), { text: "Loading the live AI: 40%.", button: null });
});

test("run line: a failed live load while on recorded runs says so and keeps the recorded line", () => {
  const r = runLine({ kind: "not-loaded", mode: "replay", failed: true });
  assert.equal(r.text, "The live AI did not load. Running on: recorded runs (real answers saved earlier).");
  assert.equal(r.button.action, "live");
});

test("run line: recorded runs could not be read, or are still starting", () => {
  assert.match(runLine({ kind: "not-loaded", recordedFailed: true }).text, /Recorded runs did not load/);
  assert.equal(runLine({ kind: "not-loaded", recordedFailed: true }).button.action, "live");
  const start = runLine({ kind: "not-loaded" });
  assert.match(start.text, /^Starting recorded runs/);
  assert.equal(start.button, null);
});
