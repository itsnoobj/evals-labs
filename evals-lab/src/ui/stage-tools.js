// Example open-source tools for each box of the two flow diagrams (the 5-box "Start" flow and the wiring graph).
// URLs checked 2026-11-20 with: curl -sIL -m 15 -o /dev/null -w '%{http_code} %{url_effective}' <url>
// Every URL returned 200 after redirects. Three URLs below are the post-redirect addresses (renamed repos/docs).
// Pure data and strings, no DOM: runs in node (stage-tools.test.mjs) and in the browser.

const T = {
  hfDatasets: {
    name: "Hugging Face Datasets",
    url: "https://github.com/huggingface/datasets",
    what: "Load, share and version test data sets in a few lines of Python.",
  },
  labelStudio: {
    name: "Label Studio",
    url: "https://github.com/HumanSignal/label-studio",
    what: "Web tool where people label data and write the correct answers.",
  },
  argilla: {
    name: "Argilla",
    url: "https://github.com/argilla-io/argilla",
    what: "Web tool to review model outputs and build answer-key data sets together.",
  },
  langfuse: {
    name: "Langfuse",
    url: "https://github.com/langfuse/langfuse",
    what: "Saves every model call as a trace you can search, replay and score.",
  },
  langfuseData: {
    name: "Langfuse datasets",
    url: "https://langfuse.com/docs/evaluation/experiments/datasets",
    what: "Keep a fixed list of questions and expected answers, and run tests on it.",
  },
  promptfoo: {
    name: "Promptfoo",
    url: "https://github.com/promptfoo/promptfoo",
    what: "Run test cases against prompts and models, and compare the results.",
  },
  promptfooRubric: {
    name: "Promptfoo llm-rubric",
    url: "https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/llm-rubric/",
    what: "A check where a second model grades the answer against your written rule.",
  },
  promptfooAction: {
    name: "promptfoo-action",
    url: "https://github.com/promptfoo/promptfoo-action",
    what: "GitHub Action that runs your prompt tests on each pull request.",
  },
  dspy: {
    name: "DSPy",
    url: "https://github.com/stanfordnlp/dspy",
    what: "Write the prompt as code and let it search for a better wording using your data.",
  },
  guidance: {
    name: "Guidance",
    url: "https://github.com/guidance-ai/guidance",
    what: "Mix fixed text and model output in one program, with rules on the output shape.",
  },
  deepeval: {
    name: "DeepEval",
    url: "https://github.com/confident-ai/deepeval",
    what: "Write checks for model output as normal Python tests.",
  },
  deepevalGeval: {
    name: "DeepEval G-Eval",
    url: "https://deepeval.com/docs/metrics-llm-evals",
    what: "A model grades an answer from your own criteria and gives a score.",
  },
  deepevalCi: {
    name: "DeepEval in CI",
    url: "https://deepeval.com/docs/evaluation-unit-testing-in-ci-cd",
    what: "Run the model tests in your build and fail the build when they fail.",
  },
  inspect: {
    name: "Inspect AI",
    url: "https://github.com/UKGovernmentBEIS/inspect_ai",
    what: "Framework to write, run and log model tests, with code and model graders.",
  },
  inspectScorers: {
    name: "Inspect AI scorers",
    url: "https://inspect.aisi.org.uk/scorers.html",
    what: "Built-in graders, including one where a second model marks the answer.",
  },
  pytest: {
    name: "pytest",
    url: "https://github.com/pytest-dev/pytest",
    what: "Plain Python test runner. A failing test can block the release.",
  },
  outlines: {
    name: "Outlines",
    url: "https://github.com/dottxt-ai/outlines",
    what: "Forces the model to produce text that matches a given shape, such as JSON.",
  },
  xgrammar: {
    name: "XGrammar",
    url: "https://github.com/mlc-ai/xgrammar",
    what: "Fast engine that blocks any model token that would break the required format.",
  },
  litellm: {
    name: "LiteLLM",
    url: "https://github.com/BerriAI/litellm",
    what: "One call style for many models, with retries and a backup model.",
  },
  pydanticAi: {
    name: "Pydantic AI",
    url: "https://github.com/pydantic/pydantic-ai",
    what: "Agent library where tools and answers have typed, checked inputs and outputs.",
  },
  langgraph: {
    name: "LangGraph",
    url: "https://github.com/langchain-ai/langgraph",
    what: "Build an agent as a graph of steps, with branches and retries.",
  },
  smolagents: {
    name: "smolagents",
    url: "https://github.com/huggingface/smolagents",
    what: "Small library for agents that call tools in a loop.",
  },
  instructor: {
    name: "Instructor",
    url: "https://github.com/567-labs/instructor",
    what: "Get checked, typed data back from a model, and retry when the check fails.",
  },
  pydantic: {
    name: "Pydantic",
    url: "https://github.com/pydantic/pydantic",
    what: "Describe the allowed shape of data and reject anything that does not fit.",
  },
  guardrailsAi: {
    name: "Guardrails AI",
    url: "https://github.com/guardrails-ai/guardrails",
    what: "Add input and output rules around a model call, and act when one fails.",
  },
  nemo: {
    name: "NVIDIA NeMo Guardrails",
    url: "https://github.com/NVIDIA-NeMo/Guardrails",
    what: "Write rules for what a chatbot may discuss and how it must refuse.",
  },
  llmGuard: {
    name: "LLM Guard",
    url: "https://github.com/protectai/llm-guard",
    what: "Scanners for prompt injection, secrets and unsafe text, on input and output.",
  },
  presidio: {
    name: "Presidio",
    url: "https://github.com/data-privacy-stack/presidio",
    what: "Finds and masks card numbers, phone numbers and other personal data in text.",
  },
  tenacity: {
    name: "Tenacity",
    url: "https://github.com/jd/tenacity",
    what: "Python decorator that retries a failing call, with waits between tries.",
  },
  phoenix: {
    name: "Arize Phoenix",
    url: "https://github.com/Arize-ai/phoenix",
    what: "Local app to view model traces and run evaluations on them.",
  },
  otel: {
    name: "OpenTelemetry",
    url: "https://github.com/open-telemetry/opentelemetry-python",
    what: "Standard way to record traces from your code and send them to any viewer.",
  },
  openllmetry: {
    name: "OpenLLMetry",
    url: "https://github.com/traceloop/openllmetry",
    what: "OpenTelemetry add-on that records model calls and tool calls automatically.",
  },
  mlflow: {
    name: "MLflow",
    url: "https://github.com/mlflow/mlflow",
    what: "Tracks runs, scores and traces, and shows them side by side.",
  },
};

const pick = (...keys) => keys.map((k) => T[k]);

export const STAGE_TOOLS = {
  // Start flow (5 boxes)
  question: pick("hfDatasets", "promptfoo", "langfuseData"),
  classify: pick("pydanticAi", "smolagents", "instructor"),
  rank: pick("pydanticAi", "langgraph", "smolagents"),
  answer: pick("instructor", "outlines", "pydanticAi"),
  checks: pick("promptfoo", "deepeval", "inspect"),
  // Wiring graph: build
  dataset: pick("hfDatasets", "labelStudio", "argilla"),
  key: pick("labelStudio", "argilla", "langfuseData", "hfDatasets"),
  prompt: pick("dspy", "promptfoo", "guidance"),
  bar: pick("promptfoo", "inspect", "pytest"),
  // Wiring graph: live run
  ask: pick("promptfoo", "langfuseData"),
  model: pick("outlines", "xgrammar", "guidance", "litellm"),
  t1: pick("pydanticAi", "smolagents", "langgraph"),
  c1: pick("pydantic", "instructor", "guardrailsAi"),
  t2: pick("pydanticAi", "langgraph", "smolagents"),
  c2: pick("pydantic", "guardrailsAi", "instructor"),
  draft: pick("outlines", "instructor", "guidance"),
  c3: pick("guardrailsAi", "nemo", "llmGuard"),
  // Wiring graph: branches
  retry: pick("tenacity", "instructor", "litellm"),
  fallback: pick("litellm", "tenacity", "langgraph"),
  refuse: pick("nemo", "guardrailsAi", "llmGuard"),
  // Wiring graph: after the run
  trace: pick("langfuse", "phoenix", "otel", "openllmetry"),
  eval: pick("promptfoo", "deepeval", "inspect"),
  judge: pick("deepevalGeval", "promptfooRubric", "inspectScorers"),
  card: pick("mlflow", "langfuse", "promptfoo"),
  gate: pick("promptfooAction", "deepevalCi", "pytest"),
  // Guardrails (nodes added later)
  guard: pick("llmGuard", "nemo", "guardrailsAi"),
  guard_out: pick("presidio", "guardrailsAi", "llmGuard"),
};

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

export function toolsHtml(id) {
  const tools = Object.hasOwn(STAGE_TOOLS, id) ? STAGE_TOOLS[id] : null;
  if (!tools?.length) return "";
  const items = tools
    .map(
      (t) =>
        `<li><a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">${esc(t.name)}</a> <span class="muted">${esc(t.what)}</span></li>`,
    )
    .join("");
  return `<details class="stage-tools"><summary>Open-source tools for this step (${tools.length})</summary><ul>${items}</ul><p class="muted">Examples, not a recommendation. Check the licence yourself.</p></details>`;
}
