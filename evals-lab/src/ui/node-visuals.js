// Flat square pictograms for the wiring nodes (one per node id), plus a small "IN -> OUT" strip.
// Pure strings, no DOM. Every picture is aria-hidden and has a visible caption under it, so it is never image-only.
// Style: 64 x 64, 2 px stroke in currentColor, no fill, square ends. Spec: docs/specs/ui-style.md

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// Building blocks (shared by several nodes)
const docLines = (x = 14, y = 8, dash = "") =>
  `<rect x="${x}" y="${y}" width="36" height="48"${dash ? ` stroke-dasharray="${dash}"` : ""}/>` +
  `<path d="M${x + 8} ${y + 14}h20M${x + 8} ${y + 24}h20M${x + 8} ${y + 34}h12"/>`;
const tick = (x, y) => `<path d="M${x} ${y + 8}l7 7l13 -16"/>`;
const arrowR = (x, y, len) => `<path d="M${x} ${y}h${len}M${x + len - 7} ${y - 6}l7 6l-7 6"/>`;

const SHAPES = {
  funnel: `<path d="M8 10h48L38 32v20l-12 -6V32z"/>`,
  docTick: docLines() + tick(32, 36),
  docPencil: docLines() + `<path d="M34 56l-2 -8l16 -16l8 8l-16 16z"/>`,
  checklist:
    `<rect x="8" y="8" width="12" height="12"/><rect x="8" y="26" width="12" height="12"/><rect x="8" y="44" width="12" height="12"/>` +
    `<path d="M28 14h28M28 32h28M28 50h28"/>` +
    `<path d="M11 14l3 3l4 -6"/>`,
  threshold: `<path d="M8 56V8M8 56h50"/><rect x="16" y="30" width="10" height="26"/><rect x="32" y="16" width="10" height="40"/><rect x="48" y="38" width="8" height="18"/><path d="M8 24h50" stroke-dasharray="4 3"/>`,
  question: `<path d="M8 10h48v32H30l-10 10V42H8z"/><path d="M18 20h28M18 30h16"/>`,
  shield: `<path d="M32 6l22 8v20L32 58L10 34V14z"/>${tick(21, 20)}`,
  gear:
    `<rect x="20" y="20" width="24" height="24"/><rect x="27" y="27" width="10" height="10"/>` +
    `<path d="M28 8h8v12h-8zM28 44h8v12h-8zM8 28h12v8H8zM44 28h12v8H44z"/>`,
  wrench: `<path transform="rotate(-45 32 32)" d="M6 28H38V20H58V27H48V37H58V44H38V36H6Z"/>`,
  tickBox: `<rect x="10" y="10" width="44" height="44"/><path d="M20 32l9 9l16 -20"/>`,
  tickBoxIn: `<rect x="26" y="10" width="32" height="44"/><path d="M33 32l6 6l11 -14"/>${arrowR(4, 32, 16)}`,
  docDraft: docLines(14, 8, "4 3"),
  arrowOut: `<path d="M6 12h40v28H24l-10 10V40H6z"/>${arrowR(38, 26, 22)}`,
  retry: `<path d="M46 18H16v28h32v-12"/><path d="M40 12l8 6l-8 6"/>`,
  fallback: `<path d="M32 6v20"/><path d="M32 26l-18 0v24" /><path d="M32 26h18v24"/><path d="M8 44l6 8l6 -8"/><path d="M44 44l6 8l6 -8"/>`,
  refuse: `<rect x="10" y="10" width="44" height="44"/><path d="M10 10l44 44"/>`,
  trace: `<path d="M16 6v52"/><rect x="10" y="10" width="12" height="8"/><rect x="10" y="28" width="12" height="8"/><rect x="10" y="46" width="12" height="8"/><path d="M28 14h28M28 32h20M28 50h26"/>`,
  eight:
    `<rect x="6" y="14" width="10" height="16"/><rect x="20" y="14" width="10" height="16"/><rect x="34" y="14" width="10" height="16"/><rect x="48" y="14" width="10" height="16"/>` +
    `<rect x="6" y="36" width="10" height="16"/><rect x="20" y="36" width="10" height="16"/><rect x="34" y="36" width="10" height="16"/><rect x="48" y="36" width="10" height="16"/>`,
  grades: `<path d="M6 56h52"/><rect x="8" y="30" width="8" height="26"/><rect x="20" y="16" width="8" height="40"/><rect x="32" y="22" width="8" height="34"/><rect x="44" y="12" width="8" height="44"/><path d="M4 30h56" stroke-dasharray="4 3"/>`,
  scorecard: `<path d="M8 56V8M8 56h50"/><rect x="16" y="34" width="10" height="22"/><rect x="32" y="18" width="10" height="38"/><rect x="48" y="28" width="8" height="28"/>`,
  gate: `<path d="M8 8v50M56 8v50"/><path d="M8 26h48M8 40h48"/>${arrowR(20, 50, 24)}`,
};

// node id -> [shape, caption]. The caption says what the picture shows, in plain words.
const VISUALS = {
  dataset: ["funnel", "A funnel: many questions into one list"],
  key: ["docTick", "A page with a tick: the correct answer"],
  prompt: ["docPencil", "A page and a pen: the instructions"],
  checks: ["checklist", "A list of boxes: what to measure"],
  bar: ["threshold", "Bars and a line: the score to reach"],
  ask: ["question", "A message box: the user's question"],
  guard: ["shield", "A shield with a tick: rules before the model"],
  model: ["gear", "A gear: the model working"],
  t1: ["wrench", "A wrench: a tool our code runs"],
  c1: ["tickBoxIn", "A tick box: the tool input is checked"],
  t2: ["wrench", "A wrench: a tool our code runs"],
  c2: ["tickBoxIn", "A tick box: the tool input is checked"],
  draft: ["docDraft", "A dashed page: a first version"],
  c3: ["tickBox", "A tick box: the answer is checked"],
  retry: ["retry", "A loop arrow: try again"],
  fallback: ["fallback", "A path that splits: another way to answer"],
  refuse: ["refuse", "A crossed box: no answer given"],
  answer: ["arrowOut", "A message box with an arrow: sent to the user"],
  trace: ["trace", "A list of steps in order: the saved run"],
  eval: ["eight", "Eight boxes: eight automatic checks"],
  judge: ["grades", "Five bars and a line: five grades, the middle one counts"],
  card: ["scorecard", "A bar chart: all results together"],
  gate: ["gate", "A barrier with an arrow: pass or stop"],
};

export const VISUAL_IDS = Object.keys(VISUALS);

const svg = (inner) =>
  `<svg class="xvis-svg" viewBox="0 0 64 64" width="64" height="64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" focusable="false">${inner}</svg>`;

// The pictogram for one node and its visible caption. Unknown id: empty string.
export function nodeVisualHtml(id, { missing = false } = {}) {
  if (!Object.hasOwn(VISUALS, id)) return "";
  const [shape, caption] = VISUALS[id];
  return `<figure class="xvis${missing ? " xvis-missing" : ""}">${svg(SHAPES[shape])}<figcaption>${esc(caption)}</figcaption></figure>`;
}

// "IN -> OUT" strip made of two text boxes. Values are plain text (escaped here). A missing value reads "none".
export function flowStripHtml(inText, outText) {
  const box = (label, text) =>
    `<span class="xflow-box"><span class="xflow-lab">${label}</span><code>${esc(text ?? "none")}</code></span>`;
  return `<div class="xflow">${box("IN", inText)}<span class="xflow-arrow" aria-hidden="true">→</span>${box("OUT", outText)}</div>`;
}
