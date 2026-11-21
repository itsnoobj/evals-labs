// Example chips for the "Type your own" boxes. Each chip is a real test-set case, so it always has an answer key and a
// recorded run. The picks and the captions are computed from data/recorded-runs.json (nothing is typed in by hand).
// Exports: exampleChips (async), questionOptions (async), exampleChipsHtml, knownShops, GROUP_HELP, GROUP_FINE, OPT_HELP, OPT_SAME, OPT_WORSE, RUNS_PER_CASE.
import { scoreBoth, replayRunAgent } from "../agent/score-both.js";

export const GROUP_HELP = "Where evals help most";
export const GROUP_FINE = "Both agents do fine";
export const RUNS_PER_CASE = 5; // the same as the Side by side score (5 recorded runs per case)

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// Pass counts per case for both agents on the recorded runs (same 5 runs per case as the Side by side score), plus why:
//  - s.wrong / s.silent: failed runs of the agent without evals that gave a wrong card / gave no final answer at all.
//  - w.retried: runs of the agent with evals that passed only after a retry or the fallback (more than one try).
async function caseRows(recorded, cases) {
  const inner = replayRunAgent(recorded, { seedBase: 0 });
  const seen = { simple: {}, careful: {} };
  const runAgent = async (kind, c, i) => {
    const run = await inner(kind, c, i);
    (seen[kind][c.id] ??= []).push(run);
    return run;
  };
  const score = await scoreBoth({ cases, runsPerCase: RUNS_PER_CASE, runAgent });
  return cases.map((c) => {
    const s = { ...score.simple.perCase[c.id], wrong: 0, silent: 0 };
    const w = { ...score.careful.perCase[c.id], retried: 0 };
    s.runs.forEach((ok, i) => {
      if (ok) return;
      if (seen.simple[c.id][i].steps.some((st) => st.kind === "final")) s.wrong += 1;
      else s.silent += 1;
    });
    w.runs.forEach((ok, i) => {
      if (ok && seen.careful[c.id][i].attemptCount > 1) w.retried += 1;
    });
    return { c, s, w };
  });
}
const gap = (r) => r.w.passed - r.s.passed;
const byGapThenId = (a, b) => gap(b) - gap(a) || a.c.id.localeCompare(b.c.id);
// Plain words for the failures, e.g. " (3 picked a wrong card, 2 gave no answer)". "" when nothing failed.
const why = (s) => {
  const parts = [s.wrong && `${s.wrong} picked a wrong card`, s.silent && `${s.silent} gave no answer`].filter(Boolean);
  return parts.length ? ` (${parts.join(", ")})` : "";
};
const fix = (w) => (w.retried ? ` (${w.retried} needed a retry or the fallback)` : "");
const labelOf = (c) => `${c.merchant} ₹${c.amount.toLocaleString("en-IN")}`;

// Pass rates per case for both agents on the recorded runs, then:
//  - "help": the 2 cases with the biggest (with evals passed - without evals passed), biggest first, only if the gap is above 0.
//  - "fine": the first case where both agents pass every run.
// Returns [{ id, label, caption, group }]. [] when there are no recorded runs.
export async function exampleChips(recorded, cases) {
  if (!recorded) return [];
  const rows = await caseRows(recorded, cases);
  const chip = ({ c, s, w }, group) => ({
    id: c.id,
    label: labelOf(c),
    caption: `Recorded: without evals ${s.passed} of ${s.total} right${why(s)}. With evals ${w.passed} of ${w.total} right${fix(w)}.`,
    group,
  });
  const help = rows
    .filter((r) => gap(r) > 0)
    .sort(byGapThenId)
    .slice(0, 2)
    .map((r) => chip(r, GROUP_HELP));
  const fine = rows.find((r) => r.s.passed === r.s.total && r.w.passed === r.w.total && r.s.total > 0);
  return [...help, ...(fine ? [chip(fine, GROUP_FINE)] : [])];
}

export const OPT_HELP = "Evals make the difference (biggest gap first)";
export const OPT_SAME = "Both agents do about the same";
export const OPT_WORSE = "Evals did not help here";

// Every test case for the Side by side dropdown, grouped by what evals did on the recorded runs and ordered by gap, biggest first.
// Returns [{ group, items: [{ id, text }] }]; empty groups are left out. [] when there are no recorded runs.
export async function questionOptions(recorded, cases) {
  if (!recorded) return [];
  const rows = (await caseRows(recorded, cases)).sort(byGapThenId);
  const item = ({ c, s, w }) => ({
    id: c.id,
    text: `${c.id}  ${labelOf(c)}: without evals ${s.passed}/${s.total}, with evals ${w.passed}/${w.total}`,
  });
  return [
    [OPT_HELP, rows.filter((r) => gap(r) > 0)],
    [OPT_SAME, rows.filter((r) => gap(r) === 0)],
    [OPT_WORSE, rows.filter((r) => gap(r) < 0)],
  ]
    .filter(([, g]) => g.length)
    .map(([group, g]) => ({ group, items: g.map(item) }));
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
