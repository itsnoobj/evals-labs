// Answer key for the Evals Lab: four REAL Indian credit cards, merchant-specific rates with sources.
// Research and audit: docs/research/card-*.md, docs/answer-key-audit.md (regenerate with scripts/audit-key.mjs).
// Educational, not financial advice. Rates change.
//
// Every rate below is "effective percent back", i.e. rupees back per Rs 100, under the ASSUMPTIONS list.
// The categories are fine on purpose (amazon, swiggy, fuel_hpcl ...), because the offers are merchant-specific.

// Exported so the UI and the docs show the same sentences the numbers were built on.
export const ASSUMPTIONS = [
  "The cardholder is an Amazon Prime member.",
  "The purchase is the first of the month, so it is below every monthly or per-cycle cap.",
  "You pay directly with the card: not UPI, not a wallet, not through a third-party app such as Amazon Pay bill pay or SmartBuy.",
  "Rewards are valued as cash-like: ICICI Amazon Pay as Amazon Pay balance at Rs 1 per point, HDFC Infinia at Rs 1 per reward point (its best value: SmartBuy flights and hotels, airmiles; a statement credit pays only Rs 0.30, which would be 1%), HDFC Swiggy as a statement credit, IDFC First Power+ at Rs 0.25 per reward point.",
  "Rates are rupees back per Rs 100 spent.",
  "This is educational, not financial advice. Card rates and terms change.",
];

export const CARDS = {
  hdfc_infinia: {
    name: "HDFC Infinia",
    rates: { amazon: 3.33, online_shopping: 3.33, swiggy: 3.33, fuel_hpcl: 0, utilities: 3.33, telecom: 3.33 },
  },
  idfc_first_power_plus: {
    name: "IDFC First Power+",
    rates: { amazon: 0.5, online_shopping: 0.5, swiggy: 0.5, fuel_hpcl: 5, utilities: 5, telecom: 5 },
  },
  icici_amazon_pay: {
    name: "ICICI Amazon Pay",
    rates: { amazon: 5, online_shopping: 1, swiggy: 1, fuel_hpcl: 0, utilities: 0, telecom: 0 },
  },
  hdfc_swiggy: {
    name: "HDFC Swiggy",
    rates: { amazon: 5, online_shopping: 5, swiggy: 10, fuel_hpcl: 0, utilities: 0, telecom: 0 },
  },
};

export const CATEGORIES = ["amazon", "online_shopping", "swiggy", "fuel_hpcl", "utilities", "telecom"];

// Short plain labels for the UI. The ids stay what the tools and the model see.
export const CATEGORY_LABELS = {
  amazon: "Amazon.in",
  online_shopping: "Other online shopping, e.g. Flipkart",
  swiggy: "Swiggy app",
  fuel_hpcl: "HPCL petrol pump",
  utilities: "Electricity bill",
  telecom: "Phone bill",
};

export const MERCHANTS = {
  amazon: "amazon",
  flipkart: "online_shopping",
  swiggy: "swiggy",
  "hp petrol pump": "fuel_hpcl",
  bescom: "utilities",
  airtel: "telecom",
};

// One source note per rate cell, keyed `${card}.${category}`. confidence: high = official bank document,
// medium = agreeing secondary sources or an inferred merchant code, low = research could not verify it.
const ICICI_TC =
  "https://www.icici.bank.in/content/dam/icicibank/india/managed-assets/revamp-page-images/docs/pdf/tc-for-amazon-pay-credit-card.pdf";
const INFINIA_VALUE =
  "https://www.livemint.com/money/personal-finance/hdfc-bank-infinia-credit-card-6-reward-points-redemption-options-you-shouldn-t-miss-11750067961156.html";
const INFINIA = "https://cardinsider.com/hdfc-bank/hdfc-bank-infinia-credit-card/";
const HDFC_SMS = "https://v.hdfc.bank.in/htdocs/common/sms-communication-sept.html";
const SWIGGY_OFFICIAL =
  "https://v.hdfc.bank.in/htdocs/amp/personal/pay/cards/credit-cards/swiggy-hdfc-bank-credit-card.html";
const SWIGGY_GRABON = "https://www.grabon.in/indulge/finance/swiggy-hdfc-credit-card-review/";
const SWIGGY_BANKBAZAAR = "https://www.bankbazaar.com/credit-card/swiggy-hdfc-bank-credit-card.html";
const SWIGGY_NEWSBYTES =
  "https://www.newsbytesapp.com/news/business/swiggy-and-hdfc-bank-launch-blck-ornge-credit-cards/tldr";
const IDFC_MAX =
  "https://www.idfcfirst.bank.in/content/dam/idfcfirstbank/pdf/cards/Savings-Maximiser-FIRST-Power-plus.pdf";
const IDFC_MITC = "https://www.idfcfirst.bank.in/content/dam/idfcfirstbank/pdf/credit-card/MITC-Document-Customer.pdf";
const LOW = "Research could not verify this. Cannot change the winner of any case.";

export const RATE_SOURCES = {
  "icici_amazon_pay.amazon": {
    url: ICICI_TC,
    confidence: "high",
    note: "5% for Prime on amazon.in, uncapped (T&C cl. 7-9). 3% without Prime.",
  },
  "icici_amazon_pay.online_shopping": {
    url: ICICI_TC,
    confidence: "high",
    note: "1% on all non-Amazon platforms (cl. 10). Flipkart's merchant code was not checked.",
  },
  "icici_amazon_pay.swiggy": {
    url: ICICI_TC,
    confidence: "high",
    note: "1% on a direct card swipe. The 2% Amazon Pay 'Login and Pay' route is excluded by the direct-payment assumption.",
  },
  "icici_amazon_pay.fuel_hpcl": {
    url: ICICI_TC,
    confidence: "high",
    note: "No reward points on fuel (cl. 13). The 1% surcharge waiver is not a reward.",
  },
  "icici_amazon_pay.utilities": {
    url: ICICI_TC,
    confidence: "high",
    note: "Utility payments outside Amazon earn nothing since 11 Oct 2025 (cl. 12). 2% only via Amazon bill pay, excluded here.",
  },
  "icici_amazon_pay.telecom": {
    url: ICICI_TC,
    confidence: "high",
    note: "Telecom MCCs sit in the utility list, so a direct bill payment earns nothing (cl. 9, 12, 28).",
  },

  "hdfc_infinia.amazon": {
    url: INFINIA_VALUE,
    confidence: "medium",
    note: "5 RP per Rs 150 = 3.33 RP per Rs 100. At Rs 1 per RP (SmartBuy flights and hotels, airmiles) that is 3.33%. A statement credit pays Rs 0.30 per RP, which is 1%. SmartBuy voucher bonus (5X) is excluded by the direct-payment assumption.",
  },
  "hdfc_infinia.online_shopping": {
    url: INFINIA,
    confidence: "medium",
    note: "Same base earn as Amazon: 3.33% at Rs 1 per RP (1% as a statement credit).",
  },
  "hdfc_infinia.swiggy": {
    url: INFINIA,
    confidence: "medium",
    note: "Same base earn: 3.33% at Rs 1 per RP on a direct swipe (1% as a statement credit). SmartBuy voucher route excluded.",
  },
  "hdfc_infinia.fuel_hpcl": {
    url: INFINIA,
    confidence: "medium",
    note: "Fuel earns no reward points. The 1% surcharge waiver is not a reward.",
  },
  "hdfc_infinia.utilities": {
    url: HDFC_SMS,
    confidence: "medium",
    note: "Utilities (MCC 4900) still earn base RP, capped at 2,000 RP per month (HDFC notice, Sep 2024). 3.33% at Rs 1 per RP (1% as a statement credit). The Rs 1 value is the medium-confidence part.",
  },
  "hdfc_infinia.telecom": {
    url: HDFC_SMS,
    confidence: "medium",
    note: "Telecom (MCC 4812, 4814, 4899) earns base RP, capped at 2,000 RP per month (HDFC notice, Sep 2024). 3.33% at Rs 1 per RP (1% as a statement credit).",
  },

  "hdfc_swiggy.amazon": {
    url: SWIGGY_GRABON,
    confidence: "medium",
    note: "Amazon is a named 5% online merchant. Cap Rs 1,500 per cycle, applies if Amazon's merchant code is on the 5% list.",
  },
  "hdfc_swiggy.online_shopping": {
    url: SWIGGY_GRABON,
    confidence: "medium",
    note: "Flipkart is a named 5% online merchant. Cap Rs 1,500 per cycle.",
  },
  "hdfc_swiggy.swiggy": {
    url: SWIGGY_OFFICIAL,
    confidence: "high",
    note: "10% on the Swiggy app, Rs 249 minimum per order, Rs 1,500 cap per cycle. Not on Swiggy Money, Minis or Liquor.",
  },
  "hdfc_swiggy.fuel_hpcl": {
    url: SWIGGY_BANKBAZAAR,
    confidence: "medium",
    note: "Fuel is excluded from cashback. No fuel surcharge waiver on this card either.",
  },
  "hdfc_swiggy.utilities": {
    url: SWIGGY_NEWSBYTES,
    confidence: "low",
    note: `UNVERIFIED in research (0 per two aggregators, official list not seen), set to 0. ${LOW}`,
  },
  "hdfc_swiggy.telecom": {
    url: SWIGGY_NEWSBYTES,
    confidence: "low",
    note: `UNVERIFIED in research (0 or 1), set to 0. ${LOW}`,
  },

  "idfc_first_power_plus.amazon": {
    url: IDFC_MAX,
    confidence: "medium",
    note: "3 RP per Rs 150 on other retail = 0.5% at Rs 0.25 per RP. The rule is official, Amazon's merchant code is inferred.",
  },
  "idfc_first_power_plus.online_shopping": {
    url: IDFC_MAX,
    confidence: "medium",
    note: "Same other-retail rule: 0.5%. Flipkart's merchant code is inferred.",
  },
  "idfc_first_power_plus.swiggy": {
    url: IDFC_MAX,
    confidence: "medium",
    note: "Same other-retail rule: 0.5% (food delivery MCC 5814). Swiggy Instamart might code as grocery, not tested here.",
  },
  "idfc_first_power_plus.fuel_hpcl": {
    url: IDFC_MAX,
    confidence: "high",
    note: "30 RP per Rs 150 at an authorised HPCL outlet = 5%. Cap Rs 12,000 spend per cycle. Not on UPI. Minimum Rs 150.",
  },
  "idfc_first_power_plus.utilities": {
    url: IDFC_MAX,
    confidence: "medium",
    note: "30 RP per Rs 150 on utility MCCs (4814, 4816, 4899, 4900 per the MITC) = 5%. Cap Rs 2,000 spend per cycle, shared with grocery. BESCOM's merchant code is inferred.",
  },
  "idfc_first_power_plus.telecom": {
    url: IDFC_MITC,
    confidence: "medium",
    note: "Telecom bills use utility MCC 4814 (MITC list) = 5%, same Rs 2,000 cycle cap. Airtel's merchant code is inferred.",
  },
};

export function classify_merchant({ merchant } = {}) {
  const key = String(merchant ?? "")
    .trim()
    .toLowerCase();
  // hasOwn: "constructor" or "__proto__" must not resolve to an inherited property.
  const category = Object.hasOwn(MERCHANTS, key) ? MERCHANTS[key] : null;
  return category ? { category } : { error: `unknown merchant: ${merchant}` };
}

// Ties are broken by card id ascending so the ranking is deterministic.
export function rank_cards({ amount, category } = {}) {
  // Small models often emit numbers as strings, so accept "15000".
  const rupees = Number(amount);
  if (!Number.isFinite(rupees) || rupees <= 0) return { error: `invalid amount: ${amount}` };
  if (!CATEGORIES.includes(category)) return { error: `unknown category: ${category}` };
  const ranked = Object.entries(CARDS).map(([card, { rates }]) => ({
    card,
    rate_pct: rates[category],
    reward_inr: Math.round(rupees * rates[category]) / 100,
  }));
  ranked.sort((a, b) => b.reward_inr - a.reward_inr || (a.card < b.card ? -1 : 1));
  return { ranked };
}

export const TOOLS = { classify_merchant, rank_cards };

export function runTool(name, args) {
  const tool = Object.hasOwn(TOOLS, name) ? TOOLS[name] : null;
  return tool ? tool(args ?? {}) : { error: `unknown tool: ${name}` };
}

// Expected category/accept/reward come from the tools themselves, so tests and cases cannot drift apart.
// accept = every card tied for the top reward, sorted by id. card = first of accept (the one rank_cards lists first).
function makeCase(id, query, merchant, amount, note) {
  const { category } = classify_merchant({ merchant });
  const { ranked } = rank_cards({ amount, category });
  const top = ranked[0].reward_inr;
  const accept = ranked
    .filter((r) => r.reward_inr === top)
    .map((r) => r.card)
    .sort();
  return {
    id,
    query,
    merchant,
    amount,
    ...(note ? { note } : {}),
    expected: { category, card: accept[0], accept, reward_inr: top },
    expectedTrajectory: [
      { tool: "classify_merchant", args: { merchant } },
      { tool: "rank_cards", args: { amount, category } },
    ],
  };
}

// The question both screens preselect. Re-decided from fresh benchmark data, so keep it a real case id.
export const DEFAULT_CASE_ID = "C05";

export const CASES = [
  makeCase("C01", "I'm a Prime member spending ₹15,000 on Amazon. Which card should I use?", "Amazon", 15000),
  makeCase("C02", "Ordering ₹800 of food on Swiggy. Which card is best?", "Swiggy", 800),
  makeCase(
    "C03",
    "I'm buying a ₹24,999 phone on Flipkart. Which card is best?",
    "Flipkart",
    24999,
    "HDFC Swiggy pays 5% on Flipkart, Rs 1,249.95 here, which stays under its Rs 1,500 cap per cycle.",
  ),
  makeCase("C04", "Petrol worth ₹2,000 at an HP Petrol Pump. Which card should I use?", "HP Petrol Pump", 2000),
  makeCase(
    "C05",
    "Paying my ₹1,800 BESCOM electricity bill directly. Which card should I use?",
    "BESCOM",
    1800,
    "IDFC caps this 5% bucket at Rs 2,000 of spend per cycle, so Rs 1,800 is inside the cap.",
  ),
  makeCase("C06", "Recharging my Airtel postpaid plan, ₹599. Which card is best?", "Airtel", 599),
];

// Fixed ms and tokens keep tests stable.
export function perfectRun(c) {
  const [classifyStep, rankStep] = c.expectedTrajectory;
  const category = classify_merchant(classifyStep.args).category;
  const ranked = rank_cards(rankStep.args).ranked;
  const best = ranked[0];
  const reply =
    `Use ${CARDS[best.card].name} for ${c.merchant}. ` +
    `It returns ${best.rate_pct}% on ${category}, so you earn ₹${best.reward_inr} on ₹${c.amount}.`;
  const toolStep = (step, output, ms, tokens) => ({
    kind: "tool",
    tool: step.tool,
    args: step.args,
    output,
    raw: JSON.stringify({ tool: step.tool, args: step.args }),
    ms,
    tokens,
    validJson: true,
  });
  const final = { card: best.card, reward_inr: best.reward_inr, reply };
  return {
    caseId: c.id,
    model: "scripted",
    temperature: 0.7,
    seed: 42,
    steps: [
      toolStep(classifyStep, { category }, 800, 60),
      toolStep(rankStep, { ranked }, 900, 70),
      { kind: "final", ...final, raw: JSON.stringify({ final }), ms: 1100, tokens: 40, validJson: true },
    ],
    totalMs: 2800,
    totalTokens: 170,
  };
}
