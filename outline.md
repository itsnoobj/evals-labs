# Talk outline — 25 min

**Title:** You Can't Improve What You Can't Measure
**Promise:** Shipping agents you're actually allowed to trust.

---

## The point of the talk

In 2026, building an agent is easy — the model does it. **Trusting it enough to
ship is the hard part, and it's the only part that's still engineering.**

The real subject is the gap between a working demo and something you'd put in
front of real users, customers, or money. Everyone can build the demo now. The
scarce skill is the discipline that earns enough confidence to ship.

**The question the audience holds the whole time:**
> "What would it take for *you* to trust this agent in front of a real user?"

Every section answers one piece of that question. They build on each other like
a ladder — trust the logic, then trust it at scale, then over time, then trust
the tests that are supposed to guard you:

| Trust it to… | Section |
|--------------|---------|
| take the right steps | 3 — Grading the math, not the essay |
| work where you can't hand-label answers | 4 — When the answer key runs out |
| stay good after a model swap | 5 — Silent failure |
| hold up when the tests are also AI-written | 6 — Testing the tests |
| and know your next step | 7 — Where are you today |

Each section ends the same way: *"Now you can trust it to do X. But not yet to
do Y —"* which sets up the next section. That repetition is what makes it feel
like one argument, not seven separate topics.

---

## The one line (say it at the start, say it again at the end)

> "If a human has to eyeball the output to notice a regression, you don't have an
> agent in production — you have a demo that hasn't broken yet."

This line IS the demo-to-production gap in one sentence. Call that out at the end.

## The three "aha" moments (these carry the non-obvious payload)

- **"The average is a lie."** Two charts, same average: one healthy, one quietly
  broken (nails the easy cases, fails a new hard case). The number says fine; the
  shape of the results screams. → why you watch the spread, not the average.
- **"Code coverage is a lie too."** 90% coverage, but the tests catch only 40% of
  deliberately broken code. They run every line and verify nothing.
- **"Two models disagreeing hand you your test set."** You don't need a
  hand-labeled answer key. Where a strong model and a cheap model give different
  answers is exactly where the hard, interesting, or buggy cases live — so you
  only pay a human to check *those*, instead of labeling thousands at random. The
  disagreement picks your test cases for you.

## Credit (put on a slide)

> Base playbook adapted from Rana & Ahmed, *Stop Flying Blind: Measuring AI Agents
> in Production.* Made tool-agnostic.

---

## The flow

### 0. Hook — 2 min
- Set up a belief everyone shares: when you review a pull request, you trust that
  the author and the reviewer are two different people, and that a passing test
  means something.
- Break it: "Your agent opens 40 pull requests today. It wrote the code. It wrote
  the tests too. They pass — of course they do. **The author graded their own
  homework.** And you can't read 40 diffs line by line."
- Name the point: building the agent was the easy part; trusting it is the only
  part still left to engineer. Ask the question the whole talk answers.
- Say the one line. Promise: you'll leave with the exact steps to ship with
  confidence — things you can start Monday.

### 1. Agents aren't like the software you tested before — 2 min
- One slide, three columns: **Traditional Software / A Single Model Call / A Full
  Agent.**
  - What you're testing: a function → a model's one answer → a whole system with
    tools and memory.
  - How it behaves: predictable → one unpredictable answer → unpredictable *and* a
    different path each run.
  - What you measured: pass/fail + coverage → accuracy, text-overlap scores → did
    the task succeed, was the reasoning sound, what did it cost.
- The point: every tool you used to earn trust assumed there was one correct
  answer to check against. Agents don't give you that. **Trust becomes a question
  of "how often and how badly," not "pass or fail."**

### 2. Why agents are hard to trust — 2 min
- Fast list, don't dwell: the same prompt can take two different valid paths;
  tasks are long chains of tool calls that can break anywhere; a test set that was
  right last month goes stale as the world changes; the best judge (a human) is
  slow and expensive, and the scalable judge (another model) needs calibrating;
  and regulated settings need audit trails.
- Handoff: "Each of these is a way trust leaks out. Let's plug them one at a time.
  First: stop trusting the final answer."
- (If a rehearsal runs long, sections 1 and 2 merge cleanly into one 3-min "why
  agents are different.")

### 3. Trust the logic — grade the math, not the essay — 4 min
- **Grading the essay** = read the final answer, decide it "sounds right," ship
  it. This breaks silently every time you change the model, gets hidden behind
  confident-sounding text, can't scale past one person, and gives you no safety
  net against regressions.
- **Grading the math** = check *how* the agent got there. Did it call the right
  tools, in the right order, with the right arguments? This catches broken logic
  even when the answer sounds great — and it runs automatically on every change,
  so a wrong path blocks the deploy.
- **Name the common failures (quick):** inventing tools that don't exist; looping
  forever; missing or irrelevant retrieved data; acting on stale memory; using the
  wrong tool or wrong arguments; committing to a wrong assumption and never
  recovering. Each has a standard fix.
- The non-obvious part: **what you measure changes with the kind of agent.** A
  code-assistant that cries wolf is worse than useless — so its key metric is the
  false-alarm rate. A question-answering agent lives or dies on whether its answer
  is actually grounded in the source. There is no single dashboard.
- Handoff: "Now you trust the logic. But this needs an answer key — a 'correct
  path' written down in advance. That stops working the moment you scale."

### 4. Trust it at scale — when the answer key runs out — 5 min
- **The standard playbook (credit it):** build a curated answer key — real user
  query, the exact tool calls you expect, the reference answer. Treat it like
  production code. Start with 10–20 varied cases including the tricky ones. Run the
  evaluation a few times and average, since answers vary. Your agent should score
  near 100% on its own answer key — that first run becomes your baseline, and any
  later drop is a warning.
- **Where it stops working:** this is fine when there's one knowable right path
  (look up the claim, then look up the customer). It falls apart for open-ended
  agents, where there's no single correct path and no team can hand-write enough
  answer keys to cover the space.
- **What to do instead** → the "two models disagreeing" idea:
  - pull real inputs from production logs instead of inventing them,
  - run each through a strong model and a cheap model; where they *disagree* is
    your shortlist of cases worth a human's attention,
  - every real failure you find gets frozen into the test set permanently, so it
    can never silently come back.
- **Treat the model-as-judge as a measuring instrument, not an oracle:** give it a
  clear rubric, watch for its biases (it favors the first option it sees, and
  longer answers), and check its scores against a human sample before you believe
  them.
- Handoff: "Now you trust it at scale — today. But swap the model next week and it
  can quietly get worse, and the average score won't tell you."

### 5. Trust it over time — catch silent failure — 3 min
- Open on the two-charts visual: same average, one healthy, one quietly broken.
- A test set that was right last month goes stale. So you keep a fixed set of
  cases and re-score them continuously as prompts and models change.
- Watch the **spread of scores, not the average** — the average can sit still
  while the results quietly split into "great" and "terrible." A simple drift
  measure flags when the spread shifts enough to care.
- **Observability:** when something slips, you need to see *where*. Record each run
  as a trace, look at the step-by-step tool calls, and save the judge's written
  reasons — that log is what lets you do the autopsy and pin the drop to one step.
  (Any tracing tool; nothing vendor-specific.)
- Handoff: "Now you trust it over time — as long as your tests actually guard you.
  But remember, the AI wrote those tests too."

### 6. Trust the guards — test the tests — 3 min  ← LIVE DEMO
- Callback to the hook: the author graded its own homework. The AI wrote the code
  *and* the tests. A test that asserts nothing still passes. **Code coverage lies;
  it only proves a line ran, not that anything checked it.**
- The honest measure: deliberately break the code in small ways and see if a test
  notices. 90% coverage with only 40% of breakages caught means the tests are
  theater.
- Three ways to break code on one slide: flip a `>` to `>=`, delete a line, flip a
  condition. If the test still passes, it never protected you.
- **Live demo:** take an AI-written function and its AI-written test that passes.
  On stage, flip `>` to `>=`. Re-run. The test still passes — the broken code
  sailed through. That's the proof, not a claim.
  - Safety: pre-record a backup clip; stage the repo and terminal ahead of time;
    keep it to one tiny function and one test so it reads from the back row.
- Wire this into the pipeline, but only on the files that changed, to keep it fast.
- Handoff: "Logic, scale, time, guards. That's the whole ladder. So — where are
  you on it today?"

### 7. Close — where are you today — 2 min
- A simple five-step maturity scale the audience can place themselves on: poking at
  it by hand → a few scripted tests → automated evaluation in the pipeline →
  monitoring live traffic → continuously tuning. "Find your step. Invest in the
  next one. That's your Monday."
- Name the whole: a frozen test set + the layered checks + continuous monitoring +
  testing the tests — together that's a real development lifecycle for AI, not a
  demo.
- Reprise the point: building the agent was free; this is how you earn the right
  to ship it. Say the one line again. Thank-you.

---

## How the message sticks

- One point, stated at the start and again at the end: trust is the only part
  still left to engineer.
- One question the audience carries throughout: "would you trust this in front of
  a real user?"
- One ladder (logic → scale → time → guards → maturity) so the techniques feel
  like one climb, not a list.
- One repeated phrasing between sections ("trust it to X, but not yet to Y") so
  the transitions carry the story.
- Three memorable visuals: the two charts, 90%-vs-40%, and the two-models-disagree
  picture.
- One takeaway slide = the ladder itself, one line under each step. This is the
  slide people photograph; make it the whole talk in one image.

## Two optional slides — keep or cut (your call)
- **Cost:** try the cheap model first, check its answer, and only escalate to the
  expensive model when the cheap one is unsure — usually cheaper at the same
  quality than always reaching for the biggest model. One slide with the math.
- **Security:** don't trust a prompt to be your security boundary. Treat anything
  a tool returns as untrusted, limit which tools the agent can call, and give it
  the narrowest permissions possible so a bad step can't do much damage. One slide.

## Timing (with live demo)
| Section | Min | Running |
|---------|-----|---------|
| 0 Hook | 2 | 2 |
| 1+2 Why agents are different (merged) | 3 | 5 |
| 3 Grade the math, not the essay | 4 | 9 |
| 4 When the answer key runs out | 5 | 14 |
| 5 Silent failure | 3 | 17 |
| 6 Test the tests + live demo | 3 | 20 |
| 7 Close | 2 | 22 |
| Q&A / buffer | 3 | 25 |

## Decisions
- Live mutation demo: **yes** (section 6).
- Cost + security slides: **pending your review.**
