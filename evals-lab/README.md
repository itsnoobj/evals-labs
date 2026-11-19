# Evals Lab

A teaching page: a small model runs in your browser on a credit-card-picker task (4 real Indian cards, 6 verified questions) and you watch 8 checks score it, break a run on purpose, run the test set to see run-to-run spread, and compare a simple agent with a careful one.

Run it (module imports need http, not `file://`):

```
cd evals-lab && python3 -m http.server 8000
# open http://localhost:8000/   (if you serve the parent folder: http://localhost:8000/evals-lab/)
```

- Live mode: Chrome or Edge with WebGPU. First load downloads about 880 MB, then it is cached.
- No WebGPU: press "Use recorded runs". Those are real runs of the real model (`recorded-runs.json`).
- Checks screen needs no model at all.
- Answer key: `cases.js` (6 cases C01-C06, ties allowed through `expected.accept`, rates with sources). Audit: `../docs/answer-key-audit.md`. The Start screen shows the scenario rules and says rates were checked in November 2026.
- Side by side screen: the same question through a simple agent and a careful agent, as two chats. Tick "Show the wiring" and each agent gets its end-to-end flow graph (build, live run, measure) that lights up as the run goes; the simple agent's graph has dashed MISSING boxes. Click any box for its detail. The prompt box has an "Our prompt" tab (the live prompt) and a "DSPy prompt" tab (`dspy-prompt.json`, made with real DSPy and a recording fake model, for illustration only: the live agent does not send it).
- The page opens on a Start screen: the task as five boxes and five missions that tick off as you do them.
- Use `localhost` or https. On an IP address or hostname the browser has no `crypto.randomUUID`, and a red banner explains it.

Tests: `npm test` from the repo root runs every `evals-lab/*.test.mjs` plus `node evals-lab/agent-step.js --selfcheck` (`evals-lab/run-all-tests.mjs`). One file: `node evals-lab/<name>.test.mjs`.
Model choice evidence: `spike/RESULTS.md`. Rebuild the recorded runs: `node spike/make-recorded-runs.mjs`.
Educational, not financial advice. Rates change.
