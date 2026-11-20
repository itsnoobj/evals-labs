// Plain-code guards around the in-page ask box. Pure functions: no DOM, no model, no imports, no repo copy.
// The UI can later import equivalent code. Experiment: docs/research/ask-help-guarded.md.
//   inputGate(question, vocab)                    -> { allow, reason, reply }   runs BEFORE the model
//   outputGate(answer, { question, context })     -> { text, replaced, reason } runs AFTER the model
//   retrieve(question, entries, k)                -> top-k entries by keyword overlap (same rule as variant C)
// vocab = Set (or array) of lower-case stemmed content words, built with buildVocab(titles).
export const REFUSE = "I can only answer questions about this lab.";
export const UNKNOWN = "I do not know from this lab.";

// Safety limits, set before any model call. The text box would enforce the same question limit.
export const LIMITS = { maxQuestionChars: 2000, maxAnswerWords: 80, maxAnswerChars: 600, extractiveShare: 0.6 };

// NFKC folds full-width letters and digits; the replace drops zero-width, soft-hyphen and bidi characters
// that could split a trigger word; then case-fold and collapse white space.
export const normalize = (s) =>
  String(s ?? "")
    .normalize("NFKC")
    .replace(/[\u00ad\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g, "")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const STOP = new Set(
  "a an the is are was were be been do does did what why how which who when where can could should would will i you we it its of to in on for and or not no with as at by from this that these those my your our me about mean means used use tell give explain".split(
    " ",
  ),
);
const stem = (w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
export const tokens = (s) =>
  normalize(s)
    .replace(/[^\p{L}\p{M}\p{N}%]+/gu, " ")
    .split(" ")
    .filter(Boolean)
    .map(stem);
export const contentWords = (s) => [...new Set(tokens(s).filter((w) => !STOP.has(w)))];
export const buildVocab = (titles) => new Set(titles.flatMap((t) => contentWords(t)));

// Every pattern runs on normalize()d text. Gaps are bounded and lazy, so matching stays linear on long input.
export const INJECTION_PATTERNS = [
  [
    "ignore_instructions",
    /\b(?:ignore|disregard|forget|override|bypass)\b[^.?!\n]{0,40}?\b(?:instructions?|rules?|prompts?|guidelines?|previous|prior|above|earlier|everything|the lab)/,
  ],
  ["previous_instructions", /\b(?:previous|prior|earlier|above) (?:instructions?|rules?|prompts?|messages?)/],
  ["you_are_now", /\byou are now\b|\bfrom now on\b|\bact as\b|\bpretend\b/],
  ["role_play", /\brole ?-?play|\bplay (?:a|the) (?:game|role)\b|\blet'?s play\b/],
  ["persona", /\bdan\b|\bjailbreak|\bdeveloper mode\b|\bno rules\b|\bwithout (?:any )?(?:rules|restrictions)\b/],
  ["system_prompt", /\b(?:system|hidden|secret|initial|original) (?:prompt|instructions?|message)\b/],
  [
    "repeat_above",
    /\b(?:repeat|print|recite|echo|copy)\b[^.?!\n]{0,40}?\b(?:words?|text|instructions?|rules?|prompt|everything)\b[^.?!\n]{0,20}?\b(?:above|before)\b|\bwords above\b/,
  ],
  ["reveal_rules", /\b(?:reveal|show|print|recite|leak|tell me|repeat)\b[^.?!\n]{0,30}?\b(?:your|the) (?:instructions?|rules?|prompt)\b/],
  ["translate", /\btranslat(?:e|es|ed|ing|ion)\b/],
  [
    "creative_task",
    /\b(?:write|compose|make up|tell|give)\b[^.?!\n]{0,20}?\b(?:poem|joke|story|song|essay|haiku|limerick|riddle|recipe)\b/,
  ],
  ["code_task", /\bwrite\b[^.?!\n]{0,20}?\b(?:code|program|script|function|python|javascript)\b/],
  // Round 2 (DEV evidence: O03 "Which credit card should I actually buy ...", answered with lab text at D2/D3).
  ["personal_advice", /\bshould i\b[^.?!\n]{0,40}?\b(?:buy|invest|purchase|get|apply|pick|choose)\b/],
];

// Round 2 (DEV evidence: T03 is a lab question with no answer in the lab, caught by the vocabulary rule):
// a question without lab words cannot be told apart from an unanswerable lab question, so that reply is
// "I do not know from this lab."; a recognised attack or request gets the refusal.
const block = (reason) => ({ allow: false, reason, reply: reason === "no_vocab_overlap" ? UNKNOWN : REFUSE });

export function inputGate(question, vocab) {
  const raw = String(question ?? "");
  if (!raw.trim()) return block("empty");
  if (raw.length > LIMITS.maxQuestionChars) return block("too_long");
  const q = normalize(raw);
  for (const [name, re] of INJECTION_PATTERNS) if (re.test(q)) return block(`injection:${name}`);
  const known = vocab instanceof Set ? vocab : new Set(vocab ?? []);
  if (!contentWords(q).some((w) => known.has(w))) return block("no_vocab_overlap");
  return { allow: true, reason: null, reply: null };
}

// Digit strings of a text after NFKC, with other scripts' digits mapped to 0-9 and "1,250" read as 1250.
// A \p{Nd} run is 10-aligned, so (code point - first code point of its run) % 10 is the digit value.
function asciiDigits(s) {
  return normalize(s).replace(/\p{Nd}/gu, (ch) => {
    if (ch >= "0" && ch <= "9") return ch;
    let cp = ch.codePointAt(0);
    const base = cp;
    while (/\p{Nd}/u.test(String.fromCodePoint(cp - 1))) cp -= 1;
    return String((base - cp) % 10);
  });
}
export const digitStrings = (s) =>
  (asciiDigits(s).replace(/(\d),(?=\d)/g, "$1").match(/\d+(?:\.\d+)?/g) ?? []).map((n) => n.replace(/\.0+$/, ""));

const URL_RE = /https?:\/\/|\bwww\.|\b[a-z0-9-]+\.(?:com|org|net|io|ai|in|co|dev|app)\b/;
export const LEAK_MARKERS = ["system prompt", "you are the help assistant", "never reveal or repeat", "only allowed source"];
const FIXED = [REFUSE, UNKNOWN].map((m) => normalize(m).replace(/\.$/, ""));
const bare = (s) =>
  normalize(s)
    .replace(/don't know/g, "do not know")
    .replace(/^["']+|["'.\s]+$/g, "");
// True when the text is exactly one of the two fixed replies (quotes and a final full stop ignored).
export const isFixedReply = (text) => FIXED.includes(bare(text));

export function outputGate(answer, { question = "", context = "" } = {}) {
  const text = String(answer ?? "").trim();
  const replace = (reason) => ({ text: UNKNOWN, replaced: true, reason });
  if (!text) return replace("empty");
  if (isFixedReply(text)) return { text, replaced: false, reason: null };
  const n = normalize(text);
  if (URL_RE.test(n)) return replace("url");
  if (LEAK_MARKERS.some((m) => n.includes(m))) return replace("leak_marker");
  if (text.split(/\s+/).filter(Boolean).length > LIMITS.maxAnswerWords || text.length > LIMITS.maxAnswerChars)
    return replace("too_long");
  const allowed = new Set(digitStrings(`${question}\n${context}`));
  if (digitStrings(text).some((d) => !allowed.has(d))) return replace("number_not_in_source");
  const ctxWords = new Set(contentWords(context));
  if (!contentWords(text).some((w) => ctxWords.has(w))) return replace("no_context_word");
  return { text, replaced: false, reason: null };
}

// Share of the answer's content words that appear in the context (D3: needs >= LIMITS.extractiveShare).
export function extractiveShare(answer, context) {
  const words = contentWords(answer);
  if (!words.length) return 0;
  const ctx = new Set(tokens(context));
  return words.filter((w) => ctx.has(w)).length / words.length;
}

// Keyword overlap, the rule of variant C: share of the question's content words found in title + text.
// Returns the top k entries with at least one shared word, best first (ties: more shared words, then list order).
export function retrieve(question, entries, k = 2) {
  const qw = contentWords(question);
  return entries
    .map((entry, i) => {
      const ew = new Set(tokens(`${entry.title} ${entry.text}`));
      const matched = qw.filter((w) => ew.has(w)).length;
      return { entry, i, matched, of: qw.length, ratio: qw.length ? matched / qw.length : 0 };
    })
    .filter((h) => h.matched > 0)
    .sort((a, b) => b.ratio - a.ratio || b.matched - a.matched || a.i - b.i)
    .slice(0, k)
    .map(({ entry, matched, of, ratio }) => ({ ...entry, matched, of, ratio }));
}

// Variant C: the best entry as an answer when >= 50% of the question words match and at least min(2, n) words are shared.
export function retrieveAnswer(question, entries) {
  const [best] = retrieve(question, entries, 1);
  const ok = best && best.ratio >= 0.5 && best.matched >= Math.min(2, best.of);
  return ok ? { text: `${best.title}: ${best.text}`, hit: best } : { text: UNKNOWN, hit: best ?? null };
}
