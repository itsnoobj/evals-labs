# Answer key audit

The Evals Lab answer key uses four real Indian credit cards with cited, merchant-specific rates. This page shows where each number comes from and why each golden case is safe to grade against. Research: `docs/research/card-icici-amazon-pay.md`, `docs/research/card-hdfc-infinia-and-swiggy.md`, `docs/research/card-idfc-first-power-plus.md` (Nov 2026). Data: `evals-lab/src/task/cases.js`.

The sections from "Assumptions" to "All rate cells" are generated. Regenerate them with:

```
node scripts/audit-key.mjs
```

Confidence labels: high = official bank document; medium = agreeing secondary sources or an inferred merchant code; low = the research could not verify it (the cell is set to a number here and cannot change the winner of any case).

## Assumptions

- The cardholder is an Amazon Prime member.
- The purchase is the first of the month, so it is below every monthly or per-cycle cap.
- You pay directly with the card: not UPI, not a wallet, not through a third-party app such as Amazon Pay bill pay or SmartBuy.
- Rewards are valued as cash-like: ICICI Amazon Pay as Amazon Pay balance at Rs 1 per point, HDFC Infinia at Rs 1 per reward point (its best value: SmartBuy flights and hotels, airmiles; a statement credit pays only Rs 0.30, which would be 1%), HDFC Swiggy as a statement credit, IDFC First Power+ at Rs 0.25 per reward point.
- Rates are rupees back per Rs 100 spent.
- This is educational, not financial advice. Card rates and terms change.

## Summary: one row per golden case

| Case | Question | Merchant -> category | HDFC Infinia | IDFC First Power+ | ICICI Amazon Pay | HDFC Swiggy | Accepted | Reward |
|---|---|---|---|---|---|---|---|---|
| C01 | I'm a Prime member spending ₹15,000 on Amazon. Which card should I use? | Amazon -> amazon (Amazon.in) | 3.33% (medium) | 0.5% (medium) | 5% (high) | 5% (medium) | HDFC Swiggy or ICICI Amazon Pay | ₹750 |
| C02 | Ordering ₹800 of food on Swiggy. Which card is best? | Swiggy -> swiggy (Swiggy app) | 3.33% (medium) | 0.5% (medium) | 1% (high) | 10% (high) | HDFC Swiggy | ₹80 |
| C03 | I'm buying a ₹24,999 phone on Flipkart. Which card is best? | Flipkart -> online_shopping (Other online shopping, e.g. Flipkart) | 3.33% (medium) | 0.5% (medium) | 1% (high) | 5% (medium) | HDFC Swiggy | ₹1249.95 |
| C04 | Petrol worth ₹2,000 at an HP Petrol Pump. Which card should I use? | HP Petrol Pump -> fuel_hpcl (HPCL petrol pump) | 0% (medium) | 5% (high) | 0% (high) | 0% (medium) | IDFC First Power+ | ₹100 |
| C05 | Paying my ₹1,800 BESCOM electricity bill directly. Which card should I use? | BESCOM -> utilities (Electricity bill) | 3.33% (medium) | 5% (medium) | 0% (high) | 0% (low) | IDFC First Power+ | ₹90 |
| C06 | Recharging my Airtel postpaid plan, ₹599. Which card is best? | Airtel -> telecom (Phone bill) | 3.33% (medium) | 5% (medium) | 0% (high) | 0% (low) | IDFC First Power+ | ₹29.95 |

## Per case detail

### C01: I'm a Prime member spending ₹15,000 on Amazon. Which card should I use?

Merchant "Amazon" -> category `amazon`. Amount ₹15000. Accepted: hdfc_swiggy or icici_amazon_pay, reward ₹750.

| Card | Rate | Reward | Confidence | Source | Note |
|---|---|---|---|---|---|
| HDFC Swiggy (accepted) | 5% | ₹750 | medium | https://www.grabon.in/indulge/finance/swiggy-hdfc-credit-card-review/ | Amazon is a named 5% online merchant. Cap Rs 1,500 per cycle, applies if Amazon's merchant code is on the 5% list. |
| ICICI Amazon Pay (accepted) | 5% | ₹750 | high | https://www.icici.bank.in/content/dam/icicibank/india/managed-assets/revamp-page-images/docs/pdf/tc-for-amazon-pay-credit-card.pdf | 5% for Prime on amazon.in, uncapped (T&C cl. 7-9). 3% without Prime. |
| HDFC Infinia | 3.33% | ₹499.5 | medium | https://www.livemint.com/money/personal-finance/hdfc-bank-infinia-credit-card-6-reward-points-redemption-options-you-shouldn-t-miss-11750067961156.html | 5 RP per Rs 150 = 3.33 RP per Rs 100. At Rs 1 per RP (SmartBuy flights and hotels, airmiles) that is 3.33%. A statement credit pays Rs 0.30 per RP, which is 1%. SmartBuy voucher bonus (5X) is excluded by the direct-payment assumption. |
| IDFC First Power+ | 0.5% | ₹75 | medium | https://www.idfcfirst.bank.in/content/dam/idfcfirstbank/pdf/cards/Savings-Maximiser-FIRST-Power-plus.pdf | 3 RP per Rs 150 on other retail = 0.5% at Rs 0.25 per RP. The rule is official, Amazon's merchant code is inferred. |

Why it is robust: Both winners are 5%: ICICI is official (high), HDFC Swiggy names Amazon as a 5% merchant (medium). No unverified cell is in this row. Infinia's direct earn is 3.33% at Rs 1 per point, below 5%. Its 5X SmartBuy voucher route and IDFC's marketplace code (cannot be grocery or utility, so it cannot reach 5%) do not apply to a direct swipe. If the HDFC Swiggy cell were wrong, ICICI alone would still win and it is in the accept list.

Check run by this script: with every low-confidence cell set to 0%, the accepted cards are unchanged; set to 1%, unchanged.

### C02: Ordering ₹800 of food on Swiggy. Which card is best?

Merchant "Swiggy" -> category `swiggy`. Amount ₹800. Accepted: hdfc_swiggy, reward ₹80.

| Card | Rate | Reward | Confidence | Source | Note |
|---|---|---|---|---|---|
| HDFC Swiggy (accepted) | 10% | ₹80 | high | https://v.hdfc.bank.in/htdocs/amp/personal/pay/cards/credit-cards/swiggy-hdfc-bank-credit-card.html | 10% on the Swiggy app, Rs 249 minimum per order, Rs 1,500 cap per cycle. Not on Swiggy Money, Minis or Liquor. |
| HDFC Infinia | 3.33% | ₹26.64 | medium | https://cardinsider.com/hdfc-bank/hdfc-bank-infinia-credit-card/ | Same base earn: 3.33% at Rs 1 per RP on a direct swipe (1% as a statement credit). SmartBuy voucher route excluded. |
| ICICI Amazon Pay | 1% | ₹8 | high | https://www.icici.bank.in/content/dam/icicibank/india/managed-assets/revamp-page-images/docs/pdf/tc-for-amazon-pay-credit-card.pdf | 1% on a direct card swipe. The 2% Amazon Pay 'Login and Pay' route is excluded by the direct-payment assumption. |
| IDFC First Power+ | 0.5% | ₹4 | medium | https://www.idfcfirst.bank.in/content/dam/idfcfirstbank/pdf/cards/Savings-Maximiser-FIRST-Power-plus.pdf | Same other-retail rule: 0.5% (food delivery MCC 5814). Swiggy Instamart might code as grocery, not tested here. |

Why it is robust: HDFC Swiggy 10% is on the official page (high). Rs 800 is above the Rs 249 minimum and far below the Rs 1,500 per cycle cap. The best a rival can do is 3.33% (Infinia at Rs 1 per point), 1% (ICICI) or 0.5% (IDFC). Even IDFC at 5% (if Instamart were coded as grocery) would lose.

Check run by this script: with every low-confidence cell set to 0%, the accepted cards are unchanged; set to 1%, unchanged.

### C03: I'm buying a ₹24,999 phone on Flipkart. Which card is best?

Merchant "Flipkart" -> category `online_shopping`. Amount ₹24999. Accepted: hdfc_swiggy, reward ₹1249.95. Note: HDFC Swiggy pays 5% on Flipkart, Rs 1,249.95 here, which stays under its Rs 1,500 cap per cycle.

| Card | Rate | Reward | Confidence | Source | Note |
|---|---|---|---|---|---|
| HDFC Swiggy (accepted) | 5% | ₹1249.95 | medium | https://www.grabon.in/indulge/finance/swiggy-hdfc-credit-card-review/ | Flipkart is a named 5% online merchant. Cap Rs 1,500 per cycle. |
| HDFC Infinia | 3.33% | ₹832.47 | medium | https://cardinsider.com/hdfc-bank/hdfc-bank-infinia-credit-card/ | Same base earn as Amazon: 3.33% at Rs 1 per RP (1% as a statement credit). |
| ICICI Amazon Pay | 1% | ₹249.99 | high | https://www.icici.bank.in/content/dam/icicibank/india/managed-assets/revamp-page-images/docs/pdf/tc-for-amazon-pay-credit-card.pdf | 1% on all non-Amazon platforms (cl. 10). Flipkart's merchant code was not checked. |
| IDFC First Power+ | 0.5% | ₹125 | medium | https://www.idfcfirst.bank.in/content/dam/idfcfirstbank/pdf/cards/Savings-Maximiser-FIRST-Power-plus.pdf | Same other-retail rule: 0.5%. Flipkart's merchant code is inferred. |

Why it is robust: HDFC Swiggy 5% is medium: Flipkart is a named 5% brand in two secondary sources. Rs 24,999 earns Rs 1,249.95, under the Rs 1,500 cycle cap on that 5%. Every rival is 3.33% or less (Infinia). The one way it fails is Flipkart not mapping to a 5% merchant code, then Infinia wins alone at 3.33%. No unverified cell is in this row.

Check run by this script: with every low-confidence cell set to 0%, the accepted cards are unchanged; set to 1%, unchanged.

### C04: Petrol worth ₹2,000 at an HP Petrol Pump. Which card should I use?

Merchant "HP Petrol Pump" -> category `fuel_hpcl`. Amount ₹2000. Accepted: idfc_first_power_plus, reward ₹100.

| Card | Rate | Reward | Confidence | Source | Note |
|---|---|---|---|---|---|
| IDFC First Power+ (accepted) | 5% | ₹100 | high | https://www.idfcfirst.bank.in/content/dam/idfcfirstbank/pdf/cards/Savings-Maximiser-FIRST-Power-plus.pdf | 30 RP per Rs 150 at an authorised HPCL outlet = 5%. Cap Rs 12,000 spend per cycle. Not on UPI. Minimum Rs 150. |
| HDFC Infinia | 0% | ₹0 | medium | https://cardinsider.com/hdfc-bank/hdfc-bank-infinia-credit-card/ | Fuel earns no reward points. The 1% surcharge waiver is not a reward. |
| HDFC Swiggy | 0% | ₹0 | medium | https://www.bankbazaar.com/credit-card/swiggy-hdfc-bank-credit-card.html | Fuel is excluded from cashback. No fuel surcharge waiver on this card either. |
| ICICI Amazon Pay | 0% | ₹0 | high | https://www.icici.bank.in/content/dam/icicibank/india/managed-assets/revamp-page-images/docs/pdf/tc-for-amazon-pay-credit-card.pdf | No reward points on fuel (cl. 13). The 1% surcharge waiver is not a reward. |

Why it is robust: IDFC 5% at an HPCL outlet is official (high). Rs 2,000 is above the Rs 150 minimum and below the Rs 12,000 cycle cap. Every rival is 0 (ICICI high, Infinia and HDFC Swiggy medium: fuel is excluded and a surcharge waiver is not a reward). Infinia's SmartBuy HPCL voucher route is unverified but excluded by the direct-payment assumption.

Check run by this script: with every low-confidence cell set to 0%, the accepted cards are unchanged; set to 1%, unchanged.

### C05: Paying my ₹1,800 BESCOM electricity bill directly. Which card should I use?

Merchant "BESCOM" -> category `utilities`. Amount ₹1800. Accepted: idfc_first_power_plus, reward ₹90. Note: IDFC caps this 5% bucket at Rs 2,000 of spend per cycle, so Rs 1,800 is inside the cap.

| Card | Rate | Reward | Confidence | Source | Note |
|---|---|---|---|---|---|
| IDFC First Power+ (accepted) | 5% | ₹90 | medium | https://www.idfcfirst.bank.in/content/dam/idfcfirstbank/pdf/cards/Savings-Maximiser-FIRST-Power-plus.pdf | 30 RP per Rs 150 on utility MCCs (4814, 4816, 4899, 4900 per the MITC) = 5%. Cap Rs 2,000 spend per cycle, shared with grocery. BESCOM's merchant code is inferred. |
| HDFC Infinia | 3.33% | ₹59.94 | medium | https://v.hdfc.bank.in/htdocs/common/sms-communication-sept.html | Utilities (MCC 4900) still earn base RP, capped at 2,000 RP per month (HDFC notice, Sep 2024). 3.33% at Rs 1 per RP (1% as a statement credit). The Rs 1 value is the medium-confidence part. |
| HDFC Swiggy | 0% | ₹0 | low | https://www.newsbytesapp.com/news/business/swiggy-and-hdfc-bank-launch-blck-ornge-credit-cards/tldr | UNVERIFIED in research (0 per two aggregators, official list not seen), set to 0. Research could not verify this. Cannot change the winner of any case. |
| ICICI Amazon Pay | 0% | ₹0 | high | https://www.icici.bank.in/content/dam/icicibank/india/managed-assets/revamp-page-images/docs/pdf/tc-for-amazon-pay-credit-card.pdf | Utility payments outside Amazon earn nothing since 11 Oct 2025 (cl. 12). 2% only via Amazon bill pay, excluded here. |

Why it is robust: IDFC 5% on utility MCCs is official; BESCOM's MCC 4900 mapping is inferred (medium). Rs 1,800 is inside the Rs 2,000 cycle cap. The unverified cell (HDFC Swiggy utilities, research range 0 to 1) is far below 5%, so it cannot change the winner. ICICI pays 0 direct, Infinia 3.33.

Check run by this script: with every low-confidence cell set to 0%, the accepted cards are unchanged; set to 1%, unchanged.

### C06: Recharging my Airtel postpaid plan, ₹599. Which card is best?

Merchant "Airtel" -> category `telecom`. Amount ₹599. Accepted: idfc_first_power_plus, reward ₹29.95.

| Card | Rate | Reward | Confidence | Source | Note |
|---|---|---|---|---|---|
| IDFC First Power+ (accepted) | 5% | ₹29.95 | medium | https://www.idfcfirst.bank.in/content/dam/idfcfirstbank/pdf/credit-card/MITC-Document-Customer.pdf | Telecom bills use utility MCC 4814 (MITC list) = 5%, same Rs 2,000 cycle cap. Airtel's merchant code is inferred. |
| HDFC Infinia | 3.33% | ₹19.95 | medium | https://v.hdfc.bank.in/htdocs/common/sms-communication-sept.html | Telecom (MCC 4812, 4814, 4899) earns base RP, capped at 2,000 RP per month (HDFC notice, Sep 2024). 3.33% at Rs 1 per RP (1% as a statement credit). |
| HDFC Swiggy | 0% | ₹0 | low | https://www.newsbytesapp.com/news/business/swiggy-and-hdfc-bank-launch-blck-ornge-credit-cards/tldr | UNVERIFIED in research (0 or 1), set to 0. Research could not verify this. Cannot change the winner of any case. |
| ICICI Amazon Pay | 0% | ₹0 | high | https://www.icici.bank.in/content/dam/icicibank/india/managed-assets/revamp-page-images/docs/pdf/tc-for-amazon-pay-credit-card.pdf | Telecom MCCs sit in the utility list, so a direct bill payment earns nothing (cl. 9, 12, 28). |

Why it is robust: IDFC 5% on telecom MCC 4814 is on the official list; Airtel's mapping is inferred (medium). Rs 599 is inside the Rs 2,000 cycle cap. The unverified cell (HDFC Swiggy telecom, research range 0 or 1) is far below 5%, so it cannot change the winner. ICICI pays 0 direct, Infinia 3.33.

Check run by this script: with every low-confidence cell set to 0%, the accepted cards are unchanged; set to 1%, unchanged.

## All rate cells

| Card | Amazon.in | Other online shopping, e.g. Flipkart | Swiggy app | HPCL petrol pump | Electricity bill | Phone bill |
|---|---|---|---|---|---|---|
| HDFC Infinia | 3.33% (medium) | 3.33% (medium) | 3.33% (medium) | 0% (medium) | 3.33% (medium) | 3.33% (medium) |
| IDFC First Power+ | 0.5% (medium) | 0.5% (medium) | 0.5% (medium) | 5% (high) | 5% (medium) | 5% (medium) |
| ICICI Amazon Pay | 5% (high) | 1% (high) | 1% (high) | 0% (high) | 0% (high) | 0% (high) |
| HDFC Swiggy | 5% (medium) | 5% (medium) | 10% (high) | 0% (medium) | 0% (low) | 0% (low) |

## Dropped cases and why

The old golden set had 12 cases on invented flat rates. Case ids are renumbered, so old ids below are only labels. Six cases were dropped, plus IndiGo as a merchant, because the winner is a tie, depends on an unverified merchant code, or does not exist.

| Old case | Why it was dropped |
|---|---|
| C03 DMart (groceries) | IDFC pays 5% only if DMart is coded as a grocery MCC. The bank does not publish its grocery MCC list. No other card has a verified edge, and Infinia's voucher route is unverified. |
| C06 Barbeque Nation (dining) | The cards sit at 0.5% to 1%, and HDFC Swiggy's 1% is inferred from category rules (low). Likely a three-way tie at 1% with no verified margin. |
| C05 IndianOil (fuel) | All four cards pay 0%. IDFC's 5% is for HPCL outlets only, so no winner exists. |
| C10 Zomato (food delivery) | HDFC Swiggy's rate is unverified (Zomato is on no 5% list), and ICICI's 2% Amazon Pay route is unverified. The winner depends on both. |
| C07 MakeMyTrip (travel) | HDFC Swiggy is unverified (1% on the original card, possibly 5% on Ornge or BLCK). Infinia's 10X hotel route needs SmartBuy. Without a verified margin the result is a tie or a guess. |
| IndiGo (merchant only, no old case) | Direct card rates are 0.5% to 1% for every card, HDFC Swiggy's 1% is low confidence, and airline merchant codes are unverified. |
| C12 Jio (recharge) | Jio recharges mostly go through UPI apps. The direct-card merchant code is unverified for IDFC, and HDFC Swiggy telecom is unverified. |

Also removed from `MERCHANTS` because no kept case uses them: BigBasket, DMart, IndianOil, Barbeque Nation, Zomato, MakeMyTrip, IndiGo, Jio.

## Known limits

- Every rate is for one purchase on the first of the month, below all caps. Real months differ: IDFC's 5% bucket for utilities stops at Rs 2,000 of spend per cycle, HPCL fuel at Rs 12,000, HDFC Swiggy's 10% and 5% tiers at Rs 1,500 of cashback per cycle.
- Reward values are cash-like, with one choice made by the user (Nov 2026): Infinia is valued at Rs 1 per point (SmartBuy flights and hotels, airmiles), which gives 3.33%. A statement credit pays Rs 0.30 per point, which is 1%. The Rs 1 value only applies to travel redemptions (flights and hotels up to 70% of the bill, 1,50,000 points per month cap), so 3.33% is Infinia at its best, not what every user gets. No winner changes under either value: the lowest winning rate in the six cases is 5%.
- ICICI points are Amazon Pay balance, not cash. IDFC's Rs 99 redemption fee is not deducted.
- C05 and C06 assume the biller is coded as a utility or telecom merchant on a direct card payment. If a payment goes through a third-party app and is coded differently, IDFC drops to 0.5% and Infinia (3.33%) would win.
- HDFC Swiggy is being phased out for Ornge (5% on the Swiggy app) and BLCK (10%). Under Ornge, C02 would still pick the same card but the reward would be Rs 40, not Rs 80.
- HDFC Swiggy cashback may arrive as Swiggy Money, not a statement credit. The research found conflicting sources and used statement credit.
- C01 is a deliberate tie. Both ICICI Amazon Pay and HDFC Swiggy are accepted, and the reward (Rs 750) is the same.
- Rates change. The research is from Nov 2026. This is educational, not financial advice.
- `evals-lab/data/recorded-runs.json`, `evals-lab/data/dspy-prompt.json` and the Qwen2.5-1.5B spike results were re-recorded on 2026-11-20 on the current key (Infinia 3.33%), with the real model (6 cases x 5 runs, free and constrained). The earlier recordings (Infinia 1%) are in `evals-lab/spike/old-key-infinia-1pct/`.
