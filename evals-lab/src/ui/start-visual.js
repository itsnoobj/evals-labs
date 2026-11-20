// The picture on the Start screen: the task as 5 boxes with real example data, the 4 cards, and a 3-step strip.
// Pure string, no DOM. Every example comes from the scripted perfect run of the default case, never typed in here.
// Click wiring (box -> explain dialog) lives in app/start-screen.js. Styles: styles/start.css.
import { CARDS, CASES, CATEGORY_LABELS, DEFAULT_CASE_ID, perfectRun } from "../task/cases.js";
import { cardImageHtml } from "./card-image.js";
import { nodeIconHtml } from "./node-visuals.js";

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

export const START_CUE = "Click a box to see what it is.";

// [stage id, label of 4 words or fewer, one-line example]. Ids match STAGES in lessons.js.
function diagramBoxes(metricCount) {
  const c = CASES.find((x) => x.id === DEFAULT_CASE_ID);
  const [classify, rank, final] = perfectRun(c).steps;
  const category = classify.output.category;
  const ranked = rank.output.ranked;
  return [
    ["question", "Question", c.query],
    ["classify", "Find the shop type", `${classify.args.merchant} → ${CATEGORY_LABELS[category] ?? category}`],
    [
      "rank",
      `Rank the ${Object.keys(CARDS).length} cards`,
      `₹${ranked[0].reward_inr} down to ₹${ranked.at(-1).reward_inr}`,
    ],
    ["answer", "Answer", `${CARDS[final.card].name}, ₹${final.reward_inr}`],
    ["checks", "Checks", `${metricCount} checks, each PASS or FAIL`],
  ];
}

// metricCount: how many checks the engine has (METRICS.length). Passed in so this file never imports the engine.
export function startVisualHtml({ metricCount }) {
  const steps = diagramBoxes(metricCount)
    .map(
      ([id, label, example]) =>
        `<li class="sv-step"><button type="button" class="sv-box" data-stage="${id}" aria-haspopup="dialog">${nodeIconHtml(`stage-${id}`)}<b class="sv-label">${esc(label)}</b><span class="sv-eg">${esc(example)}</span></button></li>`,
    )
    .join('<li class="sv-arrow" aria-hidden="true">→</li>');
  const cards = Object.values(CARDS)
    .map(
      (card) =>
        `<li class="sv-card">${cardImageHtml(card.name, 96)}<span class="sv-cname">${esc(card.name)}</span></li>`,
    )
    .join("");
  return `<div class="sv">
    <div id="start-flow" data-hook="start-flow"><ol class="sv-flow" aria-label="The task in five steps">${steps}</ol>
      <p class="muted sv-cue">${START_CUE}</p></div>
    <ul class="sv-cards" aria-label="The ${Object.keys(CARDS).length} cards">${cards}</ul>
    <ol class="sv-do" aria-label="What you will do"><li><b aria-hidden="true">1</b> Run it.</li><li><b aria-hidden="true">2</b> Break it.</li><li><b aria-hidden="true">3</b> See which check notices.</li></ol>
  </div>`;
}
