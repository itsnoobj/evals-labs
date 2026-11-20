import test from "node:test";
import assert from "node:assert/strict";

// state.js reads `document` only when its functions run, so a tiny fake is enough.
const elements = {};
const fakeEl = (props = {}) => ({ value: "", textContent: "", className: "", children: [], ...props });
globalThis.document = {
  getElementById: (id) => elements[id] ?? null,
  createElement: () => fakeEl(),
  querySelectorAll: () => [],
  querySelector: () => null,
};

const { $, caseById, questionFor, state, mark, showError, describeError, sleep, expectedOf, CARD_NAMES } =
  await import("../../evals-lab/src/app/state.js");
const { CASES, CARDS } = await import("../../evals-lab/src/task/cases.js");

const setBoxes = (selectValue, text) => {
  elements.sel = fakeEl({ value: selectValue });
  elements.txt = fakeEl({ value: text });
};

test("$ looks an element up by id", () => {
  elements.thing = fakeEl();
  assert.equal($("thing"), elements.thing);
  assert.equal($("nothing-here"), null);
});

test("caseById finds each case and returns undefined for others", () => {
  for (const c of CASES) assert.equal(caseById(c.id), c);
  assert.equal(caseById("C99"), undefined);
  assert.equal(caseById(""), undefined);
  assert.equal(caseById(undefined), undefined);
});

test("questionFor: the list choice is used when the text box is empty or only spaces", () => {
  setBoxes("C02", "");
  assert.equal(questionFor("sel", "txt"), CASES[1]);
  setBoxes("C03", "   \n\t ");
  assert.equal(questionFor("sel", "txt"), CASES[2]);
});

test("questionFor: typed text wins over the list and is trimmed into a custom case", () => {
  setBoxes("C02", "  Paying ₹500 on Amazon  ");
  const c = questionFor("sel", "txt");
  assert.equal(c.id, "CUSTOM");
  assert.equal(c.custom, true);
  assert.equal(c.query, "Paying ₹500 on Amazon");
  assert.equal(c.amount, 500);
  assert.equal(c.merchant, "Amazon");
  assert.equal(c.expected, null);
});

test("questionFor: unicode and very long text become a custom case without throwing", () => {
  setBoxes("C01", "ಇಂದು ₹1,200 ಖರ್ಚು 🍕");
  assert.equal(questionFor("sel", "txt").amount, 1200);
  const long = "a ".repeat(5000);
  setBoxes("C01", long);
  assert.equal(questionFor("sel", "txt").query, long.trim());
});

test("questionFor: clearing the text box returns to the list", () => {
  setBoxes("C04", "typed");
  assert.equal(questionFor("sel", "txt").custom, true);
  elements.txt.value = "";
  assert.equal(questionFor("sel", "txt"), CASES[3]);
});

test("describeError: Error, string, plain object, null", () => {
  assert.equal(describeError(new Error("boom")), "boom");
  assert.equal(describeError("plain text"), "plain text");
  assert.equal(describeError({ code: 7 }), '{"code":7}');
  assert.equal(describeError({ message: "from object" }), "from object");
  assert.equal(describeError(null), "null");
  assert.equal(describeError(42), "42");
});

test("sleep resolves after about the requested time", async () => {
  const t0 = performance.now();
  await sleep(30);
  assert.ok(performance.now() - t0 >= 25);
});

test("CARD_NAMES maps every card id to its name", () => {
  assert.deepEqual(Object.keys(CARD_NAMES), Object.keys(CARDS));
  for (const [id, card] of Object.entries(CARDS)) assert.equal(CARD_NAMES[id], card.name);
});

test("expectedOf: copies card, accept and reward from the key; null for a custom case", () => {
  for (const c of CASES) {
    const e = expectedOf(c);
    assert.deepEqual(e, { card: c.expected.card, accept: c.expected.accept, reward_inr: c.expected.reward_inr });
    assert.equal("category" in e, false);
  }
  setBoxes("C01", "my own question");
  assert.equal(expectedOf(questionFor("sel", "txt")), null);
  assert.equal(expectedOf({ expected: null }), null);
  assert.equal(expectedOf({}), null);
});

test("state starts with no mode, no model and empty collections", () => {
  assert.equal(state.mode, "none");
  assert.equal(state.llm, null);
  assert.ok(state.done instanceof Set && state.done.size === 0);
  assert.ok(state.bugsTried instanceof Set);
  assert.deepEqual(state.gridRuns, []);
  assert.deepEqual(state.cellRuns, {});
  assert.equal(state.promptTab, "ours");
});

test("mark records a task once; the missions are redrawn only the first time", () => {
  // renderMissions asks the page for every [data-mission] panel, so counting that query counts redraws.
  let redraws = 0;
  const { querySelectorAll } = globalThis.document;
  globalThis.document.querySelectorAll = (sel) => {
    if (sel === "[data-mission]") redraws++;
    return [];
  };
  try {
    mark("task-a");
    assert.ok(state.done.has("task-a"));
    assert.equal(redraws, 1);
    mark("task-a");
    assert.equal(redraws, 1, "second mark of the same task does not redraw");
    mark("task-b");
    assert.equal(redraws, 2);
    assert.deepEqual([...state.done], ["task-a", "task-b"]);
  } finally {
    globalThis.document.querySelectorAll = querySelectorAll;
    state.done.clear();
  }
});

test("showError replaces the root's content with one error paragraph", () => {
  let replaced;
  const root = { replaceChildren: (...kids) => (replaced = kids) };
  showError(root, new Error("model failed"));
  assert.equal(replaced.length, 1);
  assert.equal(replaced[0].className, "err");
  assert.equal(replaced[0].textContent, "Something went wrong: model failed");
  showError(root, "just text");
  assert.equal(replaced[0].textContent, "Something went wrong: just text");
});
