---
marp: true
theme: default
paginate: true
---

<!--
Talk: You Can't Improve What You Can't Measure
Event: EI India, Pune 2026 — 25 min
Image placeholders are bracketed — create and paste the real meme/gif yourself.
-->

# You Can't Improve What You Can't Measure

### Evals, Harnesses, and Silent Failure in Production Agents

EI India · Pune 2026

<!-- Hold 3s. Don't read the title. Open on the hook next. -->

---

# The author graded their own homework

In a pull request, you trust two things:
the **author and the reviewer are different people**, and a **passing test means something**.

Your agent opens **40 PRs today.**
It wrote the code. It wrote the tests too. They pass — of course they do.

And you can't read 40 diffs line by line.

[IMAGE PLACEHOLDER: self-grading-own-exam meme — kid marking own test with a big red A+. Caption: "Agent wrote the code AND the tests. Grade: A+"]

<!--
~1 min. Land the belief, then break it. The author and the reviewer are the same confident intern.
Point: building the agent was the easy part. Trusting it is the only part still left to engineer.
-->

---

<!-- _class: lead -->

## "If a human has to eyeball the output to notice a regression,
## you don't have an agent in production —
## you have a demo that hasn't broken yet."

<!--
Say it slowly. This line IS the demo-to-production gap. Promise: concrete steps you can start Monday.
Ask the question that runs through the whole talk: "What would it take for YOU to trust this agent in front of a real user?"
-->

---

# You've never tested anything like this

| | Traditional software | A single model call | A full agent |
|---|---|---|---|
| **Testing** | a function | a model's one answer | a whole system (tools, memory) |
| **Behaves** | predictable | one unpredictable answer | unpredictable **and** a new path each run |
| **You measured** | pass/fail, coverage | accuracy, text-overlap | did the task succeed? sound reasoning? cost? |

Every tool you used to earn trust assumed **one correct answer**.
Agents don't give you that. Trust becomes *"how often, how badly"* — not *"pass or fail."*

<!-- ~1.5 min merged with next slide. Don't read the table — point at the last column. -->

---

# Five ways trust leaks out

- Same prompt → **two different valid paths**
- Long tool-call chains → **break anywhere**
- Last month's test set → **goes stale**
- Best judge (a human) is slow and costly; the scalable judge (a model) **needs calibrating**
- Regulated settings → **need audit trails**

> Let's plug them one at a time. First: **stop trusting the final answer.**

<!-- ~1.5 min. Fast. Don't dwell. The handoff line sets up Section 3. -->

---

# Stop grading the essay

| Grading the essay ✗ | Grading the math ✓ |
|---|---|
| Read the answer, "sounds right," ship | Check *how* it got there |
| Breaks silently on every model change | Right tools, order, arguments |
| Hidden behind confident text | Catches broken logic that sounds great |
| Can't scale past one person | Runs automatically on every change |
| No regression net | Wrong path **blocks the deploy** |

<!--
~1.5 min. "Grading the math" = checking the trajectory: the sequence of tool calls, not just the final text.
-->

---

# Six ways the logic breaks — each has a standard fix

- Invents **tools that don't exist**
- **Loops forever**
- **Missing or irrelevant** retrieved data
- Acts on **stale memory**
- **Wrong tool / wrong arguments**
- Commits to a **wrong assumption** and never recovers

[IMAGE PLACEHOLDER: "corporate needs you to find the difference" meme — "a demo" vs "production", caption "They're the same picture (they are not)"]

<!-- ~1 min. Name the enemy fast. Fixes: loop cap, retrieval relevance, trajectory scoring, adversarial prompts. -->

---

# What you measure depends on the agent

**Code-review agent** that cries wolf → worse than useless.
Key metric: **false-alarm rate** — how often it flags something that's actually fine.

**Question-answering agent** → lives or dies on being **grounded**:
every claim traceable to the retrieved source.

> There is no single dashboard.
> Now you trust the *logic*. But this needs an answer key written in advance —
> and that breaks the moment you scale.

<!-- ~1.5 min. Handoff into Section 4. -->

---

# Build an answer key — like production code

A test case = **real query** + **the exact tool calls you expect** + **the reference answer**.

- Start with **10–20 varied cases**, including the tricky ones
- Run each a **few times and average** (answers vary)
- Your agent should score **near 100%** on its own answer key
- That first run is your **baseline**. Any later drop is a warning.

<!-- ~1.5 min. This is the standard playbook — credit it at the end. -->

---

# Fine — until there's no single right path

The answer key works when there's **one knowable path**:
*look up the claim → then look up the customer.*

It falls apart for **open-ended agents**:
no single correct path, and **no team can hand-write enough answer keys** to cover the space.

[IMAGE PLACEHOLDER: Gandalf "you shall not pass" meme — caption "...write a golden answer for every possible path"]

<!-- ~1 min. Set up the pivot: so how do you make a test set without hand-labeling? -->

---

# Let disagreement pick your test cases

Real inputs from production logs
→ run each through a **strong model** AND a **cheap model**
→ where they **disagree** is your shortlist worth a human's time.

Only pay a human for **those** — not thousands at random.

Every real failure you find gets **frozen into the test set forever**, so it can't silently return.

[IMAGE PLACEHOLDER: two-Spider-Men-pointing meme — labels "Strong model" / "Cheap model", caption "Their disagreement = your test set"]

<!-- ~1.5 min. THE aha. Disagreement = free labels, explained plainly. -->

---

# Treat the judge as an instrument, not an oracle

**Model-as-judge** = using one model to score another's output.

Before you believe its scores:
- Give it a **clear rubric**
- Watch its **biases** — it favors the first option it sees, and longer answers
- **Check it against a human sample**

> Now you trust it at scale — *today*. But swap the model next week and it can
> quietly get worse. The average won't tell you.

<!-- ~1 min. Handoff into Section 5. -->

---

# Same average. One is quietly broken.

[IMAGE PLACEHOLDER: two bar charts side by side, identical average line. LEFT "healthy" = even spread. RIGHT "rotting" = tall at high scores + a spike at low scores (nails easy cases, fails a new hard case).]

The number says **fine**. The shape **screams**.

<!-- ~1 min. The strongest visual. Let it sit. This is why you never trust a single average. -->

---

# Watch the spread, not the average

- Keep a **fixed set of cases**, re-score continuously as prompts and models change
- The average can sit still while results split into **"great"** and **"terrible"**
- A **drift measure** — a number that flags when the distribution shifts enough to care — raises the alarm

[IMAGE PLACEHOLDER: "this is fine" dog in burning room, caption "Average: unchanged ✅"]

<!-- ~1 min. Drift measure: PSI/KL in your head, but say it plainly on stage. -->

---

# When it slips, you need the autopsy

- Record each run as a **trace** — the step-by-step tool calls
- **Save the judge's written reasons**
- That log **pins the drop to one step**

Any tracing tool. Nothing vendor-specific.

> Now you trust it over time — as long as your tests actually guard you.
> But remember: **the AI wrote those tests too.**

<!-- ~1 min. Handoff into the demo. -->

---

# 90% coverage. 40% of bugs caught.

The AI wrote the code **and** the tests.
A test that asserts nothing **still passes**.

**Code coverage is a lie** — it only proves a line *ran*, not that anything *checked* it.

[IMAGE PLACEHOLDER: distracted-boyfriend meme — boyfriend "dev", girlfriend "is it correct?", other woman "tests passed ✅"]

<!-- ~1 min. Callback to the hook. Set up mutation testing. -->

---

# Break it on purpose. Does a test notice?

**Mutation testing** = deliberately introduce small bugs, check whether any test fails.

- Flip `>` to `>=`
- Delete a line
- Flip a condition

If the test **still passes**, it never protected you.

<!-- ~45s. Define the term plainly. Then go to the live demo. -->

---

# Live demo — watch the broken code sail through

```text
$ pytest                     # AI-written function + AI-written test
1 passed ✅

# flip  >  to  >=  in the function ...

$ pytest
1 passed ✅                  # the bug sailed straight through
```

The test was **theater**.

[IMAGE PLACEHOLDER: optional "surprised Pikachu" if the demo lands, caption "Test passed. Code is broken."]

<!--
~1.5 min LIVE. Safety: pre-record a backup clip; stage repo + terminal; one tiny function + one test, big font.
Handoff: "Logic, scale, time, guards. That's the whole ladder. So — where are you on it today?"
-->

---

# Find your step. Invest in the next one.

1. **Poking at it by hand**
2. **A few scripted tests**
3. **Automated evaluation in the pipeline**
4. **Monitoring live traffic**
5. **Continuously tuning**

That next step is your **Monday**.

[IMAGE PLACEHOLDER: "we are not the same" meme, caption "Eyeballing outputs vs continuous evals"]

<!-- ~1 min. Let the audience self-locate. -->

---

<!-- _class: lead -->

# The whole talk in one image

**Trust it to…**
take the right steps → work at scale → stay good over time → survive AI-written tests → know your next step

**logic → scale → time → guards → maturity**

> Building the agent was free. **This is how you earn the right to ship it.**

<!-- ~45s. This is the slide people photograph. Reprise the one line out loud. -->

---

# Thank you

Base playbook adapted from Rana & Ahmed,
*Stop Flying Blind: Measuring AI Agents in Production.* Made tool-agnostic.

[IMAGE PLACEHOLDER: thank-you gif]

<!-- Q&A. ~3 min buffer. -->

---

<!-- OPTIONAL SLIDES — keep or cut -->

# (Optional) Try cheap first. Escalate only when unsure.

Run the **cheap model first** → check its answer → escalate to the expensive one **only on low confidence**.

Usually cheaper at the same quality than always reaching for the biggest model.

[IMAGE PLACEHOLDER: Drake meme — reject "always call the biggest model", approve "cheap first, escalate on doubt"]

<!-- Only if time allows. Put one real cost figure here if you have it. -->

---

# (Optional) A prompt is not a security boundary

- Treat **anything a tool returns** as untrusted
- **Limit which tools** the agent can call
- Give it the **narrowest permissions** possible — a bad step can't do much damage

[IMAGE PLACEHOLDER: "one does not simply" Boromir meme, caption "...trust a prompt to be your security boundary"]

<!-- Only if time allows. -->
