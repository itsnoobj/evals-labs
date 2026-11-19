// Turns a question the user typed into a case object the agent loop can run.
// A typed question has no answer key, so expected and expectedTrajectory are null.
import { CASES, MERCHANTS } from "./cases.js";

// Clickable examples. Two the tools can answer, one with a merchant the tools do not know, one off topic.
export const CUSTOM_EXAMPLES = [
  "I'm paying ₹4,500 on Amazon. Which card should I use?",
  "Paying my ₹2,400 BESCOM electricity bill directly. Which card is best?",
  "Ordering ₹600 from Zomato. Which card is best?",
  "What is the capital of France?",
];

// ₹15,000 / Rs 1,800 / rs.800 / 1800 / 1,50,000 (Indian grouping). Digits glued to letters ("abc123", "5kg") are skipped.
const AMOUNT = /(?<![\w.,])(?:(?:₹|rs\.?|inr)\s*)?(\d+(?:,\d{2,3})*(?:\.\d+)?)(?!\w)/gi;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function guessAmount(text) {
  for (const m of text.matchAll(AMOUNT)) {
    const n = Number(m[1].replace(/,/g, ""));
    if (n > 0) return n;
  }
  return null;
}

function guessMerchant(text) {
  const lower = text.toLowerCase();
  const key = Object.keys(MERCHANTS).find((k) => new RegExp(`(?<![a-z0-9])${escapeRegex(k)}(?![a-z0-9])`).test(lower));
  if (!key) return null;
  // Use the spelling the built-in cases use, e.g. "HP Petrol Pump".
  return CASES.find((c) => c.merchant.toLowerCase() === key)?.merchant ?? key;
}

export function makeCustomCase(text) {
  const query = String(text ?? "").trim();
  return {
    id: "CUSTOM", query, custom: true,
    merchant: guessMerchant(query), amount: guessAmount(query),
    expected: null, expectedTrajectory: null,
  };
}
