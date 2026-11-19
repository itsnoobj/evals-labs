# Engine contract (shared by engine, UI and spike agents)

Scope: pure JavaScript ES modules, no DOM, no WebLLM, no dependencies. Runs in the browser and in `node` (v20+). Files live in `evals-lab/src/` (`task/`, `agent/`, `evals/`).
Scenario: card picker, 4 real cards, 6 golden cases. Rates are merchant-specific, cited per cell, and valid only under the `ASSUMPTIONS` in `cases.js` (Prime member, first purchase of the month below every cap, direct card payment, cash-like reward values). Audit and sources: `docs/answer-key-audit.md`. Educational, not financial advice.

## Agent loop (what the model does)
Each step the model emits ONE JSON object. Code runs the tool and feeds the output back.
1. `{"tool":"classify_merchant","args":{"merchant":"Amazon"}}` -> `{"category":"amazon"}`
2. `{"tool":"rank_cards","args":{"amount":15000,"category":"amazon"}}` -> `{"ranked":[{"card":"hdfc_swiggy","rate_pct":5,"reward_inr":750}, {"card":"icici_amazon_pay","rate_pct":5,"reward_inr":750}, ...]}`
3. `{"final":{"card":"hdfc_swiggy","reward_inr":750,"reply":"Use HDFC Swiggy ..."}}`

## cases.js exports
```js
export const CARDS;        // { [cardId]: { name, rates: { [category]: pct } } }  exactly 4 cards
export const CATEGORIES;   // ["amazon","online_shopping","swiggy","fuel_hpcl","utilities","telecom"]
export const CATEGORY_LABELS; // { [categoryId]: short plain label for the UI }
export const MERCHANTS;    // { [lowercase merchant]: category }, 6 merchants, one per category
export const RATE_SOURCES; // { "<card>.<category>": { url, confidence: "high"|"medium"|"low", note } }, one per rate cell
export const ASSUMPTIONS;  // string[] of plain sentences the rates depend on
export const CASES;        // 6 items (C01..C06), shape below
export function classify_merchant({ merchant })        // -> { category } | { error }
export function rank_cards({ amount, category })       // -> { ranked: [{card, rate_pct, reward_inr}] sorted desc } | { error }
export const TOOLS;        // { classify_merchant, rank_cards }
export function runTool(name, args)                    // -> output | { error: "unknown tool: x" }
export function perfectRun(c)                          // -> Run (below) that follows expectedTrajectory exactly
```
Case shape:
```js
{ id: "C01", query: "I'm a Prime member spending ₹15,000 on Amazon. Which card should I use?",
  merchant: "Amazon", amount: 15000,
  expected: { category: "amazon", card: "hdfc_swiggy", accept: ["hdfc_swiggy", "icici_amazon_pay"], reward_inr: 750 },
  expectedTrajectory: [
    { tool: "classify_merchant", args: { merchant: "Amazon" } },
    { tool: "rank_cards", args: { amount: 15000, category: "amazon" } } ] }
```
Tie rule: `expected.accept` is every card whose reward equals the top reward, sorted by id. `expected.card` is `accept[0]`. `reward_inr` is the same for every accepted card. A case may carry an optional `note` string (C05: IDFC caps the bucket at Rs 2,000 of spend per cycle). Code that reads `expected` must fall back to `[expected.card]` when `accept` is missing.
Cases are kept only when the winner holds under the unverified rate cells (`docs/answer-key-audit.md`). Every case must be answerable from the query alone.

## Run shape (same in engine, UI, recorded-runs.json)
```js
{ caseId: "C01", model: "SmolLM2-360M-Instruct-q4f16_1-MLC" | "scripted" | "injected:wrong_number_in_reply",
  temperature: 0.7, seed: 42,
  steps: [
    { kind: "tool",  tool: "classify_merchant", args: {...}, output: {...}, raw: "<model text>", ms: 800, tokens: 61, validJson: true },
    { kind: "final", card: "idfc_first_power_plus", reward_inr: 2250, reply: "...", raw: "...", ms: 1100, tokens: 40, validJson: true } ],
  totalMs: 2800, totalTokens: 175 }
```
A step the model emitted with invalid JSON is `{ kind: "invalid", raw, ms, tokens, validJson: false }`.

## engine.js exports
```js
export const METRICS;   // fixed order, 8 items: { id, label, group, blurb }
// ids: trajectory, task_success, answer_match, grounded, tool_recall, tool_precision, rubric_judge, ops
// groups: "TOOL CHOICE", "RESULT", "REPLY TEXT", "NO MADE-UP NUMBERS", "TOOL CHOICE", "TOOL CHOICE", "SECOND OPINION", "SPEED"
export function scoreRun(c, run, opts = {})  // -> { [metricId]: { pass: true|false|null, score: number|null, reason: string } }
export const BUGS;      // [{ id, label, blurb }] 5 items, ids below
export function injectBug(c, run, bugId)     // -> new Run (deep clone, never mutate), model = "injected:<bugId>"
export function summarizeGrid(results)       // results: [{ caseId, runs: boolean[] }] -> { nCases, nRuns, avg, allPass, anyPass } (avg 0..1, others counts)
export function perStepAccuracy(runs, cases) // -> number 0..1 (correct steps / total steps over all runs)
export function chainSuccess(p, n)           // p ** n
export function retryLift(p, tries)          // 1 - (1 - p) ** tries
export function judgePrompt(c, run)          // -> { system, user } for the model-as-judge, asks for a 0-5 integer
export function parseJudge(text)             // -> { score: 0..5 | null }
```
Metric rules (deterministic unless noted):
- `trajectory`: tool steps vs `expectedTrajectory`; score = exact (name + deep-equal args) matches in order / max(expected length, tool-step count); pass = score 1.
- `task_success`: final.card is in `expected.accept` and abs(final.reward_inr - expected.reward_inr) <= 0.5. Reason reads `got X / 750, accepted: A or B (reward 750)`.
- `answer_match`: final.reply contains the display name (case-insensitive) or id of ANY card in `expected.accept`.
- `grounded`: every number found in final.reply (strip ₹ and commas) and final.reward_inr appears as a number in some tool output (rate_pct, reward_inr) or in the case amount.
- `tool_recall`: every expected tool name appears at least once. pass = all present; score = share present.
- `tool_precision`: score = expected-tool-count matched / total tool steps (duplicates and unknown tools lower it); pass = no extra tool steps.
- `rubric_judge`: pass null and score null with reason "not run" unless `opts.judge = { score }` (0..5); pass = score >= 4.
- `ops`: pass if totalMs <= 20000 and no step has validJson false. reason shows ms and tokens.

## Bug table (the tests assert exactly this)
| bug id | what changes | FAILS | still PASSES |
|---|---|---|---|
| wrong_number_in_reply | final.reward_inr and the number in the reply multiplied by 10 (by 100 when 10x equals the question's amount, e.g. C02: Rs 80 -> Rs 800, which would look grounded) | task_success, grounded | trajectory, answer_match, tool_recall, tool_precision, ops |
| skip_tool | drop the classify_merchant step | trajectory, tool_recall | task_success, answer_match, grounded, tool_precision, ops |
| duplicate_call | repeat the rank_cards step | trajectory, tool_precision | task_success, answer_match, grounded, tool_recall, ops |
| invented_tool | add a step with tool "check_credit_limit" and output { error } | trajectory, tool_precision | task_success, answer_match, grounded, tool_recall, ops |
| right_words_wrong_card | final.card set to a card NOT in `expected.accept`, reply text still names an accepted card | task_success | trajectory, answer_match, grounded, tool_recall, tool_precision, ops |

## UI render data shapes (ui.js receives exactly these)
- scores: output of `scoreRun`.
- grid results: `[{ caseId, runs: boolean[] }]`, summary: output of `summarizeGrid`.
- curve: `{ p, retryTries }` and optional observed points `[{ n, value }]`.

## Careful agent checker (guarded-agent.js)
Rule `answer` accepts any card whose `reward_inr` equals the top row of the `rank_cards` result (same tie rule, computed from the tool result, never from the answer key). The reward must match the top reward within 0.5.

## Result strip (chat-ui.js)
`expected` may be `{ card, reward_inr }` (old) or `{ card, accept, reward_inr }`. MATCH when final.card is in `accept` (or equals `card` when `accept` is missing) and the reward is within 0.5. A tie shows `Expected A or B · ₹750`.
