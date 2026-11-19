# UX guided flow (slice S9)

Node: `evals-lab > ui`. Problem: first-time visitors do not know what the task is, what to click, or what concept each screen teaches.

## Done when
- Default screen `#start` shows the task as a diagram: Question, classify_merchant, rank_cards, Final answer, Checks. Clicking a node explains it.
- Each of the 4 screens has a Mission panel: goal, 2-3 tasks that tick themselves when the visitor does them, the concept, a "you learned" line and a Next link once done.
- Run screen: 3 numbered steps (choose engine, pick question, run). Diagram lights up as steps arrive. Result shows answer key vs agent answer, and a plain-words caption per step.
- Metrics screen: diagram shows which checks watch which stage. An injected bug marks its stage. Summary names which checks caught it and which stayed green, plus a one-line lesson per bug.
- Golden screen: every cell is a button that opens that run and why it failed.
- Compounding screen: works before any run (what-if slider); the slider overrides the measured value.
- If the page is not a secure context, a red banner says which URL to open instead.

## Goals
- Tell the visitor what to do next at every moment. Plain words, one concept per screen.

## Non-goals
- No new framework, no build, no new metrics. Judge lab stays "soon".

## Invariants
- `ui.js` does not import the engine. Teaching copy lives in `lessons.js` (pure data + `stageStates`, tested in node).
- Square flat style from `ui-style.md`; status never by colour alone.

## Concepts per mission
1. Run: an agent is a model that picks tools in a loop; our code runs the tools.
2. Metrics: a metric is code that asks one question about a run. Different bugs need different checks; one check is never enough.
3. Golden set: one run can lie. A fixed list of questions with known answers, run several times, shows reliable, flaky and broken cases.
4. Compounding: small per-step errors multiply over a long task. Retries help only if something catches the wrong step.
