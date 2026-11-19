# Deck-generation prompt — "You Can't Improve What You Can't Measure"

Paste everything below into your slide-generation agent (Claude, Cursor, a
Marp/MARP tool, etc.). It is written as instructions to that agent.

---

## Your role

You are building a **25-minute conference talk deck** for **EI India, Pune 2026**.

- **Talk title:** *You Can't Improve What You Can't Measure*
- **Subtitle:** Evals, Harnesses, and Silent Failure in Production Agents
- **Audience:** engineers who can already build an agent but haven't shipped one
  they trust.

Produce a complete slide deck in **Marp-compatible Markdown** (see Format rules
at the end). Output the whole deck in one file. Do not ask clarifying questions
first — build the full draft, then note anywhere you made a judgment call.

---

## Core message and narrative spine

**The one line** — put it on a slide near the start and again at the end:

> "If a human has to eyeball the output to notice a regression, you don't have an
> agent in production — you have a demo that hasn't broken yet."

**The point:** In 2026, building an agent is easy — the model does it. *Trusting
it enough to ship is the hard part, and it's the only part that's still
engineering.* The talk lives in the gap between a working demo and something
you'd put in front of real users, customers, or money.

**The question the audience holds the entire time** — restate it at transitions:

> "What would it take for *you* to trust this agent in front of a real user?"

**The trust ladder** (this is the spine — make the techniques feel like one
climb, not a list of seven topics):

| Rung | Trust it to… | Section |
|------|--------------|---------|
| logic   | take the right steps | 3 — Grade the math, not the essay |
| scale   | work where you can't hand-label answers | 4 — When the answer key runs out |
| time    | stay good after a model swap | 5 — Silent failure |
| guards  | hold up when the tests are also AI-written | 6 — Test the tests |
| maturity| know your next step | 7 — Where are you today |

Every section ends with the same beat: *"Now you can trust it to do X. But not
yet to do Y —"* which sets up the next section. Carry that phrasing on the last
slide of each section so the transitions tell the story.

**Three "aha" visuals** carry the non-obvious payload — make each its own slide:
1. **The average is a lie** — two charts, same average: one healthy, one quietly
   broken.
2. **Code coverage is a lie too** — 90% coverage, 40% of deliberately broken code
   caught.
3. **Two models disagreeing hand you your test set** — disagreement between a
   strong and a cheap model picks the cases worth a human's time.

---

## Slide-by-slide breakdown

Build the slides below in order. One idea per slide. Where a section needs more
than one slide, split it. Put speaker notes under every slide.

### Section 0 — Hook (2 min)

**Slide: Opening hook**
- Headline: "The author graded their own homework."
- Content: Everyone trusts that in a pull request, author and reviewer are two
  different people, and that a passing test means something. Break it: your agent
  opens 40 PRs today. It wrote the code. It wrote the tests too. They pass — of
  course they do. You can't read 40 diffs line by line.
- Visual: simple image of a PR / check-passing badge, or the meme below.

**Slide: The one line**
- Just the one line (see above), large, centered. Nothing else.
- Speaker note: name the point — building the agent was the easy part; trusting
  it is the only part still left to engineer. Promise concrete steps they can
  start Monday.

### Section 1 — Agents aren't like the software you tested before (part of merged 3-min block with Section 2)

**Slide: Three-column comparison**
- Headline: "You've never tested anything like this."
- Visual: a **3-column table** — **Traditional Software / A Single Model Call / A
  Full Agent**, with three rows:
  - *What you're testing:* a function → a model's one answer → a whole system with
    tools and memory.
  - *How it behaves:* predictable → one unpredictable answer → unpredictable *and*
    a different path each run.
  - *What you measured:* pass/fail + coverage → accuracy, text-overlap scores →
    did the task succeed, was the reasoning sound, what did it cost.
- Takeaway line: every tool you used to earn trust assumed one correct answer.
  Agents don't give you that. Trust becomes "how often and how badly," not "pass
  or fail."

### Section 2 — Why agents are hard to trust (rest of the merged block)

**Slide: Where trust leaks out**
- Headline: "Five ways trust leaks out."
- Bullets (fast, don't dwell): same prompt → two valid paths; long tool-call
  chains break anywhere; last month's test set goes stale; the best judge (a
  human) is slow and costly, the scalable judge (a model) needs calibrating;
  regulated settings need audit trails.
- Handoff line: "Let's plug them one at a time. First: stop trusting the final
  answer."

### Section 3 — Trust the logic: grade the math, not the essay (4 min)

**Slide: Grading the essay vs grading the math**
- Headline: "Stop grading the essay."
- Two columns:
  - *Grading the essay:* read the final answer, decide it "sounds right," ship.
    Breaks silently on every model change, hides behind confident text, can't
    scale past one person, no regression net.
  - *Grading the math:* check *how* it got there — right tools, right order, right
    arguments. Catches broken logic even when the answer sounds great; runs
    automatically on every change; a wrong path blocks the deploy.

**Slide: The usual ways the logic breaks**
- Headline: "Six failure modes, each with a standard fix."
- Bullets: inventing tools that don't exist; looping forever; missing/irrelevant
  retrieved data; acting on stale memory; wrong tool or wrong arguments;
  committing to a wrong assumption and never recovering.

**Slide: There is no single dashboard**
- Headline: "What you measure depends on the agent."
- Content: a code-review agent that cries wolf is worse than useless → key metric
  is **false-alarm rate** (define it: how often it flags something that's
  actually fine). A question-answering agent lives or dies on whether its answer
  is **grounded** in the source (define it: every claim traceable to the
  retrieved text).
- Handoff line: "Now you trust the logic. But this needs an answer key written in
  advance. That stops working the moment you scale."

### Section 4 — Trust it at scale: when the answer key runs out (5 min)

**Slide: The standard playbook (and its credit)**
- Headline: "Build an answer key — like production code."
- Content: real user query + exact tool calls you expect + the reference answer.
  Start with 10–20 varied cases including the tricky ones. Run each a few times
  and average (answers vary). Your agent should score near 100% on its own answer
  key — that first run is your baseline; any later drop is a warning.

**Slide: Where the answer key runs out**
- Headline: "Fine — until there's no single right path."
- Content: works when there's one knowable path (look up the claim, then the
  customer). Falls apart for open-ended agents — no single correct path, and no
  team can hand-write enough answer keys to cover the space.

**Slide: Two models disagreeing hand you your test set** *(aha #3)*
- Headline: "Let disagreement pick your test cases."
- Visual: **two-models-disagree diagram** — real inputs from production logs → run
  each through a **strong model** and a **cheap model** → where they *disagree* is
  your shortlist worth a human's attention. Only pay a human for *those*.
- Add: every real failure you find gets frozen into the test set permanently, so
  it can never silently come back.

**Slide: Treat the judge as an instrument, not an oracle**
- Headline: "Calibrate the judge before you trust it."
- Content: give the model-as-judge a clear rubric; watch its biases (favors the
  first option it sees, and longer answers); check its scores against a human
  sample before believing them. Define **model-as-judge**: using one model to
  score another's output.
- Handoff line: "Now you trust it at scale — today. But swap the model next week
  and it can quietly get worse, and the average won't tell you."

### Section 5 — Trust it over time: catch silent failure (3 min)

**Slide: The average is a lie** *(aha #1)*
- Headline: "Same average. One is quietly broken."
- Visual: **two charts, identical average** — one healthy spread, one that nails
  easy cases and fails a new hard case. The number says fine; the shape screams.

**Slide: Watch the spread, not the average**
- Headline: "Watch the spread, not the average."
- Content: keep a fixed set of cases and re-score them continuously as prompts and
  models change. The average can sit still while results split into "great" and
  "terrible." A simple **drift measure** (define: a number that flags when the
  distribution shifts enough to care) raises the alarm.

**Slide: See where it slipped**
- Headline: "When it slips, you need the autopsy."
- Content: record each run as a **trace** (step-by-step tool calls); save the
  judge's written reasons. That log pins the drop to one step. Any tracing tool;
  nothing vendor-specific.
- Handoff line: "Now you trust it over time — as long as your tests actually guard
  you. But the AI wrote those tests too."

### Section 6 — Trust the guards: test the tests (3 min) — LIVE DEMO

**Slide: Code coverage is a lie too** *(aha #2)*
- Headline: "90% coverage. 40% of bugs caught."
- Visual: **the 90%-vs-40% coverage visual** — a big "90% COVERAGE" that run every
  line, next to "40% of deliberate breakages caught." Callback to the hook: the
  AI wrote the code *and* the tests; a test that asserts nothing still passes.

**Slide: Three ways to break code on purpose**
- Headline: "Break it on purpose. Does a test notice?"
- Content (define **mutation testing**: deliberately introduce small bugs and
  check whether any test fails): flip `>` to `>=`; delete a line; flip a
  condition. If the test still passes, it never protected you.

**Slide: Live demo**
- Headline: "Watch the broken code sail through."
- Visual: a **live-demo terminal slide** (big, legible terminal mock). On stage,
  take an AI-written function + its passing AI-written test, flip `>` to `>=`,
  re-run — the test still passes.
- Speaker note / safety: pre-record a backup clip; stage repo + terminal ahead;
  one tiny function and one test so it reads from the back row.
- Handoff line: "Logic, scale, time, guards. That's the whole ladder. So — where
  are you on it today?"

### Section 7 — Close: where are you today (2 min)

**Slide: The five-step maturity scale**
- Headline: "Find your step. Invest in the next one. That's your Monday."
- Visual: a **five-step maturity scale / ladder** the audience places themselves
  on: poking at it by hand → a few scripted tests → automated evaluation in the
  pipeline → monitoring live traffic → continuously tuning.

**Slide: The takeaway ladder** (the slide people photograph)
- Headline: "The whole talk in one image."
- Visual: **the trust ladder** — logic → scale → time → guards → maturity — one
  line under each rung. Make this the single most legible, self-contained slide.
- Reprise the one line. Building the agent was free; this is how you earn the
  right to ship it.

**Slide: Credit**
- Content: "Base playbook adapted from Rana & Ahmed, *Stop Flying Blind:
  Measuring AI Agents in Production.* Made tool-agnostic."

**Slide: Thank-you / Q&A**

### OPTIONAL slides — keep or cut

**OPTIONAL — Cost**
- Headline: "Try cheap first. Escalate only when unsure."
- Content: run the cheap model first, check its answer, escalate to the expensive
  one only on low confidence — usually cheaper at the same quality than always
  reaching for the biggest model. One slide with the token/latency/accuracy math.

**OPTIONAL — Security**
- Headline: "A prompt is not a security boundary."
- Content: treat anything a tool returns as untrusted; limit which tools the agent
  can call; give it the narrowest permissions possible so a bad step can't do much
  damage. One slide.

---

## MEMES & GIFS (important — the user wants these)

The user loves memes and gifs in decks. For the deck as a whole, and ideally once
per section, **suggest a specific meme or gif** that fits that moment: name the
meme format/template and write the exact caption text. Then **insert a clearly
marked placeholder on the slide** so the user can create and paste the real image:

```
[IMAGE PLACEHOLDER: <description of the meme/gif to paste here, including template + caption>]
```

Do **not** fabricate real image paths or URLs — always leave a bracketed
placeholder. These are starting points; propose better ones where you can, but
always leave the placeholder.

Concrete suggestions tied to moments in THIS talk:

1. **Hook — "the author graded their own homework"**
   - Format: the "self-certified" / "I am once again" marking-your-own-exam meme,
     or a kid grading their own test with a big red A+.
   - Caption: "Agent wrote the code. Agent wrote the tests. Agent: 'Looks good to
     me.'"
   - `[IMAGE PLACEHOLDER: self-grading-own-exam meme, caption "Agent wrote the code AND the tests. Grade: A+"]`

2. **Section 5 — "the average is a lie"**
   - Format: the "this is fine" dog *or* a "mean, while the distribution is on
     fire" twist.
   - Caption: "The average: 'Everything's fine.' The distribution: 🔥"
   - `[IMAGE PLACEHOLDER: statistic-hiding-the-truth meme, caption "Average says fine. Distribution is on fire."]`

3. **Section 6 — "code coverage is a lie too"**
   - Format: "This is fine" dog in the burning room.
   - Caption: "90% code coverage. (The tests assert nothing.)"
   - `[IMAGE PLACEHOLDER: this-is-fine dog in burning room, caption "90% coverage"]`

4. **Section 4 — two models disagreeing / hand-labeling vs disagreement-sampling**
   - Format: two-Spider-Men pointing at each other, OR Drake yes/no.
   - Caption (Spider-Men): "Strong model" vs "Cheap model" — "You're wrong." / "No,
     *you're* wrong." → that's your test case.
   - Caption (Drake): reject "Hand-label 10,000 random cases" / approve "Let the
     two models' disagreement pick the cases."
   - `[IMAGE PLACEHOLDER: two-Spider-Men-pointing meme, labels "Strong model" / "Cheap model", caption "Their disagreement = your test set"]`

5. **Section 6 — live demo moment**
   - Format: distracted-boyfriend (eyeing "green checkmark" over "actually
     correct"), OR success-kid "tests pass."
   - Caption: "Tests: PASS ✅  Code: completely broken."
   - `[IMAGE PLACEHOLDER: distracted-boyfriend meme, boyfriend="dev", girlfriend="is it correct?", other woman="tests passed ✅"]`

6. **Section 7 — close / maturity ladder**
   - Format: "We're not the same" OR stonks/level-up.
   - Caption: "You: eyeballing outputs. The agent in prod: continuously evaluated.
     We are not the same."
   - `[IMAGE PLACEHOLDER: "we are not the same" meme, caption "Eyeballing outputs vs continuous evals"]`

A thank-you gif is welcome on the final slide:
`[IMAGE PLACEHOLDER: thank-you gif]`

---

## Formatting + tone constraints

- **Plain language, no unexplained jargon.** The first time any metric or term
  appears (false-alarm rate, grounded, model-as-judge, drift, trace, mutation
  testing), define it in one short clause on the slide.
- **One idea per slide.** One number *or* one visual per slide — never two
  competing points.
- **Minimal, legible text.** Readable from the back of a room: short lines, large
  type, few bullets. Prefer a visual over a paragraph.
- **Vendor-agnostic.** No ADK / GCP / provider-specific tooling or product names.
  "Any tracing tool," "a strong model," "a cheap model."
- **Speaker notes under every slide** — what to say, timing beat, and the
  "trust it to X, but not yet Y" handoff where relevant.
- **Keep to the timing budget** (Hook 2 / merged 1+2 3 / S3 4 / S4 5 / S5 3 /
  S6+demo 3 / Close 2 / Q&A 3 = 25 min). If a section needs multiple slides, keep
  each slide fast.

## Output format

- **Marp-compatible Markdown**, one file.
- **One slide per `---` separator.**
- Begin with a Marp front-matter block (`marp: true` and a theme).
- Headline as an `#`/`##` heading per slide; bullets as `-` lists.
- Speaker notes under each slide as HTML comments: `<!-- speaker notes here -->`.
- **Leave every image as bracketed placeholder text** (`[IMAGE PLACEHOLDER: ...]`)
  — do **not** emit real image paths or `![](...)` links.
