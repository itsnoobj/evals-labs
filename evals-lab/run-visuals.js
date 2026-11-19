// Two pure HTML-string renderers for the Run screen: ranked-card bars and a step timeline.
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function rankBarsHtml(output, cardNames = {}) {
  if (output && typeof output === "object" && typeof output.error === "string") {
    return `<p class="rbars-err">Tool error: ${esc(output.error)}</p>`;
  }
  if (!output || !Array.isArray(output.ranked)) return "";
  const rows = output.ranked;
  const max = Math.max(0, ...rows.map((r) => Number(r.reward_inr) || 0));
  if (max === 0) return `<div class="rbars"><p class="rbars-note">every card earns ₹0 here</p></div>`;
  const html = rows.map((r, i) => {
    const reward = Number(r.reward_inr) || 0;
    const w = reward > 0 ? Math.max(2, (reward / max) * 100) : 0;
    const tag = i === 0 ? `<span class="rbars-tag">BEST</span>` : "";
    return `<div class="rbars-row${i === 0 ? " rbars-best" : ""}">` +
      `<span class="rbars-name">${tag}${esc(cardNames[r.card] ?? r.card)}</span>` +
      `<span class="rbars-track"><i class="rbars-bar" style="--w:${+w.toFixed(1)}%"></i></span>` +
      `<span class="rbars-val">₹${esc(reward)} · ${esc(r.rate_pct)}%</span></div>`;
  }).join("");
  return `<div class="rbars">${html}</div>`;
}

const SHORT = { classify_merchant: "classify", rank_cards: "rank" };

function stepName(s) {
  if (s.kind === "final") return "answer";
  if (s.kind === "invalid") return "invalid";
  return SHORT[s.tool] ?? s.tool ?? "tool";
}

export function timelineHtml(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return "";
  const total = steps.reduce((t, s) => t + (Number(s.ms) || 0), 0);
  const slowest = steps.reduce((a, s) => ((Number(s.ms) || 0) > (Number(a.ms) || 0) ? s : a));
  const segs = steps.map((s) => {
    const ms = Number(s.ms) || 0;
    const w = total > 0 ? Math.max(6, (ms / total) * 100) : 100 / steps.length;
    const kind = ["tool", "final", "invalid"].includes(s.kind) ? s.kind : "tool";
    return `<div class="tl-seg tl-${kind}" style="--w:${+w.toFixed(1)}%">` +
      `<i class="tl-fill"></i><span class="tl-name">${esc(stepName(s))}</span><span class="tl-ms">${esc(ms)} ms</span></div>`;
  }).join("");
  return `<div class="tl">${segs}</div>` +
    `<p class="tl-sum">Total ${esc(total)} ms. The slowest step: ${esc(stepName(slowest))}.</p>`;
}
