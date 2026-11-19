# You Can't Improve What You Can't Measure

**Evals, Harnesses, and Silent Failure in Production Agents**

- **Event:** EI India, Pune 2026 (November)
- **Status:** Abstract locked. Outline + slides pending.

---

## Abstract

Most agent projects clear the demo bar and stall: a prompt is reworded, a model
swapped, a tool added — with no reliable signal for whether the system improved
or quietly regressed. Classic testing assumes deterministic output and a
known-correct answer; agents offer neither. This talk covers the engineering
that fills that gap — evaluating non-deterministic systems without a golden
dataset, catching silent degradation before users do, and treating model choice,
cost, and security as harness concerns rather than prompt-level afterthoughts.
Patterns are drawn from running an agent fleet at org scale (an AI code-review
agent and knowledge-graph tooling across 14,000 repos), and every technique is
reproducible with open tooling.

## What it covers

- **Evals without golden data** — the eval ladder (assertions → embedding
  similarity → LLM-as-judge with a rubric → pairwise Elo/Bradley–Terry);
  bootstrapping eval sets from production traces and big-vs-small model
  disagreement; freezing every failure into a regression fixture.
- **Calibrating the judge** — rubric decomposition, position/verbosity-bias
  mitigation, and measuring judge reliability (Cohen's κ) against human
  spot-checks.
- **Silent degradation** — pinned canary suites, scoring distributions over
  means, drift detection (PSI/KL), judge-rationale logging, and span-level
  tracing to attribute a quality drop to a specific step.
- **Testing AI-written tests** — mutation testing (boundary flips, statement
  deletion, condition negation) as a harness gate that replaces "coverage
  exists" with "tests actually kill mutants."
- **Orchestration & cost** — verifier-gated cascades (cheap-first, escalate on
  low confidence) and the token/latency/accuracy math behind small-vs-large and
  distillation/SLMs.
- **Security in the harness** — planner/executor separation, tool allowlisting,
  untrusted tool output, spotlighting external content, and scoped/read-only
  credentials to limit blast radius.

## Key takeaways

- Agent evaluation is a distribution problem, not pass/fail — measure spread and
  drift, not one accuracy number.
- A usable eval set can be built from traces and model disagreement, with zero
  hand-labeled data.
- An LLM judge is an instrument; calibrate it against humans before trusting its
  scores.
- Mutation testing is the fastest way to expose AI-generated tests that assert
  nothing.
- Verifier-gated cascades beat "always bigger" on cost and latency without
  losing quality.
- Injection and blast-radius controls belong in the harness; prompts are not a
  security boundary.
