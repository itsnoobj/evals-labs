import { test } from "node:test";
import assert from "node:assert/strict";
import { CARDS, CATEGORIES } from "../../evals-lab/src/task/cases.js";
import { cardsMatrixHtml } from "../../evals-lab/src/ui/cards-view.js";

test("matrix shows one card image per card, with the card name next to it", () => {
  const html = cardsMatrixHtml({ cards: CARDS, categories: CATEGORIES });
  for (const { name } of Object.values(CARDS)) {
    assert.ok(html.includes(`alt="${name} card"`), `${name}: no image alt text`);
    assert.ok(html.includes(`<span class="nm">${name}</span>`), `${name}: name text missing`);
  }
  assert.equal((html.match(/class="card-art"/g) ?? []).length, Object.keys(CARDS).length);
});

test("image sits in the row header and the BEST tag is still there", () => {
  const html = cardsMatrixHtml({
    cards: CARDS,
    categories: CATEGORIES,
    selectedCategory: "amazon",
    bestCard: "icici_amazon_pay",
  });
  assert.match(html, /<th scope="row"><img class="card-art"[^>]*><span class="nm">[^<]+<\/span>/);
  assert.match(html, /<b class="tag">BEST<\/b>/);
});

test("a card without a known image gets the placeholder in the matrix", () => {
  const cards = { x: { name: "Mystery Card", rates: { amazon: 1 } } };
  const html = cardsMatrixHtml({ cards, categories: ["amazon"] });
  assert.match(html, /card-art card-art--none/);
});
