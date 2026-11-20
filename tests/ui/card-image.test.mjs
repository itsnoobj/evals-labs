import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { CARDS } from "../../evals-lab/src/task/cases.js";
import { CARD_IMAGES, cardImageHtml } from "../../evals-lab/src/ui/card-image.js";

const ROOT = new URL("../../evals-lab/", import.meta.url);

test("every card in cases.js has an image on disk or gets the placeholder", () => {
  for (const { name } of Object.values(CARDS)) {
    const html = cardImageHtml(name);
    const entry = CARD_IMAGES[name];
    if (entry) {
      assert.ok(existsSync(new URL(entry.src, ROOT)), `${name}: ${entry.src} is missing on disk`);
      assert.match(html, /^<img class="card-art" /);
    } else {
      assert.match(html, /^<span class="card-art card-art--none"/);
      assert.ok(html.includes(name), "placeholder shows the card name");
    }
  }
});

test("every mapped file exists, is under 80 KB, and the map has no unknown cards", () => {
  const names = Object.values(CARDS).map((c) => c.name);
  for (const [name, entry] of Object.entries(CARD_IMAGES)) {
    assert.ok(names.includes(name), `${name} is not a card in cases.js`);
    const file = new URL(entry.src, ROOT);
    assert.ok(existsSync(file), `${entry.src} is missing`);
    assert.ok(statSync(file).size < 80 * 1024, `${entry.src} is 80 KB or more`);
    assert.ok(entry.w <= 480 && entry.h > 0, `${entry.src} width is over 480 px`);
  }
});

test("img has alt text, width, height and lazy loading", () => {
  const html = cardImageHtml("HDFC Infinia");
  assert.match(html, /alt="HDFC Infinia card"/);
  assert.match(html, /width="72"/);
  assert.match(html, /height="\d+"/);
  assert.match(html, /loading="lazy"/);
});

test("all image paths are relative, never external or root-absolute", () => {
  for (const { src } of Object.values(CARD_IMAGES)) {
    assert.ok(!/^([a-z]+:)?\/\//i.test(src) && !src.startsWith("/"), `${src} is not relative`);
    assert.ok(!src.startsWith(".."), `${src} leaves the site folder`);
  }
  assert.ok(!/https?:\/\//.test(cardImageHtml("HDFC Swiggy")));
});

test("a card with no image gets a flat placeholder and the name is escaped", () => {
  const html = cardImageHtml('Unknown <b>"Card"</b>');
  assert.match(html, /card-art--none/);
  assert.ok(!html.includes("<b>"));
  assert.ok(!html.includes("<img"));
});
