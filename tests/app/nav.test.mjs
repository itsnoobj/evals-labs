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
eq(nextScreen(ORDER, "compare", "full"), null, "last screen has no next");
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
eq(pagerFor(ORDER, "compare", "quick").next, { id: "start", text: "Start again" });
eq(pagerFor(ORDER, "compare", "quick").back.id, "run");

console.log(`nav: ${n} checks passed`);
