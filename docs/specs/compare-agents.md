# Compare agents side by side (slice S10)

Node: `evals-lab > ui`. Problem: visitors cannot see what "best practices" change. Show the same question run through a simple agent and a careful agent, as two chat windows, with a switch that reveals the wiring.

## Done when
- New screen `#compare`: one question box ("Ask both"), two chat windows side by side (stacked under 900 px), a switch "Show the wiring".
- Switch OFF: only chat bubbles, a card visual for the answer, and an answer-key check strip (right or wrong). Switch ON: the same chats plus tool inputs and outputs, timings, the pipeline picture, the checker's findings, rejected attempts, retry and fallback events, and the 8 check results.
- Works with the live model and with recorded runs. Every number shown comes from a real run or from code. Nothing is invented.

## The two agents
- Simple agent: free-form reply, one try, no checks. Uses the existing `runCase` with `constrain:false`.
- Careful agent (`guarded-agent.js`): (1) safety net: reply format forced by a schema; (2) low randomness (temperature 0.2); (3) checker after each try; (4) up to 3 tries when the checker finds a problem; (5) fallback: if all tries fail but the tools ran correctly, build the answer straight from the tool result and say so; (6) refuse: if the tools never ran correctly, say "I could not verify an answer" instead of guessing.
- The checker never reads the answer key. It only uses the question text and the tool results in the run.

## Checker rules (plain words in the output)
1. classify_merchant was called, did not return an error, and its merchant input appears in the question.
2. rank_cards was called, did not return an error, its amount equals the number in the question, and its category equals what classify_merchant returned.
3. The final card is the top card in the rank_cards result and the final reward equals that card's reward (within 0.5).
4. Every number in the reply is in a tool result or in the question.
5. No unknown tool, no repeated tool call, every reply was readable.

## Invariants
- `guarded-agent.js` and `chat-ui.js` are pure (no DOM in the first, strings out in the second). Node tests for both.
- Square flat style from `ui-style.md`. Status never by colour alone.
- Honest framing: one run proves little. Show the answer-key strip per run and say so on the page.

## Non-goals
- No new metrics, no memory, no real banking data.
