// Example chips for the "Type your own" boxes. Each chip is a real test-set case, so it always has an answer key and a
// recorded run. The picks and the captions are computed from data/recorded-runs.json (nothing is typed in by hand).
// Exports: exampleChips (async), exampleChipsHtml, knownShops, GROUP_HELP, GROUP_FINE, RUNS_PER_CASE.
import { scoreBoth, replayRunAgent } from "../agent/score-both.js";

export const GROUP_HELP = "Where evals help most";
export const GROUP_FINE = "Both agents do fine";
export const RUNS_PER_CASE = 5; // the same as the Side by side score (5 recorded runs per case)

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// Pass rates per case for both agents on the recorded runs, then:
//  - "help": the 2 cases with the biggest (with evals passed - without evals passed), biggest first, only if the gap is above 0.
//  - "fine": the first case where both agents pass every run.
// Returns [{ id, label, caption, group }]. [] when there are no recorded runs.
export async function exampleChips(recorded, cases) {
  if (!recorded) return [];
  const score = await scoreBoth({
    cases,
    runsPerCase: RUNS_PER_CASE,
    runAgent: replayRunAgent(recorded, { seedBase: 0 }),
  });
  const rows = cases.map((c) => ({
    c,
    s: score.simple.perCase[c.id],
    w: score.careful.perCase[c.id],
  }));
  const chip = ({ c, s, w }, group) => ({
    id: c.id,
    label: `${c.merchant} ₹${c.amount.toLocaleString("en-IN")}`,
    caption: `Recorded: without evals ${s.passed} of ${s.total}, with evals ${w.passed} of ${w.total}`,
    group,
  });
  const gap = (r) => r.w.passed - r.s.passed;
  const help = rows
    .filter((r) => gap(r) > 0)
    .sort((a, b) => gap(b) - gap(a) || a.c.id.localeCompare(b.c.id))
    .slice(0, 2)
    .map((r) => chip(r, GROUP_HELP));
  const fine = rows.find((r) => r.s.passed === r.s.total && r.w.passed === r.w.total && r.s.total > 0);
  return [...help, ...(fine ? [chip(fine, GROUP_FINE)] : [])];
}

// One labelled row of buttons per group. A click is handled by the caller (data-example holds the case id).
export function exampleChipsHtml(chips, { disabled = false } = {}) {
  const groups = [...new Set(chips.map((c) => c.group))];
  return groups
    .map(
      (g) =>
        `<div class="try-these" role="group" aria-label="${esc(g)}"><p class="k">${esc(g)}</p><div class="try-row">` +
        chips
          .filter((c) => c.group === g)
          .map(
            (c) =>
              `<button type="button" class="sec try-btn" data-example="${esc(c.id)}"${disabled ? " disabled" : ""}>` +
              `<span class="try-title">${esc(c.label)}</span><span class="try-out">${esc(c.caption)}</span></button>`,
          )
          .join("") +
        `</div></div>`,
    )
    .join("");
}

// The shops a typed question can name: the keys of MERCHANTS, spelled the way the built-in cases spell them.
export function knownShops(merchants, cases) {
  return Object.keys(merchants).map((k) => cases.find((c) => c.merchant.toLowerCase() === k)?.merchant ?? k);
}
