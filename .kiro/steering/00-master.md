---
inclusion: always
---
# Master rules (keep this file short; details load on demand)

## Principles
- Simplest thing that works. Functions over classes. Plain data (dict/dataclass/pydantic) over hierarchies.
- Use the stdlib, then an installed dependency, then a well-known library. Custom code last.
- No speculative abstractions, config, flags, or layers. Add them when a second use appears.
- Names say what a thing does: `send_invoice_email.py`, `parse_order()`. No `utils.py`, `helpers`, `manager`.
- Idiomatic for the stack. Follow the framework's documented way.
- Async I/O for anything server-side. No blocking calls in request paths.
- Comments explain why, not what. Reuse existing `make`/task targets; no unnecessary shell commands.

## Incremental approach
- Build in small steps. Do what is known and clear now. Do not guess the rest.
- Anything unknown, unclear, or deferred goes to `docs/TODOs.md` (format below). Pick the next item from there.
- Before each step: one line on what it is. After each step: update `docs/TODOs.md`, `docs/DISCOVERY.md` if the shape changed.

## Project files (all in `docs/`, templates in the kit)
| File | Holds | Rule |
|---|---|---|
| `TODOs.md` | Checklist: `- [ ] item (blocked by: ...)`. Sections: Next, Later, Done | Single source of progress. Replaces any progress log |
| `DISCOVERY.md` | Tree of what is being built. Each node: Done when, Goals, Non-goals, Invariants | Max 1-2 lines per field. Update when a node is added, split, or finished |
| `assumptions.md` | Open items and assumptions | See "Open items" |
| `decisions.md` | One-line ADRs | Real decisions only |
| `design.md` | One mermaid system diagram | Nodes match `DISCOVERY.md` |

## Open items
- Ask me about open items. Do not silently assume. Max 5 questions at a time, each with a recommended default, one ask per question.
- Log each in `docs/assumptions.md` as `open` until I answer, then `confirmed` or `wrong`.
- Only if I am unavailable and I am blocked: use the default, log it as an assumption, continue on unblocked work.
- Never ask the same question twice. Check `assumptions.md` and `decisions.md` first.

## Response style
- Concise by default. Invoke skill `caveman` (lite) at session start.
- Lead with the result or next action. Numbered steps for multi-step work.
- Code, specs and docs stay normal and clear. Terse applies to chat only.
- Plain literal language. No metaphors or idioms.

## Modes (state the current mode at the top of each reply)
- **Plan**: no code or file edits except `docs/`. Output: `DISCOVERY.md` update, slice list, estimates, open items. Ends with "Approve to execute?".
- **Execute**: only after plan approval. Test, then code. No scope additions; new scope goes to `TODOs.md` and back to Plan.
- **Devil's advocate**: before approving a plan and before merging, list the top 3 risks, what is over-engineered, and a simpler option. Each point: concrete failure + fix.
- Default order: Plan, Devil's advocate, Execute, Devil's advocate on the diff, merge.
- I switch mode by saying "plan", "execute" or "devil's advocate".

## Workflow (one slice at a time)
1. **Discover**: create `docs/DISCOVERY.md` and `docs/design.md` before any code.
2. **Spec a slice**: `docs/specs/<slice>.md`, under one page, linked to its `DISCOVERY.md` node.
3. **Test, then code**: ending in a green run.
4. **Record**: tick `TODOs.md`, update `DISCOVERY.md` and `design.md` if the shape changed.

## Worktrees and subagents
- Each slice gets its own git worktree (`../<repo>-<slice>`, skill `ce-worktree`). Never edit the main checkout.
- Independent slices may go to parallel subagents. Each gets: spec file, worktree, "done = acceptance tests green". Max ~5 parallel; max nesting depth 2.
- Merge one worktree at a time, tests green after each, then remove it.
- State a time estimate per slice. If a task is over 20 min, say so before starting. If a step passes 2x its estimate, say why in one line and offer options.

## Progressive loading
- Load only the steering file for the current work.
- Missing stack file? Create `.kiro/steering/<stack>.md` (`inclusion: fileMatch`, from official docs, under 60 lines).
- When I correct you, update the relevant steering file in the same turn, one line.

## Context limit or new session
- Before context fills (or when I say "handoff"), follow `handoff.md`.
- At session start, if `docs/HANDOFF.md` exists, read it first, then `TODOs.md`, `assumptions.md`, `decisions.md`.
