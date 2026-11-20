// The result block of "Score both on the test set" on the Side by side screen.
// Pure: takes the scoreBoth() result, returns an HTML string. No DOM, no engine import.
// result = { simple, careful, aborted, planned? } where each side is { passed, total, rate, perCase }.
// `planned` (runs the whole job would make, both agents) is added by the caller; scoreBoth does not know it.
// mode: "replay" or "live".
import { disclose } from "./disclose.js";

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const percent = (rate) => `${Math.round((rate ?? 0) * 100)}%`;
const counts = (t) => `${t?.passed ?? 0} of ${t?.total ?? 0}`;

function rowHtml(name, side, higher) {
  // "higher" is a word, so the better agent is not marked by colour alone.
  const flag = higher ? `<b class="setscore-flag">higher</b>` : `<span class="setscore-flag"></span>`;
  return `<div class="setscore-row"><span class="setscore-name">${esc(name)}</span><span class="setscore-n mono">${esc(counts(side))}</span><span class="setscore-pct mono">${esc(percent(side.rate))}</span>${flag}</div>`;
}

function perCaseHtml(result) {
  const ids = Object.keys(result.simple.perCase ?? {});
  const rows = ids
    .map(
      (id) =>
        `<tr><th scope="row" class="mono">${esc(id)}</th><td class="mono">${esc(counts(result.simple.perCase[id]))}</td><td class="mono">${esc(counts(result.careful.perCase?.[id]))}</td></tr>`,
    )
    .join("");
  return `<table class="setscore-table"><thead><tr><th scope="col">Question</th><th scope="col">Without evals</th><th scope="col">With evals</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function scoreResultHtml(result, mode) {
  const { simple, careful } = result;
  const modeText = mode === "live" ? "Live model" : "Recorded runs";
  const done = simple.total + careful.total;
  const stopped = result.aborted
    ? `<p class="setscore-stopped">Stopped at ${done}${result.planned != null ? ` of ${esc(result.planned)}` : ""} runs</p>`
    : "";
  return (
    `<section class="setscore" aria-label="Score over the whole test set">` +
    `<p class="setscore-mode">${modeText}</p>${stopped}` +
    rowHtml("Agent without evals", simple, simple.rate > careful.rate) +
    rowHtml("Agent with evals", careful, careful.rate > simple.rate) +
    disclose("Per question", perCaseHtml(result), { id: "score-per-case" }) +
    `</section>`
  );
}
