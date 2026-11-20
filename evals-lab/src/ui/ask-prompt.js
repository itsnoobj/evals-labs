// The prompt a learner can copy into their own chatbot from the explain pop-up. Pure: no DOM, no network.
//
//   buildAskPrompt({ title, what, why, runLines, terms }) -> plain text, at most ASK_PROMPT_MAX characters
//
//   title, what, why  the pop-up's own text.
//   runLines          [string] the "in this run" lines exactly as the pop-up shows them (no extra data).
//   terms             [{ term, text }] glossary words that the pop-up text uses (glossary.js GLOSSARY).
// Every input is stripped of HTML tags and extra spaces. When the prompt is too long, the last run lines go first,
// then the glossary words, and the prompt says that lines were left out.
export const ASK_PROMPT_MAX = 1500;

const ROLE =
  "You help a learner understand one part of a web page called Evals Lab, which teaches how to evaluate an AI agent that picks a credit card.";
const RULES = [
  "Answer only from the CONTEXT below.",
  'If the answer is not in the CONTEXT, say "I do not know from this lab".',
  "Use plain words.",
  "Use at most 5 sentences.",
  "Never invent numbers.",
];
const LEFT_OUT = "(Some lines were left out to keep this short.)";

const plain = (s) =>
  String(s ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 3).trimEnd()}...` : s);

export function buildAskPrompt({ title = "", what = "", why = "", runLines = [], terms = [] } = {}) {
  const lines = runLines.map((l) => clip(plain(l), 200)).filter(Boolean);
  const words = terms
    .filter((t) => plain(t.term) && plain(t.text))
    .map((t) => clip(`${plain(t.term)}: ${plain(t.text)}`, 160));
  const head = [
    ROLE,
    "",
    "RULES:",
    ...RULES.map((r) => `- ${r}`),
    "",
    "CONTEXT:",
    `ELEMENT: ${clip(plain(title), 100)}`,
    `WHAT IT IS: ${clip(plain(what), 240)}`,
    `WHY IT MATTERS: ${clip(plain(why), 240)}`,
  ];
  const build = (nLines, nWords) => {
    const out = [...head, "THIS RUN:"];
    if (lines.length) out.push(...lines.slice(0, nLines).map((l) => `- ${l}`));
    else out.push("- No run yet.");
    if (nLines < lines.length || nWords < words.length) out.push(LEFT_OUT);
    if (nWords) out.push("WORDS:", ...words.slice(0, nWords).map((w) => `- ${w}`));
    out.push("", "MY QUESTION: ");
    return out.join("\n");
  };
  let nLines = lines.length;
  let nWords = words.length;
  while (build(nLines, nWords).length > ASK_PROMPT_MAX && (nLines || nWords)) {
    if (nLines) nLines -= 1;
    else nWords -= 1;
  }
  return build(nLines, nWords);
}
