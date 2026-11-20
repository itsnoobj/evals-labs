import assert from "node:assert/strict";
import {
  ORDER,
  QUICK,
  visibleScreens,
  nextScreen,
  prevScreen,
  pickLevel,
  levelForScreen,
  screenForLevel,
  pagerFor,
} from "../../evals-lab/src/app/nav.js";

let n = 0;
const eq = (a, b, msg) => {
  assert.deepEqual(a, b, msg);
  n++;
};

// which screens each level shows
eq(visibleScreens(ORDER, "full"), ORDER, "full shows everything");
eq(visibleScreens(ORDER, "quick"), ["start", "run", "compare"], "quick shows the 3 story screens");
eq(QUICK, ["start", "run", "compare"]);

// next / back
eq(nextScreen(ORDER, "start", "full"), "run");
eq(nextScreen(ORDER, "run", "full"), "metrics");
eq(nextScreen(ORDER, "run", "quick"), "compare", "quick skips the middle screens");
eq(nextScreen(ORDER, "compare", "full"), null, "screen 5 is the last screen");
eq(nextScreen(ORDER, "compare", "quick"), null);
eq(nextScreen(ORDER, "nope", "full"), null, "unknown screen");
eq(nextScreen(ORDER, "metrics", "quick"), "compare", "works from a hidden screen");
eq(prevScreen(ORDER, "start", "full"), null, "first screen has no back");
eq(prevScreen(ORDER, "compare", "quick"), "run");
eq(prevScreen(ORDER, "compare", "full"), "compounding");
eq(prevScreen(ORDER, "golden", "quick"), "run", "works from a hidden screen");

// default level and saved choice
eq(pickLevel({ stored: null, isPhone: true }), "quick");
eq(pickLevel({ stored: null, isPhone: false }), "full");
eq(pickLevel({ stored: "full", isPhone: true }), "full", "saved choice wins");
eq(pickLevel({ stored: "quick", isPhone: false }), "quick");
eq(pickLevel({ stored: "junk", isPhone: true }), "quick", "bad saved value is ignored");

// a hidden screen opened by link switches to the full path
eq(levelForScreen("quick", "metrics"), "full");
eq(levelForScreen("quick", "compare"), "quick");
eq(levelForScreen("full", "metrics"), "full");
eq(screenForLevel(ORDER, "golden", "quick"), "run", "toggle to quick while on a hidden screen");
eq(screenForLevel(ORDER, "run", "quick"), "run");

// footer buttons
eq(pagerFor(ORDER, "start", "full"), { back: null, next: { id: "run", text: "Next: 1 Run \u2192" } });
eq(pagerFor(ORDER, "run", "full").next.text, "Next: 2 Checks \u2192");
eq(pagerFor(ORDER, "run", "full").back, { id: "start", text: "\u2190 Back" });
eq(pagerFor(ORDER, "run", "quick").next, { id: "compare", text: "Next: Side by side \u2192" });
eq(pagerFor(ORDER, "compare", "full").next, { id: "start", text: "Start again" });
eq(pagerFor(ORDER, "compare", "full").back.id, "compounding");
eq(pagerFor(ORDER, "compare", "quick").next, { id: "start", text: "Start again" });
eq(pagerFor(ORDER, "compare", "quick").back.id, "run");

// ORDER ends at Side by side; the quick path hides the middle screens
eq(ORDER, ["start", "run", "metrics", "golden", "compounding", "compare"]);

// the top nav and the phone tab bar (the same <nav>) have Start plus screens 1 to 5, and no judge lab tab or section
{
  const { readFileSync } = await import("node:fs");
  const html = readFileSync(new URL("../../evals-lab/index.html", import.meta.url), "utf8");
  const navHtml = html.slice(html.indexOf("<nav"), html.indexOf("</nav>"));
  eq(navHtml.match(/<a class="nav"/g).length, 6, "Start plus screens 1 to 5");
  eq(/judge|soon/i.test(navHtml), false, "no judge lab tab or SOON tag in the nav");
  eq(/<section id="judge"/.test(html), false, "no judge lab section");
  eq(
    [...navHtml.matchAll(/data-screen="(\w+)"/g)].map((m) => m[1]),
    ORDER,
    "tabs match ORDER",
  );
}

console.log(`nav: ${n} checks passed`);
