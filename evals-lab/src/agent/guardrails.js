// Guardrails for the agent with evals: plain rules, no AI calls.
// checkInput runs BEFORE the model sees a typed question. checkOutput runs AFTER it answers.
// Both return { ok: true } or { ok: false, rule, reason }. `reason` is one sentence for a visitor.
import { CARDS, MERCHANTS } from "../task/cases.js";
import { SYSTEM_PROMPT } from "./agent-step.js";

const MAX_CHARS = 300;

// Luhn check: the checksum every real card number passes. It keeps random long numbers from being flagged.
function passesLuhn(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1 && (d *= 2) > 9) d -= 9;
    sum += d;
  }
  return sum % 10 === 0;
}

// 13-19 digits, single spaces or dashes allowed between them, Luhn-valid. Commas are not allowed,
// so Indian amounts like 1,50,000 never match. Trade-off: several plain numbers separated by single
// spaces that add up to 13-19 digits and pass Luhn by chance (about 1 in 10) would be flagged.
function looksLikeCardNumber(text) {
  const runs = text.match(/\d(?:[ -]?\d){12,18}/g) ?? [];
  return runs.some((run) => passesLuhn(run.replace(/\D/g, "")));
}

// OTP, CVV, PIN, password within 15 non-digit characters of a 3-8 digit number. "pin code 560001" is a
// postcode, not a PIN, so "pin code" is skipped.
const SECRET_WORD = "(?:otp|cvv|cvc|password|pin(?!\\s*code))";
const SECRET_NEAR_NUMBER = new RegExp(
  `\\b${SECRET_WORD}\\b[^\\d]{0,15}\\d{3,8}|\\d{3,8}[^\\d]{0,15}\\b${SECRET_WORD}\\b`,
  "i",
);

function looksSecret(text) {
  return looksLikeCardNumber(text) || SECRET_NEAR_NUMBER.test(text);
}

const INJECTION_PATTERNS = [
  /\bignore\s+(?:(?:all|the|your|any|my)\s+)*(?:previous|prior|above|earlier)\s+(?:instructions?|rules|prompts?)/i,
  /\bdisregard\b[^.!?]{0,40}\binstructions?/i,
  /\b(?:reveal|print|show|repeat|display|tell me)\b[^.!?]{0,25}\b(?:system|hidden|initial) prompt/i,
  /\byou are now\b/i,
  /\bact as\b/i,
  /\bdeveloper mode\b/i,
  /\bjailbreak/i,
];

const PURCHASE_WORDS = /\b(?:card|pay|buy|spend|bill|order|purchase)/i;
// Trade-off: any digit or rupee sign counts as an amount, so "What is 2+2?" passes this rule.
const AMOUNT = /\d|₹|\brs\b|\binr\b/i;

function mentionsPurchase(text) {
  const lower = text.toLowerCase();
  return AMOUNT.test(text) || PURCHASE_WORDS.test(text) || Object.keys(MERCHANTS).some((m) => lower.includes(m));
}

// Each rule: test(ctx) returns a reason string when it blocks, otherwise null.
const INPUT_RULE_LIST = [
  {
    id: "empty_or_long",
    label: "Empty or too long",
    plain: `Blocks a blank question or one over ${MAX_CHARS} characters.`,
    test: (text) =>
      text.length === 0 || text.length > MAX_CHARS
        ? `Type a question between 1 and ${MAX_CHARS} characters, for example: Ordering ₹800 on Swiggy, which card is best?`
        : null,
  },
  {
    id: "secret_data",
    label: "Card number or secret",
    plain: "Blocks card numbers, and OTP, CVV, PIN or password values.",
    test: (text) => (looksSecret(text) ? "This looks like a card number. Never type real card numbers or OTPs." : null),
  },
  {
    id: "prompt_injection",
    label: "Prompt injection attempt",
    plain: "Blocks text that tries to override or reveal the agent's instructions.",
    test: (text) =>
      INJECTION_PATTERNS.some((p) => p.test(text))
        ? "This tries to change the agent's instructions. Ask about a purchase instead."
        : null,
  },
  {
    id: "off_topic",
    label: "Off topic question",
    plain: "Blocks questions with no purchase, amount, card or known merchant in them.",
    test: (text) =>
      mentionsPurchase(text)
        ? null
        : "This agent only picks a credit card for a purchase. Mention what you are buying and the amount.",
  },
];

// The final answer { card, reward_inr, reply } and the run's amount are in ctx. toolOutputs is accepted
// for the caller's convenience; none of the current rules need it.
const OUTPUT_RULE_LIST = [
  {
    id: "secret_in_reply",
    label: "Secret in reply",
    plain: "Blocks an answer that contains a card number, OTP, CVV, PIN or password.",
    test: ({ final }) =>
      looksSecret(String(final?.reply ?? ""))
        ? "The answer contained something that looks like a card number or secret, so it was withheld."
        : null,
  },
  {
    id: "reward_too_big",
    label: "Reward exceeds purchase",
    plain: "Blocks an answer where the reward is more than the amount spent.",
    test: ({ final, amount }) =>
      typeof amount === "number" && Number(final?.reward_inr) > amount
        ? "The answer claims a reward bigger than the purchase, which cannot be right."
        : null,
  },
  {
    id: "unknown_card",
    label: "Card not in key",
    plain: "Blocks an answer that names a card that is not in the answer key.",
    test: ({ final }) => (Object.hasOwn(CARDS, final?.card) ? null : "The answer named a card this lab does not know."),
  },
  {
    id: "leaked_prompt",
    label: "Leaked system prompt",
    plain: "Blocks an answer that repeats the agent's hidden instructions.",
    test: ({ final }) => {
      const reply = String(final?.reply ?? "").toLowerCase();
      const leaks = ["system prompt", SYSTEM_PROMPT.slice(0, 40), "always start with step 1"];
      return leaks.some((s) => reply.includes(s.toLowerCase()))
        ? "The answer repeated the agent's hidden instructions, so it was withheld."
        : null;
    },
  },
  {
    id: "advice_claim",
    label: "Guaranteed result claim",
    plain: "Blocks answers that promise a guaranteed or risk-free result.",
    test: ({ final }) =>
      /guarantee|risk[- ]free/i.test(String(final?.reply ?? ""))
        ? "The answer promised a guaranteed result. This lab only shows reward estimates, not promises."
        : null,
  },
];

// What the UI shows: the rules without their code.
const describe = ({ id, label, plain }) => ({ id, label, plain });
export const INPUT_RULES = INPUT_RULE_LIST.map(describe);
export const OUTPUT_RULES = OUTPUT_RULE_LIST.map(describe);

function firstBlock(rules, arg) {
  for (const rule of rules) {
    const reason = rule.test(arg);
    if (reason) return { ok: false, rule: rule.id, reason };
  }
  return { ok: true };
}

export function checkInput(text) {
  return firstBlock(INPUT_RULE_LIST, typeof text === "string" ? text.trim() : "");
}

export function checkOutput({ final, toolOutputs, amount } = {}) {
  return firstBlock(OUTPUT_RULE_LIST, { final, toolOutputs, amount });
}
