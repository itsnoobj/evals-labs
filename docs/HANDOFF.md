# HANDOFF (updated 2026-11-20, build ux11)

Latest: Infinia key fixed to 3.33% and runs re-recorded (free 23/30, constrained 26/30); AI grader visual; typed questions; guardrails (`blocked` outcome); OSS tool lists per box; git repo started (`npm test`). Unverified: everything with the live WebGPU model. Open: Q13-Q16 in assumptions.md; user verifies 4 answer-key cells. Older notes below may be stale (build tags, counts).


## Goal
Talk "You Can't Improve What You Can't Measure" (AI Pune 2026, 30 min). Takeaway = `evals-lab/`: a static, browser-only page where a small WebLLM model runs a credit-card-picker task and visitors see 8 metrics, a bug injector, a 12x5 golden grid and a compounding curve. Scope is evals and metrics only.

## State
Mode: Execute. Slices S0-S7 done. S8 (polish) not started.
- Engine, cases, tests: `evals-lab/cases.js`, `engine.js`, `engine.test.mjs` (25 checks green), `agent-step.js` (`--selfcheck` green).
- UI (square, flat, like `/Users/Jeevan.Chikkegowda/labs/entain/ai/incident-review`): `index.html`, `styles.css`, `ui.js`, `preview-data.js` (`?preview` shows sample data).
- Wiring: `llm.js` (WebLLM 0.2.79 in a Blob worker), `app.js`, `recorded-runs.json` (120 real runs for replay), `README.md`.
- Model gate: `evals-lab/spike/RESULTS.md`. Qwen2.5-1.5B-Instruct q4f16_1 = 72% task success free, 83% with schema "Guardrail". SmolLM2-360M and Qwen2.5-0.5B = 0%.
- Verified in headless Chrome: replay mode end to end, live load + run + constrained run + judge x5 (first load 408 s, run 2-3 s). No console errors.

## Compare screen + wiring graph (done, build ux5)
Answer key has 6 verified cases (ties accepted). Runs re-recorded. Side by side has a "Show the wiring" switch: per-agent flow graph (`wiring-graph.js`, click panels in `wiring-details.js`, styles `wiring.css`), lit as the run goes. DSPy prompt (`dspy-prompt.json`) is illustration only, not what the live agent sends. Replay verified headless (1280 and 500 px). UNVERIFIED: careful agent with the live WebGPU model and the graph on.

## Wiring ON row height (done)
With `.show-wiring` the chat hides `wire-step/timeline/scores/verdict` (CSS, `chat.css`); rejected tries + checker log stay. At >=1101 px the graph column stretches to the chat height and the click panel is `position:sticky` under the nav (`styles.css` + `wiring.css`); below that it stays inline. Row heights C01 seed 3 finished: 1280 px simple 2381 -> 1055, careful 3075 -> 1636; 500 px 4080 -> 2673, 5210 -> 3672. 8-checks chips not clipped at 1280 or 500.

## S9 UX rewrite (done 2026-11-19)
New: `lessons.js` (+ `lessons.test.mjs`, 8 checks), Start screen, mission panels, task diagram (`ui.renderFlow`), answer key, clickable grid cells, what-if slider, `onStep` hook in `agent-step.js`. Spec: `docs/specs/ux-guided-flow.md`. Replay verified headless (driver idea: puppeteer request interception, no server). Live path not re-run.

## Disabled Load button (cause found, fixed in code)
The button was enabled only after `await checkWebGpu()`; a hung `requestAdapter` kept it disabled. It is now set from `isSecureContext` first, and the check times out in 5 s. Footer shows `build ux1` so a stale cache is visible.

## Old note on the problem
User's "Load model" button is disabled in their browser. `app.js` init disables it when `!window.isSecureContext` (WebLLM needs `crypto.randomUUID`, only on secure pages). User saw "crypto.randomUUID is not a function" earlier, so they open the page on an insecure origin (0.0.0.0 or hostname). Server is running on port 8000 serving the PARENT folder, so the URL is `http://localhost:8000/evals-lab/`. I opened Chrome there. Waiting for the user to paste the grey note under the progress bar (it names the origin it saw). If still disabled on localhost, debug `checkWebGpu()` in `llm.js` and cached JS (hard refresh).
The agent harness blocks commands that start servers; the user starts it themselves: `cd evals-lab && python3 -m http.server 8000`.

## Findings to keep
- 1.5B model as rubric judge gives 5/5 to every run, including a 10x wrong reward. Not flaky, rubber-stamp. Good "who checks the checker" point.
- Compounding screen: observed points sit above p^n (errors concentrate in the final step). Retry line is "best case" (needs a checker).
- WebLLM 0.2.79: `anyOf` schema enforced, top-level `oneOf` not.
- `maxTokens` 160 truncates long replies in about 5% of free runs.

## Next (see docs/TODOs.md)
1. Resolve the disabled button, user clicks through the 4 screens once (5 min).
2. S8: GitHub Pages deploy, QR code, timed 2-minute stage walkthrough (15 min).
3. v1.1 Judge lab: calibration vs user labels, order-bias swap (25 min). Add-your-own case (15 min). Raise maxTokens to 256 and re-measure (10 min).
4. Update `outline.md` section 6 to use the Evals Lab walkthrough instead of the mutation demo (5 min).

## Decisions and deviations
See `docs/decisions.md` and `docs/assumptions.md`. No git worktrees: this folder is untracked inside the shared `talks` repo with unrelated dirty files. Open questions Q8 (880 MB model OK for venue?) and Q9 (retry-line assumption) await the user.

## Do not
Do not read any `.env` file. Do not commit unrelated files in the `talks` repo. Do not fabricate benchmark numbers; every number in RESULTS.md comes from `evals-lab/spike/results-*.json`.

## Style
User wants concise replies, lead with the result, ADHD mode on (next action first, numbered steps, time estimates). Previous plan page: `.lavish/evals-playground-plan.html` (Lavish, DaisyUI).
