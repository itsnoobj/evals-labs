import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const HTML = readFileSync(new URL("../../evals-lab/index.html", import.meta.url), "utf8");
const head = HTML.slice(HTML.indexOf("<head>"), HTML.indexOf("</head>"));

// Read content of the first <meta> tag whose attribute (property|name) equals key.
function meta(key) {
  const tag = [...head.matchAll(/<meta\b[^>]*>/gs)].map((m) => m[0]).find((t) => t.includes(`"${key}"`));
  return tag?.match(/content="([^"]*)"/s)?.[1];
}

function pngSize(url) {
  const buf = readFileSync(url);
  assert.deepEqual([...buf.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "PNG magic bytes");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), bytes: statSync(url).size };
}

test("head has Open Graph, Twitter and canonical tags with absolute URLs", () => {
  for (const key of ["og:title", "og:description", "og:url", "og:image", "twitter:title", "twitter:image"]) {
    assert.ok(meta(key), `${key} is missing`);
  }
  assert.match(meta("og:image"), /^https:\/\/.+\/assets\/og\.png$/);
  assert.equal(meta("twitter:image"), meta("og:image"));
  assert.equal(meta("twitter:card"), "summary_large_image");
  assert.equal(meta("og:image:width"), "1200");
  assert.equal(meta("og:image:height"), "630");
  assert.ok(meta("og:image:alt"), "og:image:alt is missing");
  assert.ok(meta("description").length <= 160, "description is over 160 characters");
  const canonical = head.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  assert.match(canonical, /^https:\/\//);
  assert.equal(meta("og:url"), canonical);
});

test("og.png is a 1200x630 PNG under 300 KB", () => {
  const { width, height, bytes } = pngSize(new URL("../../evals-lab/assets/og.png", import.meta.url));
  assert.equal(`${width}x${height}`, "1200x630");
  assert.ok(bytes < 300 * 1024, `og.png is ${bytes} bytes`);
});

test("GitHub social preview is a 1280x640 PNG under 1 MB", () => {
  const { width, height, bytes } = pngSize(new URL("../../docs/img/social-preview.png", import.meta.url));
  assert.equal(`${width}x${height}`, "1280x640");
  assert.ok(bytes < 1024 * 1024, `social-preview.png is ${bytes} bytes`);
});
