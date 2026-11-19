# DISCOVERY

## evals-lab (root)
- Done when: a public static page lets a visitor run a tiny in-browser model on card-picker cases and see 8 metrics, a bug injector, a 12x5 golden grid and a compounding curve.
- Goals: teach what can be measured about an agent, hands-on. Works offline after first load. Replay mode without WebGPU.
- Non-goals: guardrails, memory, context engineering, any server, any build step.
- Invariants: static files only; engine is pure JS and runs in node; every metric is deterministic except `rubric_judge`.

### engine (S2)
- Done when: `node evals-lab/engine.test.mjs` is green; perfect run scores 7/7 deterministic metrics on all 12 cases; each bug trips exactly the metrics in the contract table.
- Spec: `docs/specs/engine-contract.md`.

### ui (S3-S6 static, wired later)
- Done when: 4 screens render from sample data at 1280 px and 500 px, square flat style, welcome layer present.
- Spec: `docs/specs/ui-style.md`.

### ux-guided-flow (S9)
- Done when: Start screen with task diagram, self-ticking missions on all 4 screens, diagram lit by runs and bugs, clickable golden cells, what-if slider.
- Spec: `docs/specs/ux-guided-flow.md`.

### model-gate (S1)
- Done when: one model gives 30-80% task success on 12 cases x 5 runs at temp 0.7, or we change model/task. Numbers reported.

### replay (S7)
- Done when: page works end to end with WebGPU disabled, using `recorded-runs.json` of real runs.

### judge-lab (v1.1)
- Done when: visitor labels 10 runs and sees judge agreement and order bias.
