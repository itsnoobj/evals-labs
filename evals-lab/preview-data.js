// Static sample data in the shapes of docs/specs/engine-contract.md. Loaded only with ?preview.
// METRICS, BUGS, case queries, the run and the scores are copied from real engine output (scoreRun, injectBug on C01; C01 is a tie, so hdfc_swiggy and icici_amazon_pay are both correct).

export const METRICS = [
  {"id": "trajectory", "label": "Right tools, right order", "group": "TOOL CHOICE", "blurb": "Did the agent call the expected tools, with the expected arguments, in order?"},
  {"id": "task_success", "label": "Correct final answer", "group": "RESULT", "blurb": "Is the final card and reward the correct answer?"},
  {"id": "answer_match", "label": "Names the right card", "group": "REPLY TEXT", "blurb": "Does the reply name the right card?"},
  {"id": "grounded", "label": "Numbers come from tools", "group": "NO MADE-UP NUMBERS", "blurb": "Does every number in the answer come from a tool result or the question?"},
  {"id": "tool_recall", "label": "Used every needed tool", "group": "TOOL CHOICE", "blurb": "Were all the needed tools called at least once?"},
  {"id": "tool_precision", "label": "No extra tool calls", "group": "TOOL CHOICE", "blurb": "Did the agent avoid extra, repeated or unknown tool calls?"},
  {"id": "rubric_judge", "label": "AI grader", "group": "SECOND OPINION", "blurb": "A model grades the reply on relevance, groundedness and clarity."},
  {"id": "ops", "label": "Speed and clean output", "group": "SPEED", "blurb": "Was the run fast enough and free of broken JSON?"},
];

export const BUGS = [
  {"id": "wrong_number_in_reply", "label": "Wrong number in reply", "blurb": "The reward amount is 10x too big, in the answer and in the reply text."},
  {"id": "skip_tool", "label": "Skip a tool", "blurb": "The agent never classifies the merchant."},
  {"id": "duplicate_call", "label": "Duplicate call", "blurb": "The agent ranks the cards twice."},
  {"id": "invented_tool", "label": "Invented tool", "blurb": "The agent calls a tool that does not exist."},
  {"id": "right_words_wrong_card", "label": "Right words, wrong card", "blurb": "The reply names the right card but the final answer picks another."},
];

export const ACTIVE_BUG = 'wrong_number_in_reply';

export const CASE_INFOS = [
  {"id":"C01","query":"I'm a Prime member spending ₹15,000 on Amazon. Which card should I use?"},
  {"id":"C02","query":"Ordering ₹800 of food on Swiggy. Which card is best?"},
  {"id":"C03","query":"I'm buying an ₹8,000 phone on Flipkart. Which card is best?"},
  {"id":"C04","query":"Petrol worth ₹2,000 at an HP Petrol Pump. Which card should I use?"},
  {"id":"C05","query":"Paying my ₹1,800 BESCOM electricity bill directly. Which card should I use?"},
  {"id":"C06","query":"Paying my ₹500 Airtel phone bill directly. Which card is best?"},
];

// scoreRun() output for case C01: the clean run and each injected bug. rubric_judge is not run.
const SCORES_BY_BUG = {
  clean: {
    trajectory: {"pass":true,"score":1,"reason":"2 of 2 tool steps match"},
    task_success: {"pass":true,"score":1,"reason":"got hdfc_swiggy / 750, accepted: hdfc_swiggy or icici_amazon_pay (reward 750)"},
    answer_match: {"pass":true,"score":1,"reason":"reply names HDFC Swiggy"},
    grounded: {"pass":true,"score":1,"reason":"every number is in a tool output or the question"},
    tool_recall: {"pass":true,"score":1,"reason":"all needed tools called"},
    tool_precision: {"pass":true,"score":1,"reason":"no extra tool steps"},
    rubric_judge: {"pass":null,"score":null,"reason":"not run"},
    ops: {"pass":true,"score":1,"reason":"2800 ms, 170 text pieces"},
  },
  wrong_number_in_reply: {
    trajectory: {"pass":true,"score":1,"reason":"2 of 2 tool steps match"},
    task_success: {"pass":false,"score":0,"reason":"got hdfc_swiggy / 7500, accepted: hdfc_swiggy or icici_amazon_pay (reward 750)"},
    answer_match: {"pass":true,"score":1,"reason":"reply names HDFC Swiggy"},
    grounded: {"pass":false,"score":0,"reason":"not in any tool output: 7500"},
    tool_recall: {"pass":true,"score":1,"reason":"all needed tools called"},
    tool_precision: {"pass":true,"score":1,"reason":"no extra tool steps"},
    rubric_judge: {"pass":null,"score":null,"reason":"not run"},
    ops: {"pass":true,"score":1,"reason":"2800 ms, 170 text pieces"},
  },
  skip_tool: {
    trajectory: {"pass":false,"score":0,"reason":"0 of 2 tool steps match"},
    task_success: {"pass":true,"score":1,"reason":"got hdfc_swiggy / 750, accepted: hdfc_swiggy or icici_amazon_pay (reward 750)"},
    answer_match: {"pass":true,"score":1,"reason":"reply names HDFC Swiggy"},
    grounded: {"pass":true,"score":1,"reason":"every number is in a tool output or the question"},
    tool_recall: {"pass":false,"score":0.5,"reason":"missing: classify_merchant"},
    tool_precision: {"pass":true,"score":1,"reason":"no extra tool steps"},
    rubric_judge: {"pass":null,"score":null,"reason":"not run"},
    ops: {"pass":true,"score":1,"reason":"2000 ms, 110 text pieces"},
  },
  duplicate_call: {
    trajectory: {"pass":false,"score":0.6666666666666666,"reason":"2 of 3 tool steps match"},
    task_success: {"pass":true,"score":1,"reason":"got hdfc_swiggy / 750, accepted: hdfc_swiggy or icici_amazon_pay (reward 750)"},
    answer_match: {"pass":true,"score":1,"reason":"reply names HDFC Swiggy"},
    grounded: {"pass":true,"score":1,"reason":"every number is in a tool output or the question"},
    tool_recall: {"pass":true,"score":1,"reason":"all needed tools called"},
    tool_precision: {"pass":false,"score":0.6666666666666666,"reason":"1 extra tool step(s)"},
    rubric_judge: {"pass":null,"score":null,"reason":"not run"},
    ops: {"pass":true,"score":1,"reason":"3700 ms, 240 text pieces"},
  },
  invented_tool: {
    trajectory: {"pass":false,"score":0.6666666666666666,"reason":"2 of 3 tool steps match"},
    task_success: {"pass":true,"score":1,"reason":"got hdfc_swiggy / 750, accepted: hdfc_swiggy or icici_amazon_pay (reward 750)"},
    answer_match: {"pass":true,"score":1,"reason":"reply names HDFC Swiggy"},
    grounded: {"pass":true,"score":1,"reason":"every number is in a tool output or the question"},
    tool_recall: {"pass":true,"score":1,"reason":"all needed tools called"},
    tool_precision: {"pass":false,"score":0.6666666666666666,"reason":"1 extra tool step(s)"},
    rubric_judge: {"pass":null,"score":null,"reason":"not run"},
    ops: {"pass":true,"score":1,"reason":"3100 ms, 200 text pieces"},
  },
  right_words_wrong_card: {
    trajectory: {"pass":true,"score":1,"reason":"2 of 2 tool steps match"},
    task_success: {"pass":false,"score":0,"reason":"got hdfc_infinia / 750, accepted: hdfc_swiggy or icici_amazon_pay (reward 750)"},
    answer_match: {"pass":true,"score":1,"reason":"reply names HDFC Swiggy"},
    grounded: {"pass":true,"score":1,"reason":"every number is in a tool output or the question"},
    tool_recall: {"pass":true,"score":1,"reason":"all needed tools called"},
    tool_precision: {"pass":true,"score":1,"reason":"no extra tool steps"},
    rubric_judge: {"pass":null,"score":null,"reason":"not run"},
    ops: {"pass":true,"score":1,"reason":"2800 ms, 170 text pieces"},
  },
};
// bugId null = the clean run.
export const scoresFor = (bugId) => SCORES_BY_BUG[bugId ?? 'clean'];
export const SCORES = scoresFor(ACTIVE_BUG);

// Made-up 6 cases x 5 runs: reliable (5/5), flaky (1 to 4), broken (0/5).
const R = [
  [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 0, 1, 1, 0], [0, 0, 0, 0, 0], [1, 1, 0, 1, 1], [0, 1, 0, 0, 1],
];
export const GRID_RESULTS = CASE_INFOS.map((c, i) => ({ caseId: c.id, runs: R[i].map(Boolean) }));

// Same arithmetic as the engine's summarizeGrid (its nRuns counts runs over all cases, here 30).
const all = GRID_RESULTS.flatMap((r) => r.runs);
export const SUMMARY = {
  nCases: GRID_RESULTS.length,
  nRuns: all.length,
  avg: all.filter(Boolean).length / all.length,
  allPass: GRID_RESULTS.filter((r) => r.runs.every(Boolean)).length,
  anyPass: GRID_RESULTS.filter((r) => r.runs.some(Boolean)).length,
};

// p = 0.88 per step; three observed points sit a little under the line.
export const CURVE = { p: 0.88, n: 10, retryTries: 3, points: [{ n: 1, value: 0.88 }, { n: 2, value: 0.75 }, { n: 3, value: 0.7 }] };

// C01 with the wrong_number_in_reply bug (real injectBug output).
export const RUN = {
  caseId: "C01",
  model: "injected:wrong_number_in_reply",
  temperature: 0.7,
  seed: 42,
  steps: [
    {"kind":"tool","tool":"classify_merchant","args":{"merchant":"Amazon"},"output":{"category":"amazon"},"raw":"{\"tool\":\"classify_merchant\",\"args\":{\"merchant\":\"Amazon\"}}","ms":800,"tokens":60,"validJson":true},
    {"kind":"tool","tool":"rank_cards","args":{"amount":15000,"category":"amazon"},"output":{"ranked":[{"card":"hdfc_swiggy","rate_pct":5,"reward_inr":750},{"card":"icici_amazon_pay","rate_pct":5,"reward_inr":750},{"card":"hdfc_infinia","rate_pct":1,"reward_inr":150},{"card":"idfc_first_power_plus","rate_pct":0.5,"reward_inr":75}]},"raw":"{\"tool\":\"rank_cards\",\"args\":{\"amount\":15000,\"category\":\"amazon\"}}","ms":900,"tokens":70,"validJson":true},
    {"kind":"final","card":"hdfc_swiggy","reward_inr":7500,"reply":"Use HDFC Swiggy for Amazon. It returns 5% on amazon, so you earn ₹7500 on ₹15000.","raw":"{\"final\":{\"card\":\"hdfc_swiggy\",\"reward_inr\":750,\"reply\":\"Use HDFC Swiggy for Amazon. It returns 5% on amazon, so you earn ₹750 on ₹15000.\"}}","ms":1100,"tokens":40,"validJson":true},
  ],
  totalMs: 2800,
  totalTokens: 170,
};
