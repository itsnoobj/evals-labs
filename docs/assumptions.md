# Assumptions and open items

| # | Item | Status | Value |
|---|---|---|---|
| Q1 | Replay mode for visitors without WebGPU | assumed | yes, recorded real runs (built, `recorded-runs.json`) |
| Q2 | Model choice | resolved by spike | Qwen2.5-1.5B-Instruct q4f16_1 (fallback q4f32_1 without shader-f16). 360M and 0.5B score 0%. |
| Q3 | Judge lab | assumed | v1.1. The rubric judge x5 button ships in v1. |
| Q4 | Location and deploy | assumed | `evals-lab/` in this folder, GitHub Pages in S8 |
| Q5 | Scenario | assumed | card picker, 4 cards trimmed from card-use-agent |
| Q6 | Visual style | confirmed | square, flat, minimal like `entain/ai/incident-review`, FE only |
| Q7 | Worktree per slice | deviation | not used. See decisions.md. |
| Q8 | "Tiny model" now means 1.5B (about 880 MB download) | open | Smaller models cannot do the task at all (0%). Say if 880 MB is too heavy for the venue; fallback is recorded runs only. |
| Q9 | Retry line on the Compounding screen assumes a checker catches every wrong step | open | Labeled "best case" on the page. Change if you want a stricter model. |

| Q10 | New default screen "Start" with task diagram and missions | assumed | User said the UI is unintuitive and asked for a visual of the task plus the concepts. Change if you want the diagram only on the Run screen. |
| Q11 | Golden set is 6 verified cases, not 12 | assumed | Only cases whose winner holds under the unverified rate cells are kept (`docs/answer-key-audit.md`). C01 is a tie, so two cards are accepted. Change if you want more cases, at the cost of unverified rates. |
| Q12 | Infinia valued at Rs 1 per reward point (3.33%), not Rs 0.30 statement credit (1%) | confirmed (user, 2026-11-20) | Rs 1/RP only for SmartBuy flights and hotels, airmiles (Livemint, Paisabazaar, CardInsider; official T&C PDF unreadable, snippet only). Winners of C01-C06 unchanged. |
| Q13 | Infinia 3.33% is its best value (travel redemption); add an "at its best" note beside it on the rates table | open | Default: yes (5 min). |
| Q14 | Recorded runs: 5 per case is noisy (free 76.7%, constrained 86.7%) | open | Default: re-record with 10 per case (about 15 min of model time). |
| Q15 | "Guardrails" = rule checks before the model (empty or long text, card number or OTP, prompt injection, off-topic) and after it (secret in reply, reward above amount, unknown card, leaked prompt, guarantee claims). Careful agent only. | assumed | You said "add guardrails" without detail. Change the rule list in `guardrails.js` if you want others. |
| Q16 | Typed questions have no answer key, so key-based checks show NOT RUN; replay mode cannot run them through the model | assumed | Only the guardrail block works in replay. |

Q1-Q5 were not answered in the review page. User said "lets start work", so the defaults were used.
