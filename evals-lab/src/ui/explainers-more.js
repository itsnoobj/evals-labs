// Two plain sentences for the explain dialog (explain-dialog.js) of the other clickable elements:
// the 8 checks on the Checks screen and the 5 boxes of the task diagram (Start, Run, Checks screens).
// Rules (same as node-explainers.js): 15 words or fewer each, one idea per sentence, no figures that are not
// read from code, no metaphors. tests/ui/explainers-more.test.mjs checks the keys and the limits.
//
// Keys: a check id from METRICS (evals/engine.js), or "stage-" + a box id from STAGES (lessons.js).
// The "stage-" prefix keeps the box "answer" apart from the wiring node "answer" (node-explainers.js).
export const stageExplainId = (stageId) => `stage-${stageId}`;

export const MORE_EXPLAIN = {
  // The 8 checks
  trajectory: {
    what: "Compares each tool call to the expected tool, input and order.",
    why: "A wrong tool or input can still end in a believable answer.",
  },
  task_success: {
    what: "Compares the final card and reward to the answer key.",
    why: "This is the result the user actually gets.",
  },
  answer_match: {
    what: "Looks for the right card's name in the reply text.",
    why: "The user reads the sentence, not the structured answer.",
  },
  grounded: {
    what: "Looks up every number in the answer in the tool results or the question.",
    why: "A number found nowhere in the data is made up.",
  },
  tool_recall: {
    what: "Confirms each needed tool was called at least once.",
    why: "A skipped tool means the answer rests on missing data.",
  },
  tool_precision: {
    what: "Counts tool calls that were repeated, unknown or not needed.",
    why: "Extra calls cost time and money without improving the answer.",
  },
  rubric_judge: {
    what: "A second AI grades the reply from 0 to 5.",
    why: "It judges quality that fixed rules cannot, but it can be wrong.",
  },
  ops: {
    what: "Checks the run stayed under the time limit and every reply was readable.",
    why: "A slow or unreadable run is a poor result even when the card is right.",
  },
  // The 5 boxes of the task diagram
  "stage-question": {
    what: "The question a visitor asks about which card to use.",
    why: "Every later step and every check starts from this question.",
  },
  "stage-classify": {
    what: "The model asks our code to turn a shop name into a category.",
    why: "The ranking in the next step needs this category.",
  },
  "stage-rank": {
    what: "Our code returns the four cards with the reward each one earns.",
    why: "The final answer must take its numbers from this result.",
  },
  "stage-answer": {
    what: "The model stops calling tools and gives a card, a reward and a reply.",
    why: "This is the part the user sees and the checks grade.",
  },
  "stage-checks": {
    what: "Code reads the finished run and marks it PASS, FAIL or NOT RUN.",
    why: "No single check sees every problem, so several run together.",
  },
};
