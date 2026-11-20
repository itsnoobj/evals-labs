import test from "node:test";
import assert from "node:assert/strict";
import { CASES, MERCHANTS } from "../../evals-lab/src/task/cases.js";
import { makeCustomCase } from "../../evals-lab/src/task/custom-question.js";

const amountOf = (t) => makeCustomCase(t).amount;
const merchantOf = (t) => makeCustomCase(t).merchant;

test("non-string input is turned into text and never throws", () => {
  assert.equal(makeCustomCase(null).query, "");
  assert.equal(makeCustomCase(123).query, "123");
  assert.equal(makeCustomCase(123).amount, 123);
  assert.equal(makeCustomCase({}).query, "[object Object]");
  assert.equal(makeCustomCase().merchant, null);
});

test("whitespace-only text (spaces, tabs, newlines) is the same as empty", () => {
  const c = makeCustomCase(" \t\n\r ");
  assert.equal(c.query, "");
  assert.equal(c.amount, null);
  assert.equal(c.merchant, null);
});

test("every merchant key is found in upper, lower and mixed case", () => {
  for (const key of Object.keys(MERCHANTS)) {
    const display = CASES.find((c) => c.merchant.toLowerCase() === key).merchant;
    for (const text of [key.toUpperCase(), key.toLowerCase(), key[0].toUpperCase() + key.slice(1)]) {
      assert.equal(merchantOf(`Paying at ${text} today`), display, text);
    }
  }
});

test("a merchant at the very start or end of the text, or next to punctuation, is found", () => {
  assert.equal(merchantOf("Amazon"), "Amazon");
  assert.equal(merchantOf("buy on Amazon"), "Amazon");
  assert.equal(merchantOf("(Swiggy)"), "Swiggy");
  assert.equal(merchantOf("Swiggy, ₹800?"), "Swiggy");
  assert.equal(merchantOf("amazon.in ₹100"), "Amazon");
});

test("a merchant glued to letters or digits is not matched", () => {
  assert.equal(merchantOf("swiggyy"), null);
  assert.equal(merchantOf("myamazon"), null);
  assert.equal(merchantOf("amazon2"), null);
  assert.equal(merchantOf("2airtel"), null);
});

test("with several merchants named, one known merchant is returned (the first in MERCHANTS order)", () => {
  const first = Object.keys(MERCHANTS).find((k) => ["amazon", "flipkart"].includes(k));
  const expected = CASES.find((c) => c.merchant.toLowerCase() === first).merchant;
  assert.equal(merchantOf("flipkart or amazon?"), expected);
});

test("amount forms: INR prefix, no space, rupee sign with space, full stop after", () => {
  assert.equal(amountOf("INR 2,500 on Amazon"), 2500);
  assert.equal(amountOf("inr2500 on Amazon"), 2500);
  assert.equal(amountOf("₹ 1,500.75."), 1500.75);
  assert.equal(amountOf("12,34,567 spent"), 1234567);
});

test("zero and zero-like amounts are skipped, a later positive amount is used", () => {
  assert.equal(amountOf("₹0 on Amazon"), null);
  assert.equal(amountOf("Rs 0"), null);
  assert.equal(amountOf("₹0 then ₹300"), 300);
  assert.equal(amountOf("0.00 and 450"), 450);
});

test("scientific notation and non-ASCII digits are not read as amounts", () => {
  assert.equal(amountOf("1e5"), null);
  assert.equal(amountOf("₹٥٠٠"), null);
  assert.equal(amountOf("₹１２３"), null);
});

test("unicode text around an amount and merchant does not break parsing", () => {
  const c = makeCustomCase("ಇಂದು 🍕 Swiggy ನಲ್ಲಿ ₹800 ಖರ್ಚು ಮಾಡಿದೆ");
  assert.equal(c.merchant, "Swiggy");
  assert.equal(c.amount, 800);
});

test("very long text: the query is kept whole and parsing still finds the amount", () => {
  const filler = "word ".repeat(20000);
  const c = makeCustomCase(`${filler}₹5`);
  assert.equal(c.query.length, `${filler}₹5`.trim().length);
  assert.equal(c.amount, 5);
  assert.equal(merchantOf(`${filler}amazon`), "Amazon");
});

test("a long run of digits does not hang and yields a finite or null amount", () => {
  const a = amountOf("9".repeat(5000));
  assert.ok(a === null || typeof a === "number");
});

test("each call returns a new object", () => {
  assert.notEqual(makeCustomCase("Amazon ₹5"), makeCustomCase("Amazon ₹5"));
});

test("a double space inside 'HP Petrol Pump' still finds the merchant", () => {
  assert.equal(merchantOf("fuel at HP  Petrol   Pump"), "HP Petrol Pump");
});
