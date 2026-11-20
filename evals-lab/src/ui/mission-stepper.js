// The strip at the top of every mission panel: one square per mission, joined by lines.
// Pure: plain data in, HTML out. The links are plain hash links, so the existing screen routing handles the click.
import { MISSIONS } from "./lessons.js";

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// currentId: the mission shown now. doneIds: ids of finished missions.
// Each step says its state in words (done / you are here / to do), so colour and shape are never the only signal.
export function stepperHtml(currentId, doneIds = []) {
  const done = new Set(doneIds);
  const steps = MISSIONS.map((m) => {
    const here = m.id === currentId;
    const ok = done.has(m.id);
    const state = here ? "now" : ok ? "done" : "todo";
    const word = here ? "you are here" : ok ? "done" : "to do";
    const mark = ok ? "\u2713" : String(m.num);
    const aria = `Mission ${m.num} of ${MISSIONS.length}: ${m.short}, ${word}${here && ok ? ", done" : ""}`;
    return `<li class="mstep is-${state}"><a href="#${esc(m.id)}" aria-label="${esc(aria)}"${here ? ' aria-current="step"' : ""}><span class="mstep-sq mono" aria-hidden="true">${mark}</span><span class="mstep-name" aria-hidden="true">${esc(m.short)}</span>${here ? '<b class="mstep-now" aria-hidden="true">now</b>' : ""}</a></li>`;
  }).join("");
  return `<ol class="msteps" aria-label="Missions">${steps}</ol>`;
}

// "■■□" for 2 of 3 required tasks done. Text characters, always followed by the numbers in words.
export function taskSquares(doneCount, total) {
  return "\u25A0".repeat(doneCount) + "\u25A1".repeat(Math.max(0, total - doneCount));
}
