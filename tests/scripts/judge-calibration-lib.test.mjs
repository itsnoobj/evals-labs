import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseVerdict,
  parseWinner,
  gradeToVerdict,
  confusion,
  agreement,
  cohenKappa,
  summarizeConfusion,
  wilson,
  checkBar,
  orderBias,
  changedShare,
  median,
} from "../../scripts/judge-calibration-lib.mjs";

test("parseVerdict reads a labelled verdict, the last one wins", () => {
  assert.equal(parseVerdict("VERDICT: PASS"), "PASS");
  assert.equal(parseVerdict("verdict: fail"), "FAIL");
  assert.equal(parseVerdict("The reward is wrong, so this would PASS if it were right.\nVERDICT: FAIL"), "FAIL");
  assert.equal(parseVerdict("VERDICT: **PASS**"), "PASS");
});

test("parseVerdict accepts a bare word and rejects loose words in a sentence", () => {
  assert.equal(parseVerdict(" PASS. "), "PASS");
  assert.equal(parseVerdict("fail"), "FAIL");
  assert.equal(parseVerdict("This run would pass."), null);
  assert.equal(parseVerdict("PASS or FAIL"), null);
  assert.equal(parseVerdict(""), null);
  assert.equal(parseVerdict(undefined), null);
});

test("parseWinner", () => {
  assert.equal(parseWinner("WINNER: B"), "B");
  assert.equal(parseWinner("winner=a"), "A");
  assert.equal(parseWinner("A"), "A");
  assert.equal(parseWinner("Answer A is better."), null);
});

test("gradeToVerdict uses the threshold and keeps a missing grade null", () => {
  assert.equal(gradeToVerdict(4), "PASS");
  assert.equal(gradeToVerdict(5), "PASS");
  assert.equal(gradeToVerdict(3), "FAIL");
  assert.equal(gradeToVerdict(null), null);
  assert.equal(gradeToVerdict(3, 3), "PASS");
});

test("confusion counts, treats null as FAIL and counts unparsable apart", () => {
  const m = confusion(["PASS", "PASS", "FAIL", "FAIL", "PASS"], ["PASS", "FAIL", "PASS", "FAIL", null]);
  assert.deepEqual(m, { gP_jP: 1, gP_jF: 2, gF_jP: 1, gF_jF: 1, unparsable: 1 });
  assert.throws(() => confusion(["PASS"], []), /same length/);
  assert.throws(() => confusion(["MAYBE"], ["PASS"]), /bad gold/);
});

test("agreement and kappa on known values", () => {
  // 20 PASS, 20 FAIL gold; judge right on 15 and 15.
  const m = { gP_jP: 15, gP_jF: 5, gF_jP: 5, gF_jF: 15, unparsable: 0 };
  assert.equal(agreement(m), 0.75);
  assert.ok(Math.abs(cohenKappa(m) - 0.5) < 1e-12);
  // perfect and chance-level
  assert.equal(cohenKappa({ gP_jP: 10, gP_jF: 0, gF_jP: 0, gF_jF: 10, unparsable: 0 }), 1);
  assert.equal(cohenKappa({ gP_jP: 5, gP_jF: 5, gF_jP: 5, gF_jF: 5, unparsable: 0 }), 0);
});

test("a judge that always says PASS has kappa 0 and agreement equal to the PASS share", () => {
  const m = confusion(["PASS", "PASS", "PASS", "FAIL"], ["PASS", "PASS", "PASS", "PASS"]);
  const s = summarizeConfusion(m);
  assert.equal(s.agreement, 0.75);
  assert.equal(s.kappa, 0);
  assert.equal(s.falsePassRate, 1);
  assert.equal(s.falseFailRate, 0);
  assert.equal(s.majorityBaseline, 0.75);
  assert.equal(s.alwaysPassBaseline, 0.75);
});

test("kappa is null when chance agreement is 1", () => {
  assert.equal(cohenKappa({ gP_jP: 4, gP_jF: 0, gF_jP: 0, gF_jF: 0, unparsable: 0 }), null);
  assert.equal(cohenKappa({ gP_jP: 0, gP_jF: 0, gF_jP: 0, gF_jF: 0, unparsable: 0 }), null);
});

test("summarizeConfusion rates", () => {
  const s = summarizeConfusion({ gP_jP: 6, gP_jF: 2, gF_jP: 1, gF_jF: 3, unparsable: 1 });
  assert.equal(s.n, 12);
  assert.equal(s.falsePassRate, 0.25);
  assert.equal(s.falseFailRate, 0.25);
  assert.equal(s.majorityBaseline, 8 / 12);
  assert.ok(Math.abs(s.unparsableRate - 1 / 12) < 1e-12);
});

test("wilson interval is inside 0..1 and brackets the share", () => {
  const [lo, hi] = wilson(30, 48);
  assert.ok(lo < 30 / 48 && 30 / 48 < hi && lo > 0.4 && hi < 0.8);
  assert.deepEqual(wilson(0, 0), null);
  assert.equal(wilson(10, 10)[1], 1);
});

test("checkBar needs all three lines", () => {
  const bar = { minKappa: 0.4, maxFalsePass: 0.2, minLiftOverJ0: 0.2 };
  const j0 = { agreement: 0.65 };
  const good = checkBar(bar, { agreement: 0.9, kappa: 0.7, falsePassRate: 0.1 }, j0);
  assert.equal(good.allMet, true);
  const lowLift = checkBar(bar, { agreement: 0.8, kappa: 0.7, falsePassRate: 0.1 }, j0);
  assert.equal(lowLift.lines.liftOverJ0.met, false);
  assert.equal(lowLift.allMet, false);
  const nullKappa = checkBar(bar, { agreement: 0.9, kappa: null, falsePassRate: 0 }, j0);
  assert.equal(nullKappa.lines.kappa.met, false);
  const exactLift = checkBar(bar, { agreement: 0.85, kappa: 0.5, falsePassRate: 0.2 }, j0);
  assert.equal(exactLift.allMet, true);
});

test("orderBias: consistent judge, always-first judge, always-second judge", () => {
  // good run is A in "ab" and B in "ba"
  const consistent = orderBias([
    { ab: "A", ba: "B" },
    { ab: "A", ba: "B" },
  ]);
  assert.equal(consistent.flipRate, 0);
  assert.equal(consistent.goodPickedInBothOrders, 1);
  assert.equal(consistent.firstListedRate, 0.5);

  const alwaysFirst = orderBias([
    { ab: "A", ba: "A" },
    { ab: "A", ba: "A" },
  ]);
  assert.equal(alwaysFirst.flipRate, 1);
  assert.equal(alwaysFirst.firstListedRate, 1);
  assert.equal(alwaysFirst.goodPickedInBothOrders, 0);

  const alwaysSecond = orderBias([{ ab: "B", ba: "B" }]);
  assert.equal(alwaysSecond.flipRate, 1);
  assert.equal(alwaysSecond.firstListedRate, 0);

  const withNull = orderBias([
    { ab: "A", ba: null },
    { ab: "A", ba: "B" },
  ]);
  assert.equal(withNull.answeredBothOrders, 1);
  assert.equal(withNull.unparsableCalls, 1);
  assert.equal(withNull.flipRate, 0);
});

test("changedShare and median", () => {
  assert.equal(
    changedShare([
      ["PASS", "PASS", "PASS"],
      ["PASS", "FAIL", "PASS"],
    ]),
    0.5,
  );
  assert.equal(changedShare([]), null);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([]), null);
});
