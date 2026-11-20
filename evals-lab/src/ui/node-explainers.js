// Two plain sentences per wiring node, shown at the top of the explain dialog (explain-dialog.js).
// Rules: 15 words or fewer each, one idea per sentence, no figures that are not read from code, no metaphors.
// Keys are exactly the node ids of wiring-graph.js (tests/ui/node-explainers.test.mjs checks both).
export const NODE_EXPLAIN = {
  dataset: {
    what: "Real questions that people ask, collected in one list.",
    why: "Tests built from real questions show real problems.",
  },
  key: {
    what: "The correct answer for each question, written down before any test runs.",
    why: "Without a correct answer, a result cannot be marked right or wrong.",
  },
  prompt: {
    what: "The instructions the model reads before it answers.",
    why: "A small change here can change every answer.",
  },
  checks: {
    what: "The list of things we measure on every run.",
    why: "A problem nobody measures stays hidden until a user finds it.",
  },
  bar: {
    what: "The score a change must reach before it ships.",
    why: "Setting it first stops anyone lowering it later.",
  },
  ask: {
    what: "The question the user types.",
    why: "Every later step starts from this text.",
  },
  guard: {
    what: "Plain rules that read the question before the model does.",
    why: "A blocked question never reaches the model.",
  },
  model: {
    what: "The AI that decides: call a tool, or give the answer.",
    why: "Its choices set the tool calls and the final answer.",
  },
  t1: {
    what: "Our code finds the spending category of the shop.",
    why: "The ranking in the next step needs this category.",
  },
  c1: {
    what: "A checker that reads what the model sent to the tool.",
    why: "A wrong tool input gives a wrong result that looks right.",
  },
  t2: {
    what: "Our code ranks the cards for this amount and category.",
    why: "The best card is the first one in this ranking.",
  },
  c2: {
    what: "A checker that confirms the ranking used the right amount and category.",
    why: "A ranking for the wrong amount gives the wrong card.",
  },
  draft: {
    what: "The first answer the model writes from the tool results.",
    why: "Its card and numbers must match the tool results.",
  },
  c3: {
    what: "A checker that tests the draft answer against the tool results.",
    why: "It stops a wrong card or a made-up number.",
  },
  retry: {
    what: "Run the attempt again when the answer check fails.",
    why: "A second try can fix a one-off mistake.",
  },
  fallback: {
    what: "An answer built straight from the ranking when every try fails.",
    why: "The user still gets an answer based on checked data.",
  },
  refuse: {
    what: "A plain message that no answer could be verified.",
    why: "Saying so is safer than guessing.",
  },
  answer: {
    what: "The reply the user sees.",
    why: "This is the only part the user judges.",
  },
  trace: {
    what: "A saved record of every step in the run.",
    why: "A run you cannot replay is hard to fix.",
  },
  eval: {
    what: "Automatic checks that read the saved run and mark it.",
    why: "The same checks on every run make results comparable.",
  },
  judge: {
    what: "A second AI that reads the run and grades the reply from 0 to 5.",
    why: "It judges quality that fixed rules cannot, but it does not decide shipping.",
  },
  card: {
    what: "All check results on one page.",
    why: "A person sees at once which checks failed.",
  },
  gate: {
    what: "The pass or fail decision before shipping.",
    why: "A missed pass bar stops the change from shipping.",
  },
};
