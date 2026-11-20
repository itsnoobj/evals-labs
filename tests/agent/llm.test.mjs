import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { MODEL_F16, checkWebGpu } from "../../evals-lab/src/agent/llm.js";

// checkWebGpu only reads navigator.gpu, window.isSecureContext and location, so plain stubs are enough.
const MODEL_F32 = "Qwen2.5-1.5B-Instruct-q4f32_1-MLC";
const setGlobal = (name, value) =>
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true, enumerable: true });

function stub({ gpu, secure = true, origin = "http://192.168.1.5:8080", port = "8080" }) {
  setGlobal("navigator", { gpu });
  setGlobal("window", { isSecureContext: secure });
  setGlobal("location", { origin, port });
}
const adapterWith = (...features) => ({ features: new Set(features) });

test.afterEach(() => {
  mock.timers.reset();
});

test("model ids are the pinned Qwen2.5-1.5B q4 builds", () => {
  assert.equal(MODEL_F16, "Qwen2.5-1.5B-Instruct-q4f16_1-MLC");
});

test("no WebGPU on a secure page: says to use a recent browser or the recorded runs", async () => {
  stub({ gpu: undefined, secure: true });
  const r = await checkWebGpu();
  assert.equal(r.ok, false);
  assert.equal(r.modelId, MODEL_F16);
  assert.match(r.reason, /WebGPU/);
  assert.match(r.reason, /recorded runs/);
});

test("no WebGPU on an insecure page: tells the visitor to use localhost, with the real origin and port", async () => {
  stub({ gpu: undefined, secure: false, origin: "http://192.168.1.5:8080", port: "8080" });
  const r = await checkWebGpu();
  assert.equal(r.ok, false);
  assert.match(r.reason, /http:\/\/192\.168\.1\.5:8080/);
  assert.match(r.reason, /http:\/\/localhost:8080/);
});

test("insecure page with no port falls back to port 80", async () => {
  stub({ gpu: undefined, secure: false, origin: "http://example.test", port: "" });
  assert.match((await checkWebGpu()).reason, /http:\/\/localhost:80 /);
});

test("adapter with shader-f16 gets the f16 model", async () => {
  stub({ gpu: { requestAdapter: async () => adapterWith("shader-f16", "timestamp-query") } });
  assert.deepEqual(await checkWebGpu(), { ok: true, modelId: MODEL_F16 });
});

test("adapter without shader-f16 gets the f32 model", async () => {
  stub({ gpu: { requestAdapter: async () => adapterWith("timestamp-query") } });
  assert.deepEqual(await checkWebGpu(), { ok: true, modelId: MODEL_F32 });
  stub({ gpu: { requestAdapter: async () => adapterWith() } });
  assert.deepEqual(await checkWebGpu(), { ok: true, modelId: MODEL_F32 });
});

test("a null first adapter retries with high-performance power preference", async () => {
  const calls = [];
  stub({
    gpu: {
      requestAdapter: async (opts) => {
        calls.push(opts);
        return opts?.powerPreference === "high-performance" ? adapterWith("shader-f16") : null;
      },
    },
  });
  assert.deepEqual(await checkWebGpu(), { ok: true, modelId: MODEL_F16 });
  assert.deepEqual(calls, [undefined, { powerPreference: "high-performance" }]);
});

test("no adapter from either request reports no usable graphics chip", async () => {
  let calls = 0;
  stub({
    gpu: {
      requestAdapter: async () => {
        calls++;
        return null;
      },
    },
  });
  const r = await checkWebGpu();
  assert.equal(r.ok, false);
  assert.equal(calls, 2);
  assert.equal(r.modelId, MODEL_F16);
  assert.match(r.reason, /no adapter/);
});

test("requestAdapter throwing is reported with the error message", async () => {
  stub({
    gpu: {
      requestAdapter: async () => {
        throw new Error("driver crashed");
      },
    },
  });
  assert.deepEqual(await checkWebGpu(), {
    ok: false,
    reason: "WebGPU check failed: driver crashed",
    modelId: MODEL_F16,
  });
});

test("a hanging requestAdapter gives up after 5 seconds instead of freezing", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  stub({ gpu: { requestAdapter: () => new Promise(() => {}) } });
  const pending = checkWebGpu();
  mock.timers.tick(4999);
  let settled = false;
  pending.then(() => (settled = true));
  await Promise.resolve();
  assert.equal(settled, false, "still waiting at 4999 ms");
  mock.timers.tick(1);
  const r = await pending;
  assert.equal(r.ok, false);
  assert.equal(r.reason, "WebGPU check failed: requestAdapter timed out after 5 s");
});
