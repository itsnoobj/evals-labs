# Ideas & open threads

Raw material to develop into the outline. Abstract is locked in `README.md`.

## Two possible depth directions (decide before outlining)

1. **Agent-eval discipline (default).** Deep on *what to measure* and *how* when
   building agents. Trajectory metrics, metric taxonomy, baselines, what goes
   into CI. This is the core of the locked abstract.
2. **AI-PDLC discipline.** Reframe around building AI agents/services *with*
   software-lifecycle discipline — evals + mutation testing + CI gates as the
   PDLC for AI. Broader "how we build" story; mutation testing gets more room.

> Likely answer: direction 1 as the spine, with one PDLC slide near the end
> ("this is the lifecycle these pieces add up to"). Confirm before slides.

## Eval depth — the meat to expand

### What to measure (by layer)
- **Component / step level:** retrieval hit rate, tool-call correctness, schema
  validity, groundedness/faithfulness of a single response.
- **Trajectory level:** did the agent take a sensible path? Steps-to-solution,
  redundant/looping actions, wrong-tool rate, recovery-after-error, cost per
  successful task.
- **Outcome level:** task success, regression against frozen fixtures, human
  preference (pairwise).

### Metric types
- Deterministic checks (assertions, schema, exact/substring, compile/run).
- Reference-based (embedding similarity, ROUGE/BLEU — note limits).
- Reference-free LLM-as-judge (rubric-scored, pairwise).
- Process metrics (latency, tokens, $, tool-call count) alongside quality.

### Trajectory / process metrics (the non-obvious bit)
- Trajectory match vs. golden path when one exists; otherwise judge the
  *reasoning* not just the answer.
- Loop detection, tool-selection accuracy, error-recovery rate, over-tooling.

### Baselines — how it differs by problem type
- **Code review agent:** precision/recall of findings vs. labeled defects,
  false-positive rate (the killer metric), actionability.
- **RAG / QA:** groundedness, retrieval recall@k, hallucination rate.
- **Codegen:** pass@k, mutation-kill rate on generated tests, build/lint pass.
- **Classification/extraction:** standard P/R/F1 — the easy case; contrast with
  the open-ended cases above to show why agents are harder.
- Point: the metric set changes with the problem; there is no single dashboard.

### What goes into CI
- Fast deterministic tier runs per-PR (assertions, schema, smoke evals).
- Judge/pairwise tier runs on merge or nightly (cost/latency too high per-PR).
- Frozen regression fixtures block merge on failure.
- Mutation gate on AI-authored test suites.
- Canary suite tracked over time for drift; alert on distribution shift.

## Mutation testing thread
- Why it's back: AI writes code *and* tests; unreviewed tests can assert
  nothing. Coverage lies; mutation score doesn't.
- Operators to show live: boundary flip (`>`→`>=`), statement deletion,
  condition negation, return-value swap.
- Wire as a harness gate; keep it cheap by scoping to changed files.

## Grounding assets (from my work)
- AI code-review agent + knowledge graphs across 14,000 repos.
- AI gateway over LiteLLM (DevX wrappers) — orchestration/cost story.
- Distillation / SLM / auto-research experiments — "what's next" slide only
  (not in prod; keep out of the credibility core).

## Open decisions
- [ ] Direction 1 vs 2 (see top).
- [ ] Talk length / slot (affects how deep on trajectory metrics).
- [ ] Live demo? (mutation test kill on an AI-written test is the strongest.)
