// WebLLM in a Web Worker, behind the one-function `chat` interface that agent-step.js expects.
// The model and settings come from benchmarks/RESULTS.md: Qwen2.5-1.5B is the only tiny model that lands in the 30-80% band.
const WEBLLM_VERSION = "0.2.79"; // pinned: the schema behaviour (anyOf, not oneOf) was measured on this version
const WEBLLM_URL = `https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@${WEBLLM_VERSION}/+esm`;

export const MODEL_F16 = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC"; // about 880 MB download, about 1.6 GB GPU memory
const MODEL_F32 = "Qwen2.5-1.5B-Instruct-q4f32_1-MLC"; // for GPUs without the shader-f16 feature (about 1.9 GB GPU memory)

// Tells the UI what this browser can do before the visitor clicks anything. Advisory only: the Load button stays enabled,
// because a wrong "no" here would block a browser where WebLLM would have worked.
export async function checkWebGpu() {
  if (!navigator.gpu) {
    const reason = window.isSecureContext
      ? "This browser cannot use your graphics chip for AI (WebGPU). Try a recent Chrome or Edge, or use the recorded runs."
      : `The AI needs a page opened as localhost or https. You opened ${location.origin}; use http://localhost:${location.port || 80} instead.`;
    return { ok: false, reason, modelId: MODEL_F16 };
  }
  try {
    // requestAdapter can hang on some drivers; a hang must not freeze the page, so give up after 5 s.
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("requestAdapter timed out after 5 s")), 5000),
    );
    const adapter = await Promise.race([
      timeout,
      (async () =>
        (await navigator.gpu.requestAdapter()) ??
        (await navigator.gpu.requestAdapter({ powerPreference: "high-performance" })))(),
    ]);
    if (!adapter)
      return {
        ok: false,
        reason: "Your browser reports no usable graphics chip for AI (WebGPU found no adapter).",
        modelId: MODEL_F16,
      };
    return { ok: true, modelId: adapter.features.has("shader-f16") ? MODEL_F16 : MODEL_F32 };
  } catch (err) {
    return { ok: false, reason: `WebGPU check failed: ${err.message}`, modelId: MODEL_F16 };
  }
}

// Returns { chat, unload }. onProgress gets (fraction 0..1, text).
export async function loadModel(modelId, onProgress) {
  const webllm = await import(WEBLLM_URL);
  // A Blob worker keeps inference off the UI thread without needing a separate worker file to host.
  const code = `import { WebWorkerMLCEngineHandler } from "${WEBLLM_URL}";
    const handler = new WebWorkerMLCEngineHandler();
    self.onmessage = (msg) => handler.onmessage(msg);`;
  const worker = new Worker(URL.createObjectURL(new Blob([code], { type: "text/javascript" })), { type: "module" });
  const engine = await webllm.CreateWebWorkerMLCEngine(worker, modelId, {
    initProgressCallback: (p) => onProgress?.(p.progress ?? 0, p.text ?? ""),
  });

  async function chat({ messages, temperature, seed, max_tokens, response_format }) {
    const t0 = performance.now();
    const reply = await engine.chat.completions.create({
      messages,
      temperature,
      seed,
      max_tokens,
      ...(response_format ? { response_format } : {}),
    });
    return {
      text: reply.choices[0].message.content ?? "",
      tokens: reply.usage?.completion_tokens ?? 0,
      ms: Math.round(performance.now() - t0),
    };
  }
  return {
    chat,
    modelId,
    unload: async () => {
      await engine.unload();
      worker.terminate();
    },
  };
}
