// Prints the answer-key audit (markdown) from the live data in cases.js, so docs/answer-key-audit.md can be regenerated.
// Run: node scripts/audit-key.mjs
import { ASSUMPTIONS, CARDS, CATEGORIES, CATEGORY_LABELS, CASES, RATE_SOURCES, rank_cards } from "../evals-lab/src/task/cases.js";

// Written once by a human from docs/research/*. The numbers around it come from the live data.
const WHY_ROBUST = {
  C01: "Both winners are 5%: ICICI is official (high), HDFC Swiggy names Amazon as a 5% merchant (medium). No unverified cell is in this row. Infinia's direct earn is 3.33% at Rs 1 per point, below 5%. Its 5X SmartBuy voucher route and IDFC's marketplace code (cannot be grocery or utility, so it cannot reach 5%) do not apply to a direct swipe. If the HDFC Swiggy cell were wrong, ICICI alone would still win and it is in the accept list.",
  C02: "HDFC Swiggy 10% is on the official page (high). Rs 800 is above the Rs 249 minimum and far below the Rs 1,500 per cycle cap. The best a rival can do is 3.33% (Infinia at Rs 1 per point), 1% (ICICI) or 0.5% (IDFC). Even IDFC at 5% (if Instamart were coded as grocery) would lose.",
  C03: "HDFC Swiggy 5% is medium: Flipkart is a named 5% brand in two secondary sources. Every rival is 3.33% or less (Infinia). The one way it fails is Flipkart not mapping to a 5% merchant code, then Infinia wins alone at 3.33%. No unverified cell is in this row.",
  C04: "IDFC 5% at an HPCL outlet is official (high). Rs 2,000 is above the Rs 150 minimum and below the Rs 12,000 cycle cap. Every rival is 0 (ICICI high, Infinia and HDFC Swiggy medium: fuel is excluded and a surcharge waiver is not a reward). Infinia's SmartBuy HPCL voucher route is unverified but excluded by the direct-payment assumption.",
  C05: "IDFC 5% on utility MCCs is official; BESCOM's MCC 4900 mapping is inferred (medium). Rs 1,800 is inside the Rs 2,000 cycle cap. The unverified cell (HDFC Swiggy utilities, research range 0 to 1) is far below 5%, so it cannot change the winner. ICICI pays 0 direct, Infinia 3.33.",
  C06: "IDFC 5% on telecom MCC 4814 is on the official list; Airtel's mapping is inferred (medium). Rs 500 is inside the Rs 2,000 cycle cap. The unverified cell (HDFC Swiggy telecom, research range 0 or 1) is far below 5%, so it cannot change the winner. ICICI pays 0 direct, Infinia 3.33.",
};

const acceptFor = (amount, category) => {
  const { ranked } = rank_cards({ amount, category });
  return ranked.filter((r) => r.reward_inr === ranked[0].reward_inr).map((r) => r.card).sort();
};

// Sets every low-confidence cell to `rate`, recomputes the accept list, restores the data.
function acceptWithLowCells(c, rate) {
  const saved = [];
  for (const [key, src] of Object.entries(RATE_SOURCES)) {
    if (src.confidence !== "low") continue;
    const [card, category] = key.split(".");
    saved.push([card, category, CARDS[card].rates[category]]);
    CARDS[card].rates[category] = rate;
  }
  try { return acceptFor(c.amount, c.expected.category); } finally {
    for (const [card, category, old] of saved) CARDS[card].rates[category] = old;
  }
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const out = [];
const log = (line = "") => out.push(line);
const cell = (card, category) => {
  const src = RATE_SOURCES[`${card}.${category}`];
  return `${CARDS[card].rates[category]}% (${src.confidence})`;
};

log("## Assumptions");
log();
for (const a of ASSUMPTIONS) log(`- ${a}`);
log();
log("## Summary: one row per golden case");
log();
log(`| Case | Question | Merchant -> category | ${Object.values(CARDS).map((c) => c.name).join(" | ")} | Accepted | Reward |`);
log(`|---|---|---|${Object.keys(CARDS).map(() => "---").join("|")}|---|---|`);
for (const c of CASES) {
  const { category, accept, reward_inr } = c.expected;
  log(`| ${c.id} | ${c.query} | ${c.merchant} -> ${category} (${CATEGORY_LABELS[category]}) | ${Object.keys(CARDS).map((id) => cell(id, category)).join(" | ")} | ${accept.map((id) => CARDS[id].name).join(" or ")} | ₹${reward_inr} |`);
}
log();
log("## Per case detail");
for (const c of CASES) {
  const { category, accept, reward_inr } = c.expected;
  log();
  log(`### ${c.id}: ${c.query}`);
  log();
  log(`Merchant "${c.merchant}" -> category \`${category}\`. Amount ₹${c.amount}. Accepted: ${accept.join(" or ")}, reward ₹${reward_inr}.${c.note ? ` Note: ${c.note}` : ""}`);
  log();
  log("| Card | Rate | Reward | Confidence | Source | Note |");
  log("|---|---|---|---|---|---|");
  const { ranked } = rank_cards({ amount: c.amount, category });
  for (const r of ranked) {
    const src = RATE_SOURCES[`${r.card}.${category}`];
    log(`| ${CARDS[r.card].name}${accept.includes(r.card) ? " (accepted)" : ""} | ${r.rate_pct}% | ₹${r.reward_inr} | ${src.confidence} | ${src.url} | ${src.note} |`);
  }
  log();
  const lowAt0 = same(acceptWithLowCells(c, 0), accept);
  const lowAt1 = same(acceptWithLowCells(c, 1), accept);
  log(`Why it is robust: ${WHY_ROBUST[c.id] ?? "(no text written yet)"}`);
  log();
  log(`Check run by this script: with every low-confidence cell set to 0%, the accepted cards are ${lowAt0 ? "unchanged" : "CHANGED"}; set to 1%, ${lowAt1 ? "unchanged" : "CHANGED"}.`);
}
log();
log("## All rate cells");
log();
log(`| Card | ${CATEGORIES.map((k) => CATEGORY_LABELS[k]).join(" | ")} |`);
log(`|---|${CATEGORIES.map(() => "---").join("|")}|`);
for (const id of Object.keys(CARDS)) log(`| ${CARDS[id].name} | ${CATEGORIES.map((k) => cell(id, k)).join(" | ")} |`);

console.log(out.join("\n"));
