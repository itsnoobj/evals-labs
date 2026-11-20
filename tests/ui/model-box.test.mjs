import { test } from "node:test";
import assert from "node:assert/strict";
import { modelBoxes } from "../../evals-lab/src/ui/model-box.js";

test("nothing chosen: Live AI says Not loaded, Recorded runs says Available, neither is in use", () => {
  const b = modelBoxes({ kind: "not-loaded", hasRecorded: true });
  assert.deepEqual(b.live, { status: "not-loaded", label: "Not loaded", inUse: false });
  assert.deepEqual(b.replay, { status: "not-loaded", label: "Available", inUse: false });
});

test("loading shows the percent in words", () => {
  assert.equal(modelBoxes({ kind: "loading", pct: 40 }).live.label, "Loading 40%");
});

test("live model in use: only the Live AI box is in use", () => {
  const b = modelBoxes({ kind: "ready", hasRecorded: true });
  assert.deepEqual(b.live, { status: "ready", label: "Ready (live model)", inUse: true });
  assert.equal(b.replay.inUse, false);
  assert.equal(b.replay.label, "Available");
});

test("recorded runs in use: only the Recorded runs box is in use", () => {
  const b = modelBoxes({ kind: "replay", hasRecorded: true });
  assert.deepEqual(b.replay, { status: "ready", label: "In use", inUse: true });
  assert.equal(b.live.inUse, false);
  assert.equal(b.live.label, "Not loaded");
  assert.equal(modelBoxes({ kind: "replay", hadLive: true }).live.label, "Loaded, not in use");
});

test("failed load keeps its words; recorded runs that did not load say Not available", () => {
  const b = modelBoxes({ kind: "not-loaded", label: "Load failed" });
  assert.equal(b.live.label, "Load failed");
  assert.equal(b.replay.label, "Not available");
});

test("live AI chosen, not loaded yet: the Live AI box is IN USE and says it loads on first use", () => {
  const b = modelBoxes({ kind: "not-loaded", hasRecorded: true, selected: "live" });
  assert.deepEqual(b.live, { status: "not-loaded", label: "Not loaded yet, loads on first use", inUse: true });
  assert.deepEqual(b.replay, { status: "not-loaded", label: "Available", inUse: false });
});

test("a failed load is never IN USE, even when live was chosen; recorded runs stay Available", () => {
  const b = modelBoxes({ kind: "not-loaded", label: "Load failed", hasRecorded: true, selected: "live" });
  assert.deepEqual(b.live, { status: "not-loaded", label: "Load failed", inUse: false });
  assert.equal(b.replay.label, "Available");
});

test("recorded runs in use wins over a stale live choice", () => {
  const b = modelBoxes({ kind: "replay", hasRecorded: true, selected: "" });
  assert.equal(b.live.inUse, false);
  assert.equal(b.replay.inUse, true);
});
