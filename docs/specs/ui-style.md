# UI style (Evals Lab)

Reference the owner likes: `/Users/Jeevan.Chikkegowda/labs/entain/ai/incident-review` (read `docs/specs/ui-restyle.md` and the CSS in `incident-analyser-wt/ui-restyle/src/incident_rca/web_pages.py`). FE only: plain HTML, CSS, ES modules. No framework, no build, no CDN for the UI. The only external import is WebLLM, loaded dynamically after a click (wave 2).

## Feel
Simple, modern, minimal, welcoming to a first-time learner. Calm, flat, square, generous whitespace. Little text on screen. Every screen answers: what am I looking at, what do I try, what did I learn.

## Tokens (from the reference)
`--ink:#111827; --paper:#f3f3ef; --line:#2d333b; --soft:#cfd2d8; --muted:#545b68; --accent:#0b3d91; --ok:#0a7a3d; --warn:#a85d00; --bad:#b3261e; --off:#6b7280`
- `border-radius: 0` everywhere (a test greps the CSS). 1px solid `--line` borders on white panels, no shadows.
- System sans for text, system mono for ids, numbers, tool names, JSON. Large mono numerals for key figures. Small-caps labels for section names.
- Status is never colour alone: always a text label plus a shape (filled square = pass, hollow square = fail, half square = flaky or not run).

## Welcome layer (new vs the reference)
- Sticky top bar: dark `EVALS LAB` brand block, then nav `1 Run`, `2 Metrics`, `3 Golden set`, `4 Compounding`, `5 Judge lab` (disabled, label "soon").
- First load shows a "Start here" strip: 3 numbered square steps (Run a case, Break it, Run the set). Dismissible, remembered in localStorage.
- Each screen has a top band: `YOU WILL SEE` (one line) and `TRY THIS` (one line, one concrete action). Explanations live in `<details>` closed by default.
- Friendly microcopy in plain words. No jargon without a one-line gloss on first use (for example "trajectory = the route of tool calls").
- Empty states say what to click. Loading states show a segmented progress bar and the words "first load downloads the model, later loads are cached".

## Layout
- Content width 1100 px max, 8 px spacing grid, responsive down to 500 px (grids collapse to one column), keyboard focus ring 3px `--accent`, minimum 44 px tap targets for buttons.
- Hash routing: `#run`, `#metrics`, `#golden`, `#compounding`. Default `#run`.
- Metrics board: 4 x 2 tiles, tile top border 6px in status colour, big PASS/FAIL word, group label above, one-line reason below. Caught tiles lead with a filled bad colour label.
- Golden grid: rows = 12 cases, columns = 5 runs, square cells (filled ok / filled bad) with an `aria-label` per cell. Summary numerals above: average, passes all runs, passes at least once.
- Curve: inline SVG, square markers, axes labelled in words.

## Files (owned by the UI agent)
`evals-lab/index.html`, `evals-lab/styles.css`, `evals-lab/ui.js` (pure render functions taking plain data, no engine import), `evals-lab/preview-data.js` (static sample data matching `docs/specs/engine-contract.md` shapes, used only when the URL has `?preview`).
