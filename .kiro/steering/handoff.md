---
inclusion: manual
---
# Handoff (use when context is nearly full, or I say "handoff")

Write `docs/HANDOFF.md`, under 60 lines, overwriting the old one:

1. **Goal**: one line.
2. **State**: link `docs/TODOs.md` and `docs/DISCOVERY.md`; do not copy them. List every open git worktree (`git worktree list`) with its branch and status.
3. **Open items**: copy `open` lines from `docs/assumptions.md`.
4. **Gotchas**: commands that work, traps hit, failing tests with their names.
5. **Next action**: the single next step, specific enough to start without questions.

Then print this prompt for me to paste into a fresh session:

> Read `#master`, `docs/HANDOFF.md`, `docs/TODOs.md`, `docs/DISCOVERY.md`, `docs/assumptions.md`, `docs/decisions.md`.
> Continue with "Next action". Ask me the open items first.
