// Pure helpers for the judge-calibration experiment (docs/research/judge-calibration.md).
// No DOM, no node-only imports, so a later UI can reuse them. Verdicts are "PASS" | "FAIL" | null (null = unparsable).

// Read the judge's reply as a verdict. Only two shapes count: a "VERDICT: PASS|FAIL" label (the last one wins, so a
// reason that comes first cannot hide it) or a reply that is nothing but PASS or FAIL. Loose words inside a sentence
// ("this would pass") do not count, because they are how a reason sounds, not an answer.
export function parseVerdict(text) {
  const s = String(text ?? "");
  const labelled = [...s.matchAll(/verdict\s*[:=]\s*[*"'`\s]*(pass|fail)\b/gi)];
  if (labelled.length) return labelled.at(-1)[1].toUpperCase();
  const bare = /^[\s*"'`]*(pass|fail)[\s.!*"'`]*$/i.exec(s);
  return bare ? bare[1].toUpperCase() : null;
}

// Pairwise answer: "WINNER: A" or a reply that is just A or B.
export function parseWinner(text) {
  const s = String(text ?? "");
  const labelled = [...s.matchAll(/winner\s*[:=]\s*[*"'`\s]*([ab])\b/gi)];
  if (labelled.length) return labelled.at(-1)[1].toUpperCase();
  const bare = /^[\s*"'`]*([ab])[\s.!*"'`]*$/i.exec(s);
  return bare ? bare[1].toUpperCase() : null;
}

// A 0-5 grade becomes a verdict with a threshold. A missing grade stays null.
export const gradeToVerdict = (score, threshold = 4) =>
  typeof score === "number" ? (score >= threshold ? "PASS" : "FAIL") : null;

// Confusion matrix. Names read "gold, judge": gP_jF = gold PASS, judge said FAIL.
// An unparsable judge reply (null) counts as FAIL, because a pipeline gets no PASS from it. The count is kept apart.
export function confusion(gold, judge) {
  if (gold.length !== judge.length) throw new Error("gold and judge need the same length");
  const m = { gP_jP: 0, gP_jF: 0, gF_jP: 0, gF_jF: 0, unparsable: 0 };
  gold.forEach((g, i) => {
    if (g !== "PASS" && g !== "FAIL") throw new Error(`bad gold label: ${g}`);
    const j = judge[i];
    if (j == null) m.unparsable += 1;
    m[`g${g === "PASS" ? "P" : "F"}_j${j === "PASS" ? "P" : "F"}`] += 1;
  });
  return m;
}

const sum = (m) => m.gP_jP + m.gP_jF + m.gF_jP + m.gF_jF;
const div = (a, b) => (b === 0 ? null : a / b);

export function agreement(m) {
  return div(m.gP_jP + m.gF_jF, sum(m));
}

// Cohen's kappa for two raters and two labels. null when chance agreement is 1 (a constant rater against a constant gold).
export function cohenKappa(m) {
  const n = sum(m);
  if (n === 0) return null;
  const po = (m.gP_jP + m.gF_jF) / n;
  const goldPass = (m.gP_jP + m.gP_jF) / n;
  const judgePass = (m.gP_jP + m.gF_jP) / n;
  const pe = goldPass * judgePass + (1 - goldPass) * (1 - judgePass);
  return pe === 1 ? null : (po - pe) / (1 - pe);
}

// Everything the report needs from one confusion matrix.
export function summarizeConfusion(m) {
  const n = sum(m);
  const goldPass = m.gP_jP + m.gP_jF;
  const goldFail = m.gF_jP + m.gF_jF;
  return {
    n,
    agreement: agreement(m),
    kappa: cohenKappa(m),
    falsePassRate: div(m.gF_jP, goldFail), // judge says PASS, gold says FAIL
    falseFailRate: div(m.gP_jF, goldPass), // judge says FAIL, gold says PASS
    majorityBaseline: div(Math.max(goldPass, goldFail), n),
    alwaysPassBaseline: div(goldPass, n),
    unparsableRate: div(m.unparsable, n),
    matrix: m,
  };
}

// 95% Wilson interval for a share k of n. Small samples make agreement figures loose, so the report shows it.
export function wilson(k, n, z = 1.96) {
  if (n === 0) return null;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

// The bar of the experiment, applied to the frozen variant's TEST summary and J0's TEST summary (both summarizeConfusion output).
export function checkBar(bar, frozen, j0) {
  const lift = frozen.agreement - j0.agreement;
  const lines = {
    kappa: {
      value: frozen.kappa,
      need: `>= ${bar.minKappa}`,
      met: frozen.kappa !== null && frozen.kappa >= bar.minKappa,
    },
    falsePass: {
      value: frozen.falsePassRate,
      need: `<= ${bar.maxFalsePass}`,
      met: frozen.falsePassRate !== null && frozen.falsePassRate <= bar.maxFalsePass,
    },
    liftOverJ0: { value: lift, need: `>= ${bar.minLiftOverJ0}`, met: lift >= bar.minLiftOverJ0 - 1e-9 },
  };
  return { lines, allMet: Object.values(lines).every((l) => l.met) };
}

// Order-bias summary. Each pair is { goldWinner: "A"|"B" for the order (good run listed first = "A"), ab: parsed winner when
// the good run is listed first, ba: parsed winner when the good run is listed second }. Winners are positions "A" | "B" | null.
export function orderBias(pairs) {
  const n = pairs.length;
  let flips = 0;
  let firstPicks = 0;
  let calls = 0;
  let rightBoth = 0;
  let unparsable = 0;
  for (const { ab, ba } of pairs) {
    // Good run is A in "ab" and B in "ba". The same choice of run means ab === "A" and ba === "B".
    const goodAb = ab === "A";
    const goodBa = ba === "B";
    if (ab == null || ba == null) unparsable += (ab == null) + (ba == null);
    if (ab != null && ba != null && goodAb !== goodBa) flips += 1;
    if (ab != null) {
      calls += 1;
      if (ab === "A") firstPicks += 1;
    }
    if (ba != null) {
      calls += 1;
      if (ba === "A") firstPicks += 1;
    }
    if (goodAb && goodBa) rightBoth += 1;
  }
  const answered = pairs.filter((p) => p.ab != null && p.ba != null).length;
  return {
    pairs: n,
    answeredBothOrders: answered,
    flipRate: div(flips, answered),
    firstListedRate: div(firstPicks, calls),
    goodPickedInBothOrders: div(rightBoth, n),
    unparsableCalls: unparsable,
  };
}

// Share of items whose verdict is not the same in every run (variation at temperature > 0). Items are arrays of verdicts.
export const changedShare = (perItemVerdicts) =>
  div(perItemVerdicts.filter((v) => new Set(v).size > 1).length, perItemVerdicts.length);

export const median = (xs) => {
  const s = xs.filter((x) => typeof x === "number").sort((a, b) => a - b);
  if (!s.length) return null;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
