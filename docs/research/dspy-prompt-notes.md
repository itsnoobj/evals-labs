# DSPy prompt for the credit-card agent

Data: `evals-lab/dspy-prompt.json`. DSPy 3.5.0, Python 3.14.7, captured with `dspy.utils.DummyLM` (no real model, no optimizer). Our live agent does not use it.

## What DSPy produced
- Zero-shot `dspy.ReAct`, first turn: system 1,598 chars + user 2,009 chars = 3,607 chars (about 1,000 tokens).
- Later ReAct turns grow: turn 2 is 4,410 chars (after one tool result), the `submit` turn is 5,213 chars.
- Few-shot variant: 1,393 chars (about 400 tokens), three demos as user/assistant message pairs.
- The format is XML-style tags (`<question>`, `<next_thought>`, `<tool_calls>`), not the `[[ ## field ## ]]` markers of older DSPy.
- 3.5.0 ReAct has no separate extract step (older versions did). The model finishes by calling a built-in `submit` tool.
- The system message holds field types, the output format, a JSON schema for `tool_calls`, and the instruction.
  The user message holds the question, tool list with docstrings and arg schemas, and a turn budget.
- `LabeledFewShot(k=3)` on `dspy.ReAct` produced a prompt identical to zero-shot. The demo fields (card, reward_inr, reply)
  do not match ReAct's inner signature (next_thought, tool_calls), so DSPy drops them silently.
  The few-shot variant therefore uses `dspy.Predict` with the same signature. It has no tools, so its
  instruction ("Use the tools") refers to tools it cannot call. Show it only to illustrate the demo block.

## Versus our SYSTEM_PROMPT_V2 (agent-step.js)
| | ours (v2) | DSPy ReAct zero-shot |
|---|---|---|
| Size | 503 chars (about 130 tokens) | 3,607 chars on turn 1 (about 1,000 tokens), about 7x |
| Structure | 5 lines, 3 literal JSON examples in order | field list, tag format, JSON schema, tool prose, turn budget |
| Tool call shape | `{"tool":..,"args":..}`, one object per turn | `{"tool_calls":[{"name":..,"args":..}]}` inside `<tool_calls>` tags |
| Finish | `{"final":{...}}` | call `submit` with the typed fields |
| Output constraint | WebLLM JSON schema (XGrammar) | none, the model must emit tags by itself |

## Could a 1.5B model follow it? (reasoning only, not measured)
Probably not reliably. Reasons:
- Our spike (spike/RESULTS.md) found tiny models copy the last example and skip steps even with 500 chars.
  DSPy gives one generic example (`search`/`cats`) and a schema, none for our tools. Small models follow schemas worse than examples.
- The model must write two tagged sections per turn, with valid JSON nested inside a tag. That is two formats to get right.
- Tool descriptions are flattened onto one line each and carry docstring text the model does not need.
- Prompt length grows to about 1,300 tokens by the submit turn, which costs latency in-browser.
- The XML-tag output cannot be grammar-constrained by our current JSON-schema setup without extra work.
Larger models (7B+ or hosted) handle this format well; it was designed for them. A fair test needs a measured run. Not done here.

## Regenerate
`node evals-lab/spike/export-tools.mjs && /tmp/dspy-venv/bin/python evals-lab/spike/make-dspy-prompt.py`
Setup: `python3 -m venv /tmp/dspy-venv && /tmp/dspy-venv/bin/pip install dspy`. Output is deterministic (verified by a second run).
Card data is read from `tools-export.json`, so a change in `cases.js` flows through after re-running both commands.
