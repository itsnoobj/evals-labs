---
inclusion: auto
name: specs-and-docs
description: Use when writing specs, designs, DISCOVERY, TODOs, ADRs, assumptions, README or any project documentation.
---
# Specs and docs: short, visual, linked

- `docs/DISCOVERY.md`: indented tree of what is built. Per node, one line each: **Done when**, **Goals**, **Non-goals**, **Invariants** (always true, testable). Mark unknown fields `?` and add a line to `TODOs.md`.
- `docs/design.md`: one mermaid diagram; node names match `DISCOVERY.md`.
- `docs/TODOs.md`: `- [ ] item (blocked by: ...)` under Next / Later / Done. Move, do not delete, finished items.
- `docs/specs/<slice>.md` (one page max): **Contract** (table: input -> output/errors), **Acceptance** (checklist, each linked to a test). Goals and non-goals live in `DISCOVERY.md`; do not repeat them.
- `docs/assumptions.md`: `- [date] item (why) (status: open|confirmed|wrong)`. Open items are asked to the user.
- `docs/decisions.md`: `- ADR-007 [date] Chose X over Y because Z.`
- Prefer table, diagram, or checklist over paragraphs. Delete sentences that restate another file.
- Module README only when the module is not obvious from its name.
- Update docs in the same change as the code.
