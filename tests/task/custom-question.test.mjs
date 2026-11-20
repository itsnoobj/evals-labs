// Run: node tests/task/custom-question.test.mjs
import assert from "node:assert/strict";
import { CASES, MERCHANTS } from "../../evals-lab/src/task/cases.js";
import { makeCustomCase, CUSTOM_EXAMPLES } from "../../evals-lab/src/task/custom-question.js";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

const amountOf = (t) => makeCustomCase(t).amount;
const merchantOf = (t) => makeCustomCase(t).merchant;

check("shape of a custom case", () => {
  const c = makeCustomCase("Paying ₹500 on Airtel");
  assert.deepEqual(Object.keys(c), ["id", "query", "custom", "merchant", "amount", "expected", "expectedTrajectory"]);
  assert.equal(c.id, "CUSTOM");
  assert.equal(c.custom, true);
  assert.equal(c.expected, null);
  assert.equal(c.expectedTrajectory, null);
});
check("query is trimmed", () => assert.equal(makeCustomCase("  hello  \n").query, "hello"));
check("empty text does not throw", () => {
  const c = makeCustomCase("");
  assert.equal(c.query, "");
  assert.equal(c.amount, null);
  assert.equal(c.merchant, null);
});
check("undefined text does not throw", () => assert.equal(makeCustomCase(undefined).query, ""));

check("amount ₹15,000", () => assert.equal(amountOf("Spending ₹15,000 on Amazon"), 15000));
check("amount Rs 1,800", () => assert.equal(amountOf("Paying Rs 1,800 for power"), 1800));
check("amount rs.800", () => assert.equal(amountOf("food rs.800 today"), 800));
check("amount Rs.800 capital", () => assert.equal(amountOf("Rs.800 of food"), 800));
check("amount plain 1800", () => assert.equal(amountOf("bill of 1800 please"), 1800));
check("amount Indian grouping 1,50,000", () => assert.equal(amountOf("buying a laptop for ₹1,50,000"), 150000));
check("amount with decimals", () => assert.equal(amountOf("Rs 1,299.50 on Amazon"), 1299.5));
check("amount followed by a full stop", () => assert.equal(amountOf("I spend ₹2000."), 2000));
check("no number gives null", () => assert.equal(amountOf("Which card is best for Amazon?"), null));
check("digits glued to a word are ignored", () => {
  assert.equal(amountOf("my id is abc123"), null);
  assert.equal(amountOf("order2go costs 90"), 90);
  assert.equal(amountOf("I bought 5kg then paid 700"), 700);
});
check("first amount wins", () => assert.equal(amountOf("₹500 now, ₹900 later"), 500));

check("merchant Amazon", () => assert.equal(merchantOf("I shop on AMAZON a lot"), "Amazon"));
check("merchant HP Petrol Pump keeps display spelling", () =>
  assert.equal(merchantOf("fuel at an hp petrol pump"), "HP Petrol Pump"),
);
check("merchant BESCOM keeps display spelling", () => assert.equal(merchantOf("my bescom bill"), "BESCOM"));
check("every known merchant is found", () => {
  for (const key of Object.keys(MERCHANTS)) {
    const expected = CASES.find((c) => c.merchant.toLowerCase() === key).merchant;
    assert.equal(merchantOf(`paying on ${key}`), expected);
  }
});
check("unknown merchant gives null", () => assert.equal(merchantOf("Ordering from Zomato"), null));
check("merchant inside a longer word is not a match", () => assert.equal(merchantOf("amazonian rainforest"), null));

check("CUSTOM_EXAMPLES has 4 sentences", () => {
  assert.equal(CUSTOM_EXAMPLES.length, 4);
  for (const t of CUSTOM_EXAMPLES) assert.ok(t.length > 10 && t.length < 100);
});
check("examples 1 and 2 are answerable by the tools", () => {
  const [a, b] = CUSTOM_EXAMPLES.map(makeCustomCase);
  assert.deepEqual([a.merchant, a.amount], ["Swiggy", 650]);
  assert.deepEqual([b.merchant, b.amount], ["BESCOM", 2400]);
});
check("example 3 has an unknown merchant and amount 4200", () => {
  const c = makeCustomCase(CUSTOM_EXAMPLES[2]);
  assert.equal(c.merchant, null);
  assert.equal(c.amount, 4200);
  assert.ok(CUSTOM_EXAMPLES[2].includes("Zomato"));
});
check("example 4 is off topic: no merchant, no amount", () => {
  const c = makeCustomCase(CUSTOM_EXAMPLES[3]);
  assert.equal(c.merchant, null);
  assert.equal(c.amount, null);
  assert.equal(c.query, "What is the capital of France?");
});

console.log(`${passed} checks passed`);
