# Current numbers: re-recorded with the new C03 and C06 questions (2026-11-20, 2026-11-20T04:13Z and 04:15Z in the result files)

**Use the numbers in this top section. Everything below it is history.**

What changed: `cases.js` replaced two questions. C03 is now "I'm buying a ₹24,999 phone on Flipkart" (was ₹8,000); winner `hdfc_swiggy`, reward 1249.95. C06 is now "Recharging my Airtel postpaid plan, ₹599" (was ₹500); winner `idfc_first_power_plus`, reward 29.95. C01, C02, C04, C05 are unchanged, and the card rates are unchanged. The `rank_cards` outputs for C03 and C06 changed with the amounts, so the earlier recordings held stale queries and tool outputs. Both modes were re-recorded with the real model. The previous result files were moved by the recorder to `benchmarks/superseded/` (gitignored) and copied to `/tmp/backup-spike2/`.

Setup (from `meta` and `benchmark` in the two result files): Qwen2.5-1.5B-Instruct-q4f16_1-MLC, WebLLM 0.2.79, worker engine, Chrome/157.0.8103.79 headless, Apple M4 Max 64 GB, prompt v2, temperature 0.7, seeds `1000 + runIndex`, `max_tokens` 160, 4 steps max, 6 cases x 5 runs = 30 runs per mode. Driver: `record-runs.mjs` (profile `/tmp/evals-lab-profile`, weights already cached: load 1.8 s free, 1.6 s constrained, storage delta 0). Numbers come from the result files and `node scripts/summarize-recorded-runs.mjs`.

| | free (JSON mode) | constrained (schema) | previous C03/C06: free | previous C03/C06: constrained |
|---|---|---|---|---|
| task_success | 18/30 = 60.0% | 23/30 = 76.7% | 23/30 = 76.7% | 26/30 = 86.7% |
| per-step accuracy | 66.0% | 86.7% | 85.9% | 95.6% |
| careful agent's checker (`verifyRun`) accepts | 15/30 = 50.0% | 22/30 = 73.3% | 20/30 = 66.7% | 26/30 = 86.7% |
| failure kinds | wrong_card 6, no_final_answer 6 | wrong_card 5, wrong_args 2 | wrong_card 6, no_final_answer 1 | wrong_card 4 |
| benchmark wall time | 64.7 s | 71.9 s | 67.3 s | 67.9 s |

task_success per case (5 runs each):

| case | C01 | C02 | C03 | C04 | C05 | C06 |
|---|---|---|---|---|---|---|
| free | 3/5 | 5/5 | 1/5 | 5/5 | 4/5 | 0/5 |
| constrained | 3/5 | 5/5 | 2/5 | 5/5 | 5/5 | 3/5 |
| previous C03/C06, free | 3/5 | 5/5 | 1/5 | 5/5 | 4/5 | 5/5 |
| previous C03/C06, constrained | 3/5 | 5/5 | 3/5 | 5/5 | 5/5 | 5/5 |

Careful (guarded) agent, replaying each case's 5 constrained runs as the first attempt (`makeReplayChat` through `runGuarded`, via `summarize-recorded-runs.mjs`), 30 replays: passed_first_try 22, passed_after_retry 7, fixed_by_fallback 1, refused 0. Per case, first try / after retry / fallback: C01 3/2/0, C02 5/0/0, C03 2/2/1, C04 5/0/0, C05 5/0/0, C06 2/3/0. Previous C03/C06: 26 first try, 4 retry, 0 fallback.

Checks on `recorded-runs.json`: 30 free + 30 constrained runs, every `caseId` in C01-C06, 133 tool steps whose `output` all equal what the current `runTool` returns (0 differ). `dspy-prompt.json` and `tools-export.json` were regenerated (the DSPy prompt embeds C03: now ₹24,999).

Wrong final answers (from the result files): free, 12: C01 picked `hdfc_infinia` twice (499.5); C03 picked `hdfc_amazon_pay` (not a card id, 249.99), `idfc_first_power_plus` twice (125) and `icici_amazon_pay` (249.99); C05 gave no final answer once; C06 gave no final answer 5 times. Constrained, 7: C01 picked `hdfc_infinia` twice (499.5); C03 picked `icici_amazon_pay` twice (249.99) and `hdfc_infinia` once (832.47); C06 picked `hdfc_infinia` twice (19.95).

Why free C06 is 0/5: in the 3 free C06 runs inspected, the model passed the whole phrase ("Airtel postpaid plan recharging") to `classify_merchant`, got "unknown merchant", guessed a category that does not exist ("recharging", "rechargeable"), got "unknown category", and used up the 4 steps. Constrained decoding fixes the category names (the enum) but 2 of 5 runs still picked Infinia.

Reading: both rates dropped (free 76.7 to 60.0, constrained 86.7 to 76.7), almost all of it in C06 (free 5/5 to 0/5, constrained 5/5 to 3/5). The "Airtel postpaid plan" wording is harder for this model than "Airtel" with ₹500. 5 runs per case is a small sample (one run moves a cell by 20 points). The free to constrained gap is 16.7 points on 30 runs each; each rate has a 95% interval of about +-17 points, so the two intervals overlap. The careful agent's 30 replays all end with a right answer (22 first try, 7 after a retry, 1 by the fallback, 0 refused), but it needs a retry or fallback in 8 of 30 cases. Treat the pass rates as "lower than before, same ordering free < constrained < careful".

---

# History: re-recorded on the Infinia 3.33% key, old C03 (₹8,000 phone) and C06 (₹500 Airtel) (2026-11-20 IST, 2026-11-19T19:17Z in the result files)

> **History.** Superseded by the section above. The numbers are kept as they were. Do not quote them.

What changed: `cases.js` raised HDFC Infinia from 1% to 3.33% in amazon, online_shopping, swiggy, utilities and telecom (fuel_hpcl stays 0). The expected winner and reward of C01-C06 did not change. `rank_cards` now returns different Infinia numbers, so the earlier recordings held stale tool outputs. Both modes were re-recorded with the real model; the previous files (Infinia 1%) are kept in `old-key-infinia-1pct/`.

Setup (from `meta` and `benchmark` in the two result files): Qwen2.5-1.5B-Instruct-q4f16_1-MLC, WebLLM 0.2.79, worker engine, Chrome/157.0.8103.79 headless, Apple M4 Max 64 GB, prompt v2, temperature 0.7, seeds `1000 + runIndex`, `max_tokens` 160, 4 steps max, 6 cases x 5 runs = 30 runs per mode. Driver: `record-runs.mjs` (profile `/tmp/evals-lab-profile`, weights already cached: load 2.8 s free, 2.1 s constrained, storage delta 0). Numbers come from the result files and `node scripts/summarize-recorded-runs.mjs`.

| | free (JSON mode) | constrained (schema) | previous key (Infinia 1%): free | previous key (Infinia 1%): constrained |
|---|---|---|---|---|
| task_success | 23/30 = 76.7% | 26/30 = 86.7% | 24/30 = 80.0% | 29/30 = 96.7% |
| per-step accuracy | 85.9% | 95.6% | 87.0% | 98.9% |
| careful agent's checker (`verifyRun`) accepts | 20/30 = 66.7% | 26/30 = 86.7% | 22/30 = 73.3% | 29/30 = 96.7% |
| failure kinds | wrong_card 6, no_final_answer 1 | wrong_card 4 | wrong_card 5, no_final_answer 1 | wrong_card 1 |
| benchmark wall time | 67.3 s | 67.9 s | 68.5 s | 176.3 s |

task_success per case (5 runs each):

| case | C01 | C02 | C03 | C04 | C05 | C06 |
|---|---|---|---|---|---|---|
| free | 3/5 | 5/5 | 1/5 | 5/5 | 4/5 | 5/5 |
| constrained | 3/5 | 5/5 | 3/5 | 5/5 | 5/5 | 5/5 |
| previous key, free | 3/5 | 5/5 | 3/5 | 5/5 | 4/5 | 4/5 |
| previous key, constrained | 4/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 |

Careful (guarded) agent, replaying each case's 5 constrained runs as the first attempt (`makeReplayChat`), 30 replays: passed_first_try 26, passed_after_retry 4, fixed_by_fallback 0, refused 0. Retries: C01 2, C03 2. Previous key: 29 first try, 1 retry, 0 fallback.

Checks on `recorded-runs.json`: 30 free + 30 constrained runs, every `caseId` in C01-C06, 123 tool steps whose `output` all equal what the current `runTool` returns (0 differ). `dspy-prompt.json` and `tools-export.json` were regenerated too (Infinia `rate_pct` 3.33 in the embedded tool output).

Wrong final answers (from `recorded-runs.json`): free, 7: C01 picked `hdfc_infinia` twice (499.5), C03 picked `idfc_first_power_plus` twice (40) and `icici_amazon_pay` twice (80), C05 gave no final answer once. Constrained, 4: C01 picked `hdfc_infinia` twice (499.5), C03 picked `hdfc_infinia` once (266.4) and `icici_amazon_pay` once (80). So `hdfc_infinia` is now the wrong pick in 3 of the 4 constrained failures; in the free runs it is 2 of 7.

Reading: both rates dropped (free 80.0 to 76.7, constrained 96.7 to 86.7), mostly in C01 and C03. 5 runs per case is a small sample (one run moves a cell by 20 points), and the free to constrained gap is 10.0 points on 30 runs each, inside the interval (about +-14 points). Treat the drop as "similar to before, a bit lower", not as a measured effect of the Infinia change.

---

# S1 model benchmark: results (rounds 1 and 2) (OLD KEY, 12 cases)

> **OLD KEY.** Every number from here down to the section "Re-run after the answer-key fix" was measured on the old 12-case table against the old, wrong answer key (72% free, 83% constrained). They are kept only for history. Do not quote them. Current numbers are in the top section.

Every number below comes from a saved `benchmarks/results-*.json` file. Nothing is estimated.

Setup: Chrome 157.0.8103.79 headless (no window opened), Apple M4 Max 64 GB, WebLLM 0.2.79 (pinned), worker engine,
12 cases x 5 runs (60 runs) unless the `runs` column says 36 (12 cases x 3 runs), seeds `1000 + runIndex`,
`max_tokens` 160, 4 steps max per run, `shader-f16` available (`true` in every result file, so the `q4f16_1` builds ran).

## Revised gate (OLD KEY)

**Is there a configuration (model, constrain on/off, temperature) where task_success lands between 30% and 80%, and do the knobs visibly move it?**

**Yes, on both counts, with one model class: 1B to 1.5B.** Nothing at or below 0.5B gets above 0%.

| configuration | task_success | 95% interval (Wilson) | in 30-80%? |
|---|---|---|---|
| Qwen2.5-1.5B, JSON mode only (free), T 0.7 | 71.7% (43/60) | 59-81 | yes |
| Qwen2.5-1.5B, schema (constrained), T 0.7 | 83.3% (50/60) | 72-91 | no, 3 points above, interval straddles 80 |
| Llama-3.2-1B, schema, T 0.7 | 38.3% (23/60) | 27-51 | yes |
| Llama-3.2-1B, JSON mode only, T 0.7 | 3.3% (2/60) | 1-11 | no |
| SmolLM2-360M, Qwen2.5-0.5B, any setting | 0% (0/60) | 0-6 | no |

- **Constrain moves the pass rate.** Llama-3.2-1B: 3.3% to 38.3% (+35 points). Qwen2.5-1.5B: 71.7% to 83.3% (+12 points, intervals overlap, so treat it as a small lift). For models of 0.5B and below it moves the failure kind but not the rate (0% stays 0%).
- **Temperature moves the pass rate only a little, and moves the spread more.** Qwen2.5-1.5B constrained: 83.3% (T 0.2, 36 runs), 83.3% (T 0.7, 60 runs), 77.8% (T 1.0, 36 runs). That is flat within noise (each interval is about +-12 points). Llama-3.2-1B constrained: 36.1% (T 0.2), 38.3% (T 0.7), 16.7% (T 1.0). T 1.0 clearly hurts Llama; T 0.2 vs 0.7 does not.
- **Spread across the 12 cases** (first 3 seeds only, so cells compare like for like). Qwen2.5-1.5B constrained, cases that are sometimes right and sometimes wrong: 0 of 12 at T 0.2, 2 of 12 at T 0.7. Qwen free at T 0.7: 4 of 12. At T 0.2 the model is nearly deterministic, so the run-to-run mix the talk wants mostly disappears. Use T 0.7.
- Caveat on precision: with 60 runs the interval is about +-10 points. "83% vs 80%" is not a real difference.

## Table: all runs (OLD KEY)

`traj` = trajectory, `ans` = answer_match, `grnd` = grounded, `recall` / `prec` = tool_recall / tool_precision, `ops` = ops pass rate.
`JSON valid` = valid steps / all steps. `download MB` is the `storage.estimate()` delta (decimal MB) and is only honest when the profile started empty;
`cached` means the weights were already in the reused browser profile, so the delta is about 0. `load s` includes the network time of a first download, and the link here ran at about 2 MB/s, so first-load times are network bound.

| model | prompt | decoding | temp | runs | **task_success** | traj | ans | grnd | recall | prec | ops | JSON valid | steps/run | ms/run | load s | download MB | wall s |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Qwen2.5-0.5B | v1 | not recorded | 0.7 | 60 | **0%** | 0% | 0% | 27% | 0% | 100% | 100% | 100% | 1.0 | 899 | 35 | 289 | 53 |
| SmolLM2-360M | v1 | not recorded | 0.7 | 60 | **0%** | 0% | 0% | 67% | 0% | 90% | 67% | 55% | 2.0 | 3665 | 63 | 211 | 219 |
| SmolLM2-360M | v2 | json_object | 0.7 | 60 | **0%** | 0% | 0% | 17% | 0% | 37% | 72% | 72% | 3.5 | 4824 | 22 | 211 | 289 |
| SmolLM2-360M | v2 | schema (`oneOf`, not enforced) | 0.7 | 60 | **0%** | 0% | 0% | 25% | 0% | 38% | 80% | 81% | 3.2 | 4899 | 105 | 211 | 293 |
| Qwen2.5-1.5B | v2 | schema (`oneOf`, not enforced) | 0.7 | 60 | **2%** | 0% | 2% | 2% | 25% | 8% | 92% | 93% | 4.0 | 4503 | 424 | 880 | 270 |
| SmolLM2-360M | v2 | schema (`anyOf`) | 0.7 | 60 | **0%** | 0% | 0% | 0% | 67% | 3% | 92% | 94% | 4.0 | 4428 | 1 | cached | 265 |
| Qwen2.5-0.5B | v2 | schema (`anyOf`) | 0.7 | 60 | **0%** | 0% | 0% | 0% | 100% | 0% | 100% | 100% | 4.0 | 2700 | 80 | partial cache (178) | 161 |
| Llama-3.2-1B | v2 | json_object | 0.7 | 60 | **3%** | 0% | 0% | 15% | 38% | 80% | 93% | 97% | 2.6 | 1587 | 1 | cached | 95 |
| Llama-3.2-1B | v2 | schema (`anyOf`) | 0.7 | 60 | **38%** | 0% | 8% | 53% | 53% | 60% | 100% | 100% | 2.9 | 2096 | 313 | 709 | 125 |
| Llama-3.2-1B | v2 | schema (`anyOf`) | 0.2 | 36 | **36%** | 3% | 11% | 44% | 53% | 58% | 97% | 99% | 3.0 | 1724 | 2 | cached | 62 |
| Llama-3.2-1B | v2 | schema (`anyOf`) | 1.0 | 36 | **17%** | 0% | 8% | 31% | 56% | 47% | 100% | 100% | 3.1 | 1785 | 1 | cached | 64 |
| Qwen2.5-1.5B | v2 | json_object | 0.7 | 60 | **72%** | 87% | 43% | 90% | 97% | 87% | 95% | 98% | 3.1 | 3559 | 2 | cached | 213 |
| Qwen2.5-1.5B | v2 | schema (`anyOf`) | 0.7 | 60 | **83%** | 92% | 52% | 100% | 100% | 100% | 100% | 100% | 3.0 | 4612 | 393 | 880 | 276 |
| Qwen2.5-1.5B | v2 | schema (`anyOf`) | 0.2 | 36 | **83%** | 89% | 58% | 97% | 100% | 97% | 97% | 99% | 3.0 | 3355 | 1 | cached | 120 |
| Qwen2.5-1.5B | v2 | schema (`anyOf`) | 1.0 | 36 | **78%** | 89% | 53% | 100% | 100% | 100% | 100% | 100% | 3.0 | 3333 | 2 | cached | 120 |

VRAM class (from the WebLLM model list figures given in the task, not re-measured here): Llama-3.2-1B about 879 MB, Qwen2.5-1.5B about 1630 MB.
I did not look up the VRAM figures for SmolLM2-360M and Qwen2.5-0.5B.

Files: `results-<model>-<prompt>-<constrained|free>-t<temp>.json`. The three round-1 files keep their original names
(`results-Qwen2.5-0.5B-Instruct-q4f16_1-MLC.json`, `results-SmolLM2-360M-Instruct-q4f16_1-MLC.json`, `...-MLC-v2.json`).
The two `...-constrained-oldschema-t0.7.json` files are the runs with the broken `oneOf` schema (below). They are kept as evidence, not as results.
`free` means JSON mode only (`response_format: {type: "json_object"}`). `constrained` adds the schema.
Round-1 `v1` files did not record whether JSON mode was on, so the column says "not recorded".

## What went wrong on the way (worth knowing before building on it) (OLD KEY)

1. **`oneOf` is not enforced by WebLLM 0.2.79; `anyOf` is.** My first schema used a top-level `oneOf`. Results: SmolLM2 still invented tools (`excel_bracket`, `processCard`), and Qwen2.5-1.5B wrote junk keys (`{"tool": "classify_merchant","} {": "Amazon"}`) and scored 2%. A probe against the engine (same SmolLM2 weights, temperature 0.7) showed: a flat object with an `enum` is enforced; `oneOf` gave `{}`; `anyOf` enforced the enums. The final schema (`STEP_SCHEMA` in `agent-step.js`) therefore uses `anyOf`, `additionalProperties: false` on every object, and the two real `args` shapes (`{merchant}` or `{amount, category}` with `category` as an enum). A bare `args: {type: "object"}` let the model write junk keys.
2. **A reused browser profile caches the ES modules.** One SmolLM2 re-run silently executed the old `agent-step.js`. `run-benchmark.mjs` now calls `page.setCacheEnabled(false)`. That run was an exact duplicate of the `oldschema` file, so I deleted it. The model weights live in the Cache API, which that switch does not touch.
3. **Downloads dominate wall time.** The network ran at about 2 MB/s, so Qwen2.5-1.5B took 393 s to load the first time. The benchmark itself (60 runs) took 95-276 s depending on the model. The session ran well past the 35 minute time-box for this reason plus the two re-runs above.

## Raw model outputs per failure kind (trimmed; newlines removed; all from the saved JSON `failureExamples`) (OLD KEY)

**Skips the tools and invents a card** (Qwen2.5-0.5B, prompt v1, case C01, seeds 1000-1002; 60 of 60 runs failed this way):
```
{"final":{"card":"MasterCard","reward_inr":1500,"reply":"I should use MasterCard"}}
{"final":{"card":"Credit Card 1","reward_inr":0,"reply":"I should use Credit Card 1"}}
{"final":{"card":"VISA","reward_inr":1500,"reply":"I should use Visa as it is the best option for you."}}
```

**Invents tools** (SmolLM2-360M, prompt v2, JSON mode only, 12 `wrong_tool` + 15 `invalid_json`):
```
C01: {"tool":"use_amazon","args":{"amount":0, "category":"Amazon","currency":null}}
C03: {"tool":{"merchant":"DMart","amount":"₹2000"},"final":{"card":"D2","reward_inr":2000}}
C01: {"tool":"use_card","args":{"card":"<Card Name>>","amount":15000}}  then  {"tool":"use_card","args":{"comment":"Card Name and Amount"},"error":{"tool":{"error":"Unknown Tool: use_card}", ...
```

**Schema not enforced (`oneOf`)** (59 of 60 Qwen2.5-1.5B runs and all 60 SmolLM2 runs failed):
```
Qwen1.5B C01: {"tool": "classify_merchant","} {": "Amazon"}
Qwen1.5B C01: {"tool": "classify_merchant",": ": "Amazon"}
SmolLM2  C01: {"tool": "CardRankCardRankCard Buckets","args": {"amount": "15000"},"final": {"Card": "Card","Card": "Card"},"Card": "Card"}
```

**Valid steps, no final answer** (Qwen2.5-0.5B, schema `anyOf`: the tool names are now legal, but it loops back to `classify_merchant` and never writes `final`; 60 of 60 runs):
```
C01 step1: {"tool": "rank_cards","args": {"amount": 15000,"category": "groceries"}}
C01 step2: {"tool": "classify_merchant","args": {"merchant": "Amazon"}}
C01 step3: {"tool": "rank_cards","args": {"amount": 15000,"category": "online_shopping"}}   (step 4: classify_merchant again)
```

**Wrong card: picks the card named after the merchant instead of the first ranked card** (Qwen2.5-1.5B, schema; 7 failures, all C01):
```
C01: classify_merchant(Amazon) -> rank_cards(15000, online_shopping) -> {"final":{"card":"icici_amazon_pay","reward_inr":150,"reply":"You should use the ICICI Amazon Pay card for your purchase. It offers a reward of ₹150."}}
C01: ... {"final":{"card":"icici_amazon_pay","reward_inr":150,"reply":"The ICICI AMZ Pay credit card is the best choice for purchasing on Amazon. ..."}}
C01: ... {"final":{"card":"icici_amazon_pay","reward_inr":150,"reply":"You should use the ICICI Amazon Pay card as it offers the highest reward of ₹150."}}
```
The expected card is `idfc_first_power_plus` (15% on online shopping). The number 150 is the reward of the card it picked, taken from the real tool output, so it passes `grounded` and fails `task_success`. This is a real decision error, which is what the eval should show.

**Wrong args: right tool, wrong category** (Qwen2.5-1.5B, schema; 3 failures, all C12, merchant "Jio" is telecom):
```
C12: rank_cards {"amount": 700,"category": "travel"}         -> final idfc_first_power_plus, 105
C12: rank_cards {"amount": 700,"category": "fuel"}           -> final hdfc_infinia, 7
C12: rank_cards {"amount": 700,"category": "online_shopping"} -> final icici_amazon_pay, 7
```
It ignored the `classify_merchant` result. It also passed "Jio Recharge" instead of "Jio" as the merchant, so the tool answered with an error output.

**Truncated final answer = invalid JSON** (Qwen2.5-1.5B, JSON mode only; 3 failures; the reply is long and `max_tokens` 160 cuts it off, then the model restarts at step 1):
```
C05: {"final":{"card":"hdfc_infinia","reward_inr":30,"reply":"The best card for purchasing fuel at IndianOil is the HDFC Infinia card. It offers a reward of ₹30 for every ₹3000 spent. Please note that the HDFC Infinia card has a 1% rew
C09: {"final":{"card":"icici_amazon_pay","reward_inr":48,"reply":"For a BESCOM electricity bill, the ICICI Amazon Pay card is the best option with a reward of ₹48. It offers a better reward rate of 2% compared to other cards. Additiona
```

**Skips `classify_merchant` and answers with an invented card** (Llama-3.2-1B, JSON mode only, 36 `wrong_tool` of 60):
```
C01: {"tool":"classify_merchant","args":{"merchant":"Amazon"}}  then  {"final":{"card":"Amazon Pay Card","reward_inr":1.2,"reply":"Get 1.2 INR rewards per ₹1 spent on Amazon purchases"}}
C02: {"tool":"classify_merchant","args":{"merchant":"Swiggy","category":"Food Delivery"}}  then  {"final":{"card":"Ola Money Card","reward_inr":3.20,"reply":"Get 3.20 INR reward on your order"}}
C01: {"tool":"rank_cards","args":{"amount":15000,"category":"online_shopping"},"final":{"card":"Visa Credit Card","reward_inr":6000.00,"reply":"Buy online ...
```

**Copies the prompt placeholder; skips a step** (Llama-3.2-1B, schema):
```
C04: {"tool": "classify_merchant","args": {"merchant": "<merchant name from the question>"}}  then  rank_cards(500, groceries) twice, then {"final":{"card":"idfc_first_power_plus","reward_inr":7.5,"reply":"bill is paid"}}
C02: {"tool": "rank_cards","args": {"amount": 800,"category": "food_delivery"}}  then  {"final":{"card":"hdfc_infinia","reward_inr":8,"reply":"Best card for food delivery order on Swiggy"}}
```
In the second case it guessed the category and skipped `classify_merchant`, then picked `hdfc_infinia` over the Swiggy card.

## Recommendation for the app (OLD KEY)

- **Model id: `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`.** It is the only candidate that lands in the band without help (72% free), has the best-behaved failures (real decisions, not format collapse), and fits the "tiny browser model" story. Llama-3.2-1B only works with the schema (3% free, 38% constrained) and saves about 170 MB of download, so it is the fallback, not the default.
- **Default temperature: 0.7.** At 0.2 the model is nearly deterministic (no case with a run-to-run mix), at 1.0 Llama drops to 17% and Qwen to 78%. 0.7 keeps both a mix across runs and a usable pass rate.
- **Constrain: default OFF, offer it as a toggle.** Free Qwen sits at 72%, inside the band, and shows more kinds of failure (wrong card, truncated JSON, loops), which is richer for an eval demo. Turning constrain on lifts it to 83% and removes the format failures (JSON valid 98% to 100%, tool_precision 87% to 100%), leaving only real decisions. That is a clean "guardrail lift" moment. Constrain adds latency (4.6 s vs 3.6 s per run here, partly from the pretty-printed JSON the grammar produces).
- **Load-model text:** "Downloads about 880 MB once, then loads from your browser cache in a few seconds. Needs WebGPU (recent Chrome or Edge) and about 1.6 GB of GPU memory. On a slow connection the first load can take several minutes (6.5 minutes at about 2 MB/s in our test)."
- **Use at least 5 runs per case in the UI.** The 95% interval at 60 runs is about +-10 points; at 36 runs it is about +-12.
- **Not changed, but worth a look by the integrator:** `maxTokens` 160 cuts off long `reply` fields (3 of 60 free Qwen runs). Either raise it to about 256 or tell the model "reply: one short sentence" more firmly. The schema grammar emits pretty-printed JSON with newlines, so `raw` strings contain `\n`; render them in a `<pre>`.

## Next cheapest changes (only if the demo needs the constrained pass rate lower or the mix wider) (OLD KEY)

1. Make the task slightly harder in code, not in the prompt: let code run `classify_merchant` itself and have the model only choose from the ranked list, or add a distractor card name. Not needed now; C01 already works as a built-in distractor (the "Amazon" merchant pulls the model to `icici_amazon_pay`).
2. If the constrained pass rate must come down under 80%, use the free setting (72%) or Llama-3.2-1B constrained (38%) as the demo default.


## Re-run after the answer-key fix (2026-11-19) (SUPERSEDED: Infinia was 1% here, see the top section)

**The earlier 12-case numbers (72% free, 83% constrained) were measured against the old, wrong answer key and are kept above only for history. Use the numbers in this section.**

What changed: `cases.js` now has 6 cases (C01-C06) with cited card rates, ties accepted (`expected.accept`) and finer categories. The 120 old recorded runs (12-case files) were re-recorded on the new table; those 12-case files were later overwritten by mistake during the 2026-11-20 re-record and no longer exist.

Setup (from the `meta` and `benchmark` fields of the two new result files): Qwen2.5-1.5B-Instruct-q4f16_1-MLC (shader-f16 present), WebLLM 0.2.79 pinned, worker engine, Chrome/157.0.8103.79 headless, Apple M4 Max, 64 GB, macOS 26.7.2, prompt v2, temperature 0.7, seeds `1000 + runIndex`, `max_tokens` 160 and 4 steps max (agent-step.js defaults), 6 cases x 5 runs = 30 runs per mode. Driver: `record-runs.mjs` (request interception serves the repo from disk, so no web server is needed; profile `/tmp/evals-lab-profile`). Numbers below come from `node scripts/summarize-recorded-runs.mjs`, which uses the current `engine.js` (tie-aware `task_success`) and `guarded-agent.js`.

| | free (JSON mode) | constrained (schema) |
|---|---|---|
| model load | 402.0 s (first load, 880 MB downloaded) | 1.6 s (cached) |
| benchmark wall time | 68.5 s | 176.3 s |
| task_success | 24/30 = 80.0% | 29/30 = 96.7% |
| per-step accuracy | 87.0% | 98.9% |
| careful agent's checker (`verifyRun`) accepts | 22/30 = 73.3% | 29/30 = 96.7% |
| failure kinds | wrong_card 5, no_final_answer 1 | wrong_card 1 |

task_success per case (5 runs each):

| case | C01 | C02 | C03 | C04 | C05 | C06 |
|---|---|---|---|---|---|---|
| free | 3/5 | 5/5 | 3/5 | 5/5 | 4/5 | 4/5 |
| constrained | 4/5 | 5/5 | 5/5 | 5/5 | 5/5 | 5/5 |

Careful (guarded) agent, replaying each case's 5 constrained runs as the first attempt (`makeReplayChat`, same method as `guarded-agent.test.mjs`), 30 replays: passed_first_try 29, passed_after_retry 1, fixed_by_fallback 0, refused 0. The one retry was in C01.

Checks on `recorded-runs.json`: 30 free + 30 constrained runs, every `caseId` in C01-C06, and 123 tool steps whose `output` all equal what the current `runTool` returns for that tool and args (0 differ).

Reading: the gap between free and constrained is 16.7 points on 30 runs each, so the intervals overlap (about +-14 points at this sample size). Treat it as a likely lift, not a measured effect size. The constrained rate (96.7%) is above the 30-80% band set in the original gate; the free rate (80.0%) sits on its upper edge.
