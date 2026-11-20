# Judge calibration: can prompt tweaks make the small LLM judge agree with ground truth?

Question from the owner: the planned "LLM judge lab" (v1.1) is only worth building if a learner can tweak the judge (prompt, rubric, examples) and see its agreement with known-good labels improve. Today the judge (Qwen2.5-1.5B-Instruct through WebLLM, grades 0 to 5, see `evals-lab/src/agent/ai-grader.js` and `docs/decisions.md`) gave 5 of 5 to every run. This file tests that before any UI work, as an eval: bar first, dev/test split, frozen design, hash check (same discipline as `docs/research/ask-help-guarded.md`).

**Result: the bar is missed on TEST (section 8).** The frozen variant T3 (binary verdict, ordered-check rubric, 6 worked examples) reached kappa 0.25 (bar >= 0.40), false-pass 55.0% (bar <= 20%) and 66.0% agreement, 7.5 points below the lab's current judge J0 on the same items (73.6%; bar: 20 points above). On DEV, where it was tuned, it had kappa 0.69 and 85.1%. Recommendation (section 9): do not build the tune-the-judge lab on this model as specified; if a judge lab is built, make it a read-only replay of these measurements.

Status: sections 1 to 6 were written at **2026-11-20T15:43Z**, before any model call of this experiment. Later sections are appended in the order the work happened, each with its timestamp.

## 1. Ground truth (gold labels)

Deterministic, from the rule-based checks of `evals-lab/src/evals/engine.js` (`scoreRun`): **gold = PASS if `task_success` AND `grounded` both pass, else FAIL.** `task_success` = the final card is an accepted card and the final reward equals the top reward (within 0.5). `grounded` = every number in the reply and the final reward is in a tool output or the question. A run with no final answer is FAIL.

This is **not human labelling.** The rules are exact and cheap, which makes the label noise-free, but it changes three things:

- A learner of the lab would label by their own taste. Their labels can disagree with the rules (for example, they may fail a rambling reply, or pass a run that skipped a tool). Agreement with rule labels is the easy case. With human labels the ceiling is lower, because humans disagree with each other.
- The current judge prompt (J0) asks for relevance, groundedness and clarity. The gold does not measure clarity or relevance. So J0 against gold is partly a mismatch of criteria, not only a weak model. J1 to J4 use a rubric written from the gold's own rules; that is a fair advantage for them and is stated as such.
- Gold calls a run PASS even when it skipped `classify_merchant`, repeated `rank_cards`, or called an unknown tool, as long as the final answer is right and grounded. The judge sees the tool results and the final answer, not the trajectory rules. Those items test whether the judge follows the rubric it is given.

## 2. Items

All items are built by `node scripts/judge-calibration.mjs --build-items` into `benchmarks/judge-calibration-items.json` (no model; deterministic; the file is hashed). Gold is recomputed by `--check`.

- (a) All 60 recorded runs of `evals-lab/data/recorded-runs.json` (6 cases x 5 seeds x free and constrained pools).
- (b) For each case, the perfect run (`perfectRun`) and the 5 bug variants of it from `injectBug` (`wrong_number_in_reply`, `skip_tool`, `duplicate_call`, `invented_tool`, `right_words_wrong_card`): 36 items.
- (c) Added to move the PASS/FAIL ratio nearer to half and half (the three bugs `skip_tool`, `duplicate_call`, `invented_tool` keep gold PASS): for each case, the first gold-PASS recorded run of the free pool with `wrong_number_in_reply` injected, and the first gold-PASS recorded run of the constrained pool with `right_words_wrong_card` injected. 11 items (one case has no gold-PASS run in one pool).

Total **107 items: 63 gold PASS, 44 gold FAIL (majority class 58.9%).** Real runs: 39 PASS, 21 FAIL (majority 65.0%). Injected: 24 PASS, 23 FAIL.

Many recorded runs have identical reply text, so the count of distinct judge inputs is smaller than the count of items: 45 distinct on DEV, 51 on TEST. Agreement figures are therefore looser than the item count suggests; the report shows a 95% Wilson interval.

## 3. Split

Fixed now. **DEV = cases C01, C02, C03. TEST = cases C04, C05, C06.** No tuning on TEST. A TEST item is never shown to the judge as an example.

| Set | Items | Gold PASS | Gold FAIL | Majority-class agreement | Always-PASS agreement |
|---|---|---|---|---|---|
| DEV (scored) | 49 (superseded: 47, see section 7) | 27 (26) | 22 (21) | 55.1% (55.3%) | 55.1% (55.3%) |
| TEST | 53 | 33 | 20 | 62.3% | 62.3% |

DEV has 5 fewer items than its 54 because the four worked examples of J2 to J3 and one item that looks identical to one of them (same text for the judge) are left out of DEV scoring for **every** variant, so no variant gets a copy of the answer. TEST scoring has no exclusions. Both majority-class and always-PASS agreement are reported next to every result, so that agreement is not misread: a judge that always says PASS already agrees 62.3% on TEST.

TEST is run once for the frozen variant (plus J0 as the reference, J0F as a diagnostic and, if declared at the freeze, one secondary variant). `scripts/judge-calibration.mjs` refuses a TEST run unless `scripts/judge-calibration.frozen.json` exists and every hash in it still matches: the variants and protocol file, the helpers, the items file, `engine.js`, `cases.js` and `recorded-runs.json`. It also refuses a second TEST run of the same block (needs `--again`, and the report would show that).

## 4. Variants (single-shot, same model, temperature 0, seed 1000, WebLLM 0.2.79)

The exact text is in `scripts/judge-calibration-variants.mjs` (hash below) and is copied into `benchmarks/judge-calibration-results.json` under `prompts`. Summary:

| Variant | What the judge gets | Output | PASS rule |
|---|---|---|---|
| **J0** | The lab's current prompt, character for character (`judgePrompt` of `engine.js`): relevance, groundedness, clarity; question, tool results, reply. | one integer 0 to 5, `max_tokens` 8 | PASS if grade >= 4 (the cut the lab's own check uses). No grade = unparsable. |
| **J0F** | Diagnostic, not a candidate: J0's system prompt, but the user message also shows the final card and reward (as J1 to J4 do). Separates "a better prompt" from "the judge can see more". | same as J0 | same as J0 |
| **J1** | Binary PASS/FAIL with a 3-rule rubric: FAIL if (1) the final answer names the wrong card for the question, (2) a number in the reply is not in the tool results or the question, (3) the final reward is not equal to the top reward in the `rank_cards` result. No reply = FAIL. | `VERDICT: PASS` or `VERDICT: FAIL`, `max_tokens` 12 | as parsed |
| **J2** | J1 + 4 worked examples, all from DEV cases, in the order PASS, FAIL, PASS, FAIL: `real:free:C02:1001` (PASS), `real:free:C01:1001` (FAIL: picked the third-best card, 499.5), `perfect:C03` (PASS), `bug:wrong_number_in_reply:perfect:C02` (FAIL: reward 8000). | same | as parsed |
| **J3** | J2 + reference-guided: the judge also sees the answer key (accepted cards and the top reward) for the question, and in each example. | same | as parsed |
| **J4** | J1, reason first: one short sentence, then the verdict line. | reason + `VERDICT: ...`, `max_tokens` 100 | as parsed |

Notes on how the variants differ from the product:

- J1 to J4 show the judge one more line than the product's judge sees: `Final answer: card = ..., reward = ...`. Rule 1 and rule 3 cannot be applied without it (the reply text can name the right card while the final card is wrong, the `right_words_wrong_card` bug). J0F shows what that line alone does.
- J3 gives the judge the answer key. That works for the lab's six fixed questions and not for a question the learner types (no key exists). If J3 wins, the report says so and does not treat it as a judge that can grade unseen questions.
- Parsing (`parseVerdict` in the lib): a `VERDICT: PASS|FAIL` label (the last one counts) or a reply that is only PASS or FAIL. A loose word in a sentence does not count. **An unparsable reply counts as FAIL** in agreement, kappa and the matrix (a pipeline gets no PASS from it), and its share is reported.

Up to **3 tuning iterations on DEV only** after the first round (J0, J0F, J1 to J4). Each changes judge text or knobs (rubric wording, example choice or order, the format line, adding an explicit statement), is logged below with what changed and the DEV numbers, and may not use any TEST item, case, or number. Then one variant is frozen.

**Freeze rule (fixed now):** among J1 to J4 and the tuned variants, the one with the highest DEV Cohen's kappa. Ties: higher DEV agreement, then lower DEV false-pass rate, then fewer knobs (J1 < J4 < J2 < J3). J0 and J0F are never candidates. If the rule picks J3 (reference-guided), a secondary variant is declared at the same moment: the best-by-the-same-rule variant that does not use the key. The secondary runs on TEST too, and is reported; the verdict uses only the frozen variant.

## 5. Bar (fixed before any run)

Applies to the frozen variant on TEST, one run at temperature 0. All three lines must hold:

| Line | Bar |
|---|---|
| Cohen's kappa against gold | >= 0.40 |
| False-pass rate (judge says PASS, gold FAIL; share of the gold-FAIL items) | <= 20% |
| Agreement against gold, compared with J0 on TEST | at least 20 percentage points higher than J0 |

Also reported next to it: the majority-class agreement and the always-PASS agreement (both 62.3% on TEST, because TEST has 33 PASS of 53).

Why these numbers (two lines): kappa 0.40 is the usual floor for "moderate" agreement, and with a 62/38 label split a judge needs kappa that high before its agreement is more than the base rate. A false-pass cap of 20% is there because a judge that waves bad runs through is the failure the lab exists to show (today it is 100%), and the 20-point lift over J0 stops a change that only tracks the PASS share from counting.

## 6. Other measurements (fixed now)

- **Variation:** the frozen variant on TEST at temperature 0.7, 3 runs (seeds 1000 to 1002). Reported: agreement per run and the share of items whose verdict changes between runs. This is not used for the verdict.
- **Order bias** (frozen variant only, TEST items): pairs of (a gold-PASS run, a gold-FAIL run) of the same case, up to 8 per case, chosen by `selectPairs` (deterministic, de-duplicated by judge input): **18 pairs**. Each pair is asked in both orders with a pairwise prompt that reuses the variant's rubric, examples and key and ends "Which run is better, A or B? ... WINNER: A or WINNER: B". Reported: how often the winner is a different run when the order is swapped (flip rate), how often the first-listed run is picked, how often the good run is picked in both orders. The pairwise prompt is written now and not tuned.
- **Per variant:** agreement (with a 95% Wilson interval), kappa, false-pass rate, false-fail rate, confusion matrix, median seconds per judgment (page-measured, includes the generation only), share of unparsable outputs.
- **Bigger model:** see section 9. It runs only if the WebLLM config lists a size of 2 GB or less and the weights are already cached; otherwise it is reported as untested.
- Time per judgment is under a second for the short formats, so one variant over 49 items is expected to take about 1 minute (J4, with a sentence of reason first, about 3 minutes). Well inside the 6-minute cap.

Hashes at plan time (J0 to J4 as written, no tuning yet), `sha256`:

| File | sha256 |
|---|---|
| `scripts/judge-calibration-variants.mjs` | `5d6d1b4b540ada5fd80829c99c35cbca612e1dfebd0f785d6da87beddaa12085` |
| `scripts/judge-calibration-lib.mjs` | `172785595d20069000ef40d0e90a9ebd6f6746316600c2647a53dfb2b9069037` |
| `benchmarks/judge-calibration-items.json` | `81b5753d9e8f110174af8d4c8bdd76f3a3c4d65b31bb81627576623b332a7ce3` |
| `evals-lab/data/recorded-runs.json` | `33ae8e2683a2e0bd1d8b75e9b2986eeb756b9aabef01c40969193273b4f98f7e` |

The variants file will change during tuning (logged below); the lib, the items file and the recorded runs must not.

## 7. Build log and DEV rounds

Written 2026-11-20T15:58Z. Files in place: `scripts/judge-calibration-lib.mjs` (parseVerdict, parseWinner, gradeToVerdict, confusion, agreement, cohenKappa, summarizeConfusion, wilson, checkBar, orderBias, changedShare, median), `tests/scripts/judge-calibration-lib.test.mjs` (13 tests, green), `scripts/judge-calibration-variants.mjs` (prompts and protocol constants), `scripts/judge-calibration.mjs` (items, browser host, runner, report), `benchmarks/judge-calibration-items.json`. The plan above was complete on disk at about 15:42:43Z by the shell clock (its header says 15:43Z, a rounded-up figure); the first model call started at 15:42:49Z.

One change to the DEV scoring set after round r1, declared before any tuning run and applied to every variant and every round: tuning iteration T3 needed two more worked examples, so they were added to an `EXAMPLE_POOL` of DEV items (`bug:skip_tool:perfect:C01`, a PASS that skipped a tool, and `bug:right_words_wrong_card:perfect:C01`, a FAIL whose reply names the right card). The pool and every item that looks identical to one of them are left out of DEV scoring for all variants, including r1 (re-scored from the stored outputs, no new calls). **DEV scored set: 47 items (26 PASS, 21 FAIL, 43 distinct judge inputs; majority-class and always-PASS agreement 55.3%).** The r1 numbers in an earlier console line (49 items) are superseded by the table below.

### DEV results (temperature 0, seed 1000, all numbers from `benchmarks/judge-calibration-results.json`)

Confusion cells read gold PASS judge PASS / gold PASS judge FAIL / gold FAIL judge PASS / gold FAIL judge FAIL.

| Round | Variant | What it is | Agreement (95% interval) | Kappa | False-pass | False-fail | Confusion | Unparsable | Median s |
|---|---|---|---|---|---|---|---|---|---|
| r1 | J0 | current prompt, grade >= 4 | 55.3% (26/47; 41.2 to 68.6) | 0.00 | 100.0% | 0.0% | 26 / 0 / 21 / 0 | 0.0% | 0.38 |
| r1 | J0F | J0 + final card and reward visible (diagnostic) | 55.3% (26/47; 41.2 to 68.6) | 0.00 | 100.0% | 0.0% | 26 / 0 / 21 / 0 | 0.0% | 0.51 |
| r1 | J1 | binary, 3-rule rubric | 57.4% (27/47; 43.3 to 70.5) | 0.11 | 66.7% | 23.1% | 20 / 6 / 14 / 7 | 0.0% | 0.59 |
| r1 | J2 | J1 + 4 examples | 74.5% (35/47; 60.5 to 84.7) | 0.46 | 52.4% | 3.8% | 25 / 1 / 11 / 10 | 0.0% | 1.94 |
| r1 | J3 | J2 + answer key | 85.1% (40/47; 72.3 to 92.6) | 0.69 | 33.3% | 0.0% | 26 / 0 / 7 / 14 | 0.0% | 2.33 |
| r1 | J4 | J1, reason first | 42.6% (20/47; 29.5 to 56.7) | -0.04 | 4.8% | 100.0% | 0 / 26 / 1 / 20 | 12.8% | 1.56 |
| t1 | T1 | J2 with the rubric rewritten as ordered checks ("look at the first rank_cards entry") | 78.7% (37/47; 65.1 to 88.0) | 0.55 | 42.9% | 3.8% | 25 / 1 / 9 / 12 | 0.0% | 2.19 |
| t2 | T2 | T1 + the judge copies four facts into fixed lines before the verdict | 59.6% (28/47; 45.3 to 72.4) | 0.24 | 4.8% | 69.2% | 8 / 18 / 1 / 20 | 0.0% | 2.56 |
| t3 | T3 | T1 + 2 more examples (6 in total) | 85.1% (40/47; 72.3 to 92.6) | 0.69 | 33.3% | 0.0% | 26 / 0 / 7 / 14 | 0.0% | 2.82 |

What each round showed:

- **r1.** J0 gives PASS to all 47 DEV items (always-PASS agreement, 55.3%): the "5 of 5 to everything" finding holds at temperature 0 and with a binary cut at 4. J0F is identical, so showing the final card and reward does not change the current prompt's behaviour; the change from J0 to J1 is the rubric. J1 alone (rubric, no examples) is still weak (kappa 0.11, and it also fails 23.1% of the good runs). Four worked examples (J2) lift kappa to 0.46. The answer key (J3) lifts it to 0.69 with no false-fail. J4 (reason first) is the worst: the 1.5B model writes a reason that invents facts (for example "the HDFC Swiggy card ... is less than the reward of ₹80 mentioned in the question"), then says FAIL for every PASS item, and 12.8% of its outputs have no `VERDICT:` line (the model ends its reason with "Therefore, the run FAILS." and stops, finish reason `stop`; these count as FAIL).
- **t1 (change: rubric text only).** Rewriting the three rules as ordered checks that say where to look raised kappa from 0.46 (J2) to 0.55. Ten DEV errors remain, 9 of them false passes: real runs that picked the second-best card with a plausible reply (`real:free:C01:1003`, `real:constrained:C01:1001`, `real:constrained:C01:1003`), `wrong_number_in_reply` items, and `right_words_wrong_card`.
- **t2 (change: output format).** Making the judge copy facts first made it worse (kappa 0.24). In the outputs read, the model often skipped the copy lines and wrote only "VERDICT: FAIL" (18 of the 19 errors are gold-PASS items judged FAIL), and in one case it copied the wrong card into "TOP CARD". Dropped.
- **t3 (change: examples).** Adding one PASS that skipped a tool and one FAIL that names the right card in the reply but another card in the final answer fixed the false-fail items and the `wrong_number_in_reply` misses, and matched J3's numbers on DEV. Seven errors remain, all false passes: the second-best-card real runs (`real:free:C01:1003`, `real:free:C02:1000`, `real:constrained:C01:1001`, `real:constrained:C01:1003`, `real:constrained:C03:1003`) and two `right_words_wrong_card` items (`bug:right_words_wrong_card:real:constrained:C02:1000`, `bug:right_words_wrong_card:perfect:C03`).

The three tuning iterations are used (t1, t2, t3). T2 was a dead end that is kept in the table.

### Freeze decision

By the rule of section 4, the highest DEV kappa is shared by two variants: **J3 (answer key) and T3 (no key) both have kappa 0.69, agreement 85.1%, false-pass 33.3%**, identical confusion matrices. The rule's tie-breakers (higher agreement, lower false-pass, fewer knobs) do not separate them, and "fewer knobs (J1 < J4 < J2 < J3)" does not name T3. This tie was not anticipated when the rule was written, so the choice below is a decision taken after seeing the DEV numbers, and is flagged as such:

- **Frozen variant (the verdict): T3.** Reason: the lab's learner-typed questions have no answer key, so a judge that needs a key cannot grade them; T3 uses only what the judge is shown anyway. This is also the harder choice for the bar: T3 and J3 match on DEV, and on TEST J3 has the key and T3 does not.
- **Secondary (reported, not used for the verdict): J3.** It runs on TEST as well, so the recommendation can say what an answer key adds.
- J0 (the lab's judge) runs on TEST as the bar reference and J0F as the diagnostic. Neither is tuned.

On DEV the bar would have been: kappa >= 0.40 met (0.69), false-pass <= 20% **not met** (33.3%), lift over J0 >= 20 points met (+29.8 points on DEV). DEV is not the test; it only tells where the risk is: the false-pass line.

Not changed after seeing DEV and not to be changed: the bar (section 5), the split, the gold, the items file, the lib, `engine.js` and `cases.js`. No TEST item has been sent to the model before the freeze.

**FROZEN at 2026-11-20T15:58:09Z. Variant T3** (secondary J3, reference J0, diagnostic J0F). The manifest `scripts/judge-calibration.frozen.json` holds these sha256 hashes, and the script refuses to run TEST, pairs or the variation run if any one changed:

| Part | sha256 |
|---|---|
| `scripts/judge-calibration-variants.mjs` (prompts, bar, split, examples, pair selection) | `e1d605ea7afb3911833cd46eb7857048a56f604a1ae156a9ed7268fc1695ae88` |
| `scripts/judge-calibration-lib.mjs` | `172785595d20069000ef40d0e90a9ebd6f6746316600c2647a53dfb2b9069037` |
| `benchmarks/judge-calibration-items.json` | `81b5753d9e8f110174af8d4c8bdd76f3a3c4d65b31bb81627576623b332a7ce3` |
| `evals-lab/src/evals/engine.js` | `30fd9850296230ed46b36be035c8fc5081d9d7601ede3991da6861845e085391` |
| `evals-lab/src/task/cases.js` | `85a14a77a3b5fcdacff00a26a8a2494d3bbf91d36801bfb0a3c77cbc9f2e6947` |
| `evals-lab/data/recorded-runs.json` | `33ae8e2683a2e0bd1d8b75e9b2986eeb756b9aabef01c40969193273b4f98f7e` |

The files were run through Prettier before the freeze (so `npm run format:check` stays green and no `.prettierignore` entry is needed); do not reformat them afterwards, or the hashes change. The runner script `scripts/judge-calibration.mjs` is not hashed: it holds the browser host and the report code only. Everything that defines a prompt, a split, an item, the bar or a verdict function is in the hashed files. The TEST set had not been sent to the model before this line.

## 8. TEST run (frozen T3) and verdict

Run 2026-11-20T15:58:21Z to 16:03:20Z on the frozen files (the results blocks store the six hashes of the manifest). Machine: Apple M4 Max, 64 GB, macOS 26.7.2, Chrome/157.0.8103.79 headless, WebLLM 0.2.79, Qwen2.5-1.5B-Instruct-q4f16_1-MLC (the model loads from the cache in about 2 s). 212 real model calls, 0 from cache.

**Order of events, stated plainly.** The manifest `scripts/judge-calibration.frozen.json` (timestamp 15:58:09Z, hashes above) was written before the TEST run, and the runner checked it. The "FROZEN at ..." paragraph in section 7 of this file was appended to this file in the same tool batch as the TEST command, so it reached the file while the TEST run was already going, not before it. The manifest is the proof of the freeze; the paragraph is a copy of it. No TEST number was seen before the paragraph was written (the run had not finished).

### Verdict: the bar is missed on all three lines

TEST: 53 items, 33 gold PASS and 20 gold FAIL. Majority-class agreement and always-PASS agreement are both 62.3% (33/53). Temperature 0, one run.

| Variant | Agreement (95% interval) | Kappa | False-pass | False-fail | Confusion (P/P, P/F, F/P, F/F) | Median s |
|---|---|---|---|---|---|---|
| J0, the lab's current judge | 73.6% (39/53; 60.4 to 83.6) | 0.35 | 70.0% (14/20) | 0.0% (0/33) | 33 / 0 / 14 / 6 | 0.33 |
| J0F, diagnostic | 73.6% (39/53; 60.4 to 83.6) | 0.35 | 70.0% (14/20) | 0.0% (0/33) | 33 / 0 / 14 / 6 | 0.35 |
| **T3, frozen, the verdict** | **66.0% (35/53; 52.6 to 77.3)** | **0.25** | **55.0% (11/20)** | 21.2% (7/33) | 26 / 7 / 11 / 9 | 2.64 |
| J3, secondary (has the answer key) | 77.4% (41/53; 64.5 to 86.5) | 0.47 | 55.0% (11/20) | 3.0% (1/33) | 32 / 1 / 11 / 9 | 2.16 |

Unparsable outputs: 0.0% for all four.

| Bar line (T3 against gold, J0 as the reference) | Measured | Needs | Status |
|---|---|---|---|
| Cohen's kappa | 0.25 | >= 0.40 | **MISSED** |
| False-pass rate | 55.0% | <= 20% | **MISSED** |
| Agreement lift over J0 | -7.5 points (66.0% against 73.6%) | >= +20 points | **MISSED** |

**BAR MISSED.** T3 agrees with gold less often than the lab's current judge on TEST. On DEV, where it was tuned, T3 had kappa 0.69 and 85.1% agreement; on TEST that falls to 0.25 and 66.0%, a drop of 19.1 points of agreement. J3 (answer key) meets the kappa line alone (0.47) and misses the other two (false-pass 55.0%; lift +3.8 points). It was not the frozen variant and is shown for what an answer key adds.

Two facts that change how J0's number reads:

- J0 gave "5" to every DEV item (49 run in round r1, 47 scored) and to all 47 TEST runs that have a reply, including the 14 gold-FAIL ones among them. Its only "0" grades (6) are the 6 TEST runs with no final answer (the reply shows "(no reply)"). So J0's 73.6% on TEST comes from catching empty runs and nothing else. DEV has no empty runs, which is why J0 agreed only 55.3% there.
- J0 outputs only 0 or 5, so the cut at 4 can be moved anywhere from 1 to 5 with no change in its verdicts. The "threshold" knob would do nothing for this judge.

### Right verdicts by kind of item (from `benchmarks/judge-calibration-tables.md`)

| Kind of item | DEV J0 | DEV J3 | DEV T3 | TEST J0 | TEST J3 | TEST T3 |
|---|---|---|---|---|---|---|
| `wrong_number_in_reply` (gold FAIL, reward 10x) | 0/5 | 5/5 | 5/5 | 0/5 | **0/5** | **0/5** |
| `right_words_wrong_card` (gold FAIL) | 0/5 | 2/5 | 3/5 | 0/6 | 2/6 | 2/6 |
| recorded run with a reply (gold FAIL) | 0/11 | 7/11 | 6/11 | 0/3 | 1/3 | 1/3 |
| recorded run with no final answer (gold FAIL) | - | - | - | 6/6 | 6/6 | 6/6 |
| recorded run with a reply (gold PASS) | 16/16 | 16/16 | 16/16 | 21/21 | 21/21 | 15/21 |
| perfect, `skip_tool`, `duplicate_call`, `invented_tool` (gold PASS) | 10/10 | 10/10 | 10/10 | 12/12 | 11/12 | 11/12 |

The last row adds up four kinds of the tables file (DEV: 2 perfect, 2 skip, 3 duplicate, 3 invented; TEST: 3 of each). J3 missed one `invented_tool` item on TEST and T3 one `skip_tool` item.

The pattern: on DEV, T3 and J3 caught all five 10x-reward items; on TEST, with new cases, they caught none, even J3, which is shown the correct reward. The four worked examples include one 10x case (`bug:wrong_number_in_reply:perfect:C02`), and the DEV items of the same bug in cases C01 and C03 look like it. The DEV gain looks like pattern matching to the example, not a rule the judge learned. On TEST the judge's errors split into false passes that look right to a reader (reward 900 where the tool says 90) and 7 false fails, all in case C04 (petrol: the correct card is listed first with a reward of 100 and the other three at 0), which no DEV example resembles.

### 5 verbatim judge outputs of T3 on TEST (3 wrong, 2 right)

1. `real:free:C05:1004`, gold FAIL, judge PASS (wrong). The reply is padded with a made-up "₹59.94 reward for every ₹1,000 spent". Judge output: `"VERDICT: PASS"`
2. `real:free:C04:1001`, gold PASS, judge FAIL (wrong). Reply: "You should use the IDFC First Power Plus card as it offers a 5% reward rate with a reward amount of ₹100." Judge output: `"VERDICT: FAIL"`
3. `real:free:C04:1003`, gold PASS, judge FAIL (wrong). Reply: "Use the IDFC First Power Plus card for this purchase as it offers a reward of ₹100." Judge output: `"VERDICT: FAIL"`
4. `real:free:C05:1000`, gold FAIL, judge FAIL (right). Reply: "(no reply)". Judge output: `"VERDICT: FAIL"`
5. `real:free:C04:1000`, gold PASS, judge PASS (right). Reply: "The IDFC First Power Plus card offers a 5% reward rate and a reward of ₹100. It's a good option if you're planning a larger purchase." Judge output: `"VERDICT: PASS"`

The judge outputs are one line. The format has no reason, so the lab could not show why the judge decided. J4 (reason first) did show a reason, and the reasons were invented (section 7).

### Variation, at temperature 0.7 (T3, TEST, 3 runs, seeds 1000 to 1002; not used for the verdict)

| Run | Agreement | Kappa | False-pass | False-fail |
|---|---|---|---|---|
| 1, 2, 3 (identical) | 69.8% (37/53) | 0.37 | 35.0% | 27.3% |

All 53 items got the same verdict in the 3 runs (0.0% changed). That is not the same as a stable judge. Two extra DEV probes, run after TEST because 0.0% looked wrong (`dev:seedprobe:*`, not in the plan, DEV only):

| Probe (DEV, temperature 0.7, 3 seeds) | Agreement | Kappa | False-pass | False-fail | Items changed between seeds |
|---|---|---|---|---|---|
| J1 | 63.8% (30/47) | 0.26 | 47.6% | 26.9% | 0 of 47 |
| T3 | 57.4% (27/47) | 0.13 | 52.4% | 34.6% | 0 of 47 |

At temperature 0.7 the verdict of T3 differs from its temperature-0 verdict on 21 of 47 DEV items and 24 of 53 TEST items, but the three seeds always produce the same draw. In this setup the `seed` does not vary the sampling, so the 0.0% is the spread of the seeds (none), not the spread of the judge. Real run-to-run spread without fixed seeds was not measured, and why the seeds do not matter was not investigated. What the probes do show: at temperature 0.7 (the temperature the lab's own judge uses, with 5 grades and the median) T3 on DEV falls from kappa 0.69 to 0.13 and J1 from 0.11 to 0.26 (a rise within noise). A judge prompt tuned at temperature 0 is not tuned for the temperature the page uses.

### Order bias (T3 pairwise form, 18 TEST pairs of a gold-PASS run and a gold-FAIL run, both orders, 36 judgments)

| Measure | Value |
|---|---|
| pairs answered in both orders | 18 of 18 |
| a different run wins when the order is swapped | 77.8% (14 of 18) |
| first-listed run picked, all 36 judgments | 88.9% (32 of 36) |
| good run picked in both orders | 22.2% (4 of 18) |
| unparsable judgments | 0 |

The pairwise prompt (T3's rubric and 6 examples, then "Which run is better, A or B?") was written before the run and not tuned. This is the measured behaviour of that prompt, not of every pairwise prompt. With it, the answer follows the position far more than the content: the first-listed run wins about 9 times in 10, so a pairwise "which answer is better" judge from this model would be mostly a coin biased to A.

## 9. RECOMMENDATION

**(a) Build the judge lab as specified (a learner tweaks the judge's prompt, calibrates against labels, and agreement improves): NO. Confidence: medium-high.** The test of the user's own criterion was: tweaks must make this judge agree with ground truth. On the cases where the judge was tuned, they did (kappa 0.00 for J0 to 0.69 for T3; agreement 55.3% to 85.1%). On three new cases the best tuned variant is below the old judge (66.0% against 73.6%), misses the false-pass line by 35 points (55.0% against 20%), and catches none of the 10x-reward items. A lab built on this judge would show a learner the DEV result first; the TEST result is the real one.

What each knob did (DEV numbers are from the tuning cases; TEST numbers only exist for J0, T3 and J3):

| Knob a learner could turn | Measured effect | Verdict |
|---|---|---|
| Rubric text: three FAIL rules instead of relevance/groundedness/clarity (J0 to J1) | DEV kappa 0.00 to 0.11, false-pass 100% to 66.7%, but 23.1% of good runs now fail | Small, trades one error for another |
| Rubric wording: ordered checks that say where to look (J2 to T1) | DEV kappa 0.46 to 0.55 | Small, DEV only |
| Worked examples: 0 to 4 (J1 to J2) and 4 to 6 (T1 to T3) | DEV kappa 0.11 to 0.46 and 0.55 to 0.69. TEST T3: kappa 0.25 | The only knob with a large DEV effect, and it did not carry to new cases. Looks like pattern copying. |
| Reference answer: the answer key in the prompt (J2 to J3) | DEV kappa 0.46 to 0.69. TEST J3: kappa 0.47, agreement 77.4%, the best of the four, but false-pass 55.0% and 0 of 5 10x-reward items | The largest TEST effect, and still below the bar. Needs a key, which a typed question has none of. |
| Reason first (J1 to J4) | DEV kappa 0.11 to -0.04; reasons were invented; 12.8% had no verdict | Worse. Do not expose as an improvement. It is a good lesson in a judge's reason being untrustworthy. |
| Copy facts first (T1 to T2) | DEV kappa 0.55 to 0.24 | Worse |
| Threshold on the 0 to 5 grade | none: J0's grades are only 0 or 5 | Nothing to tune; drop |
| Temperature (not a requested knob) | T3 on DEV: kappa 0.69 at 0 against 0.13 at 0.7 | Bigger than most prompt knobs; the page's judge runs at 0.7 |

**(b) What a learner can still learn from the failure, and a smaller build that is worth doing.** The experiment produced lessons that fit the lab's own thesis, each measured above:

1. A judge can look good on the cases it was tuned on and fail on new ones (kappa 0.69 on DEV, 0.25 on TEST). This is the "held-out set" lesson and needs the TEST/DEV split built into the lab, so the learner sees both numbers.
2. A 1.5B judge gives 5 to every run that has a reply (47 of 47), including a 10x reward, and the only thing it caught was an empty reply. The rule-based check `grounded` catches the 10x reward every time.
3. Showing the judge the right answer helps (J3 is the best on TEST) and still does not catch a reward that is ten times too big.
4. Asked to pick between two runs, the first-listed one wins 88.9% of the time with the prompt tested.
5. Putting a reason before the verdict did not make the judge more careful; it wrote invented reasons.

If the owner wants a "judge lab" for these lessons, a read-only version that replays these recorded measurements (a DEV table, a TEST table, per-kind misses, order-bias demo) needs no live model and no tuning UI; it would be honest about what a small judge can do. A live tuning UI on the 1.5B model as specified would invite the learner to over-fit to the cases on screen.

A bigger judge: **untested.** The WebLLM 0.2.79 config in the page's bundle lists `vram_required_MB` per model (Qwen2.5-1.5B 1629.75 MB, the model used here; gemma-2-2b q4f16_1 1895.3 MB; Llama-3.2-3B q4f16_1 2263.69 MB; Qwen2.5-3B q4f16_1 2504.76 MB) and no download size. The rule was to run a bigger model only if the download size is readable from the config and is 2 GB or less and cached. It is not readable, so no bigger model was run. Whether a 2B to 3B model can be calibrated is open.

**(c) What this experiment does not show.** See section 10.

## 10. What this test does not show

- Labels are rules, not people. Gold is `task_success` AND `grounded`. A learner's own labels are noisier and may disagree with the rules; the experiment tests how well a judge imitates the rules, which is the easy case. It also gives J0 a criteria mismatch (J0 asks about clarity; gold does not).
- Small sample and a structure that inflates DEV. TEST has 53 items but 51 distinct judge inputs, in 3 cases; DEV has 47 items, 43 distinct, in 3 cases. Agreement intervals are 25 points wide (T3: 52.6% to 77.3%). The injected items repeat the same bug in the same cases, so errors are correlated. The DEV result of T3 is inflated by items that resemble its examples (same cases, same bug shapes); the drop to TEST is partly that. A fresh set of cases for the whole pipeline was not available.
- One machine (Apple M4 Max, 64 GB), one browser (headless Chrome 157), one model build (Qwen2.5-1.5B q4f16_1), one WebLLM version (0.2.79).
- One wording per variant. A different phrasing of the same idea could do better or worse. Only 3 tuning iterations were allowed (T2 failed), so the search was shallow. The order of the examples (PASS, FAIL, PASS, FAIL, PASS, FAIL) was not varied.
- J1 to J4 see one line more than the current judge (the final card and reward). J0F shows this alone changes nothing for J0, but J0F was tested with J0's own prompt only.
- The freeze rule had a tie (J3 and T3, same DEV numbers) that the rule did not cover; T3 was chosen after seeing DEV (section 7). J3 was reported as the secondary. With J3 as the frozen variant the bar would still have been missed (false-pass 55.0%, lift +3.8 points).
- The sampling check is weak: the seed did not vary the draw (section 8), so the run-to-run variation of the judge at temperature above 0 is unknown.
- The pairwise prompt was one wording, not tuned.
- Not tested: a bigger model (download size not readable from the config), human labels, other machines, a judge that sees the trajectory, grading the whole set five times and taking the median as the page does (the page's own procedure was approximated by one temperature-0 call).

## Files

- `scripts/judge-calibration-lib.mjs` (pure helpers: `parseVerdict`, `parseWinner`, `gradeToVerdict`, `confusion`, `agreement`, `cohenKappa`, `summarizeConfusion`, `wilson`, `checkBar`, `orderBias`, `changedShare`, `median`), `tests/scripts/judge-calibration-lib.test.mjs` (13 tests)
- `scripts/judge-calibration-variants.mjs` (prompts J0 to J4, T1 to T3, protocol constants, bar, pair selection), `scripts/judge-calibration.mjs` (items, runner, report, `--check`, `--freeze`), `scripts/judge-calibration.frozen.json` (manifest)
- `benchmarks/judge-calibration-items.json` (107 items with gold), `benchmarks/judge-calibration-results.json` (every judge output of every block, prompts, hashes), `benchmarks/judge-calibration-tables.md`, `benchmarks/judge-calibration-rawcache.json` (DEV model outputs by prompt hash)
- `package.json`: one line, `benchmark:judge-calibration`

## Reproduce

```bash
node scripts/judge-calibration.mjs --check                        # items, gold, split, examples (no model)
node --test tests/scripts/judge-calibration-lib.test.mjs          # unit tests of the helpers
npm run benchmark:judge-calibration -- --set dev --variants J0,J1 --round rX          # DEV (cached on disk)
npm run benchmark:judge-calibration -- --set test --variants J0,J0F,T3,J3 --round final   # TEST: refused unless the hashes match
npm run benchmark:judge-calibration -- --set test --variants T3 --round variation --temp 0.7 --runs 3
npm run benchmark:judge-calibration -- --pairs T3                 # order bias on 18 TEST pairs
npm run benchmark:judge-calibration -- --report                   # rebuild the tables file
```
