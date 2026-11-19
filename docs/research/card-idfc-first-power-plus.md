# IDFC FIRST Power+ Credit Card: reward per merchant (researched Nov 2026)

Method: web search and fetch, official PDFs read as text. No `.env` file was read.
Values are rupees back per Rs 100 spent ("effective_pct"). Points are redeemed as statement credit at 1 reward point (RP) = Rs 0.25.
The Rs 99 per-redemption fee (MITC, Nov 2026) is NOT deducted below. For a single redemption it would erase the reward on one purchase.

## 1. Which card this is (variant check)

| Variant | Facts | Notes |
|---|---|---|
| **FIRST Power+** (the card described here) | Fuel 6.5% (5% RP at HPCL + 1.5% Happy Coins via HP Pay), grocery and utility 5%, FASTag 5%, all other retail and UPI 3X. Fee Rs 499. | Official page, Savings Maximiser, Product Guide. |
| FIRST Power (base HPCL co-brand) | Fuel up to 5%, grocery and utility only 2.5%. Fee Rs 199. | Official page shows both cards side by side. Do NOT use its numbers. |
| IDFC FIRST Family / WOW / Select / Wealth etc. | 1 RP per Rs 200, "10X" on birthday, dining, travel, international. Fuel excluded. | The search hit "Family Product Guide_26-10-2026" is a different card. Not Power+. |

Name confusion: Paisabazaar, CardInsider and BankBazaar call the card "HPCL IDFC FIRST Power Plus". It is the same card as "FIRST Power+".
BankBazaar still says "24X on HPCL fuel", "min monthly spend Rs 5,000 for lounge" and "Rs 10,000 fuel surcharge waiver". Those figures conflict with the official 2024 to 2026 documents and are treated as stale.

## 2. Key finding: Power+ has no 3X/10X monthly-threshold mechanism

- Power+ earn tiers are fixed by category, not by monthly spend: 30X (5%) on HPCL fuel, grocery and utility, FASTag; 3X on everything else including UPI.
- The "Rs 20,000" figure on Power+ is only the monthly spend needed for the quarterly lounge visit. It does not change earn rates.
- "10X" and "Rs 200 per point" in the 2026 devaluation news apply to other cards (Classic, Select, Wealth, Mayura, Ashva, Family). The CardInsider article lists no Power+ earn change.
- The only "above threshold" effects on Power+ are the per-cycle caps and the 1% fair-usage fees. See section 4.
- So the "above-threshold" column below means "monthly cap already used up or fee limit crossed".

## 3. Rules used (per merchant table depends on these)

| Rule | Value | Source | Confidence |
|---|---|---|---|
| Base earn | 3 RP per Rs 150 = Rs 0.50 per Rs 100 (0.5%). No cap. | Savings Maximiser | high |
| HPCL fuel at authorised HPCL outlets | 30 RP per Rs 150 = Rs 5.00 per Rs 100. Cap Rs 12,000 spend per cycle (2,400 RP = Rs 600). Not on UPI. | Savings Maximiser | high |
| HP Pay App extra | 6 Happy Coins per Rs 100 = Rs 1.50. Cap Rs 10,000 per cycle. Paid in HP Pay, not as card points. | Savings Maximiser | high |
| Grocery and utility | 30 RP per Rs 150 = Rs 5.00 per Rs 100. Cap Rs 2,000 combined spend per cycle (400 RP = Rs 100). Decided by merchant category code (MCC). | Savings Maximiser | high |
| Utility MCCs (bank list) | 4814, 4816, 4899, 4900 | MITC, Nov 2026 | high |
| Grocery MCCs | Not listed by the bank. 5411 (grocery/supermarket) is the usual code but not confirmed. | none | UNVERIFIED |
| Non-HPCL fuel | No rewards. | Savings Maximiser | high |
| Excluded from 3X | Insurance premium, non-HPCL fuel, EMI, ATM cash. HPCL fuel, utility, grocery and FASTag follow their own rules. | Savings Maximiser | high |
| Min transaction for fuel rewards | Rs 150 | Product Guide (2023 text) | high, but dated |
| Fuel surcharge waiver | Not applicable on Power and Power+ | MITC | high |
| Hotels and flights via IDFC FIRST Mobile App "Rewards Gallery" only | 26.67% hotels, 13.33% flights | Official Power+ page | high |

Reward cap with "spends up to your credit limit per billing cycle" also applies (Paisabazaar footnote, same text as the Family guide). Unlikely to matter for one purchase.

## 4. Fees and caps that affect the "above threshold" case (MITC, 17-18 Nov 2026)

- Utility fair-usage fee: 1% of total utility spend if utility spend in a cycle exceeds Rs 20,000. Source: MITC.
- Fuel fee: 1% of total fuel spend if fuel spend in a cycle exceeds Rs 30,000. Source: MITC.
- Rewards beyond the HPCL fuel cap (Rs 12,000): "not applicable" per BankBazaar and CardInsider (two aggregators, medium).
- Rewards beyond the grocery/utility cap (Rs 2,000): UNVERIFIED. The bank text excludes grocery and utility from the 3X pool, so it is probably 0, not 0.5%.
- Rewards beyond the Rs 10,000 HP Pay cap: Happy Coins stop. Card points are unaffected.

## 5. Merchant table

Assumptions: first purchase of the cycle, purchase of Rs 150 or more, paid on the card itself (not UPI), merchant MCC as noted.
"Below" = cap not reached. "Above" = cap or fee limit already reached for that bucket.

| # | Merchant | Bucket and likely MCC | effective_pct BELOW threshold | effective_pct ABOVE threshold | Conditions | Source | Quote (max 20 words) | Confidence |
|---|---|---|---|---|---|---|---|---|
| 1 | Amazon (amazon.in) | Other retail, marketplace MCC (5311/5399/5999 typical) | **0.50** | 0.50 (no cap, no 10X) | 3 RP per Rs 150. Using Amazon Pay or a gift-card load may be excluded (UNVERIFIED). | https://www.idfcfirst.bank.in/content/dam/idfcfirstbank/pdf/cards/Savings-Maximiser-FIRST-Power-plus.pdf | "Applicable structure: 3 Reward points per ₹150 (1 Reward point = ₹0.25)" | high for rule. Merchant MCC UNVERIFIED |
| 2 | Flipkart | Other retail (marketplace MCC) | **0.50** | 0.50 | Same as Amazon. | same PDF | same quote | high for rule. Merchant MCC UNVERIFIED |
| 3 | Swiggy | Other retail, food delivery MCC 5814 | **0.50** | 0.50 | No dining uplift on Power+. Swiggy Instamart grocery orders may code as grocery (UNVERIFIED). BankBazaar lists a Swiggy Rs 150 off on Rs 500 order offer (undated, low). | same PDF | "Other Retail Spends 3X Rewards" | high for rule. Merchant MCC UNVERIFIED |
| 4 | Zomato | Other retail, MCC 5814 | **0.50** | 0.50 | Same as Swiggy. District by Zomato movie offer is a discount, not a reward. | same PDF | same | high for rule. Merchant MCC UNVERIFIED |
| 5 | Barbeque Nation | Restaurant, MCC 5812 | **0.50** | 0.50 | No dining bonus on Power+. The "10X dining" in the Family guide is a different card. | same PDF; Family guide (other card) | "Reward program not applicable on Fuel, EMI transactions & cash withdrawals" (Family guide, NOT Power+) | high for rule. Merchant MCC UNVERIFIED |
| 6 | DMart | Grocery, MCC 5411 likely (in-store) | **5.00** if MCC is grocery, else 0.50 | **UNVERIFIED** (probably 0 to 0.50 after the Rs 2,000 cycle cap) | Cap Rs 2,000 grocery + utility spend per cycle. Rs 100 purchase is well inside it. | Savings Maximiser | "30 Reward points per ₹150 spends on grocery & utility (1 Reward point = ₹0.25)" | high for rule. DMart MCC UNVERIFIED |
| 7 | BigBasket | Grocery, online. MCC UNVERIFIED (5411, 5422, 5499 or 5399) | **5.00** if coded grocery, else 0.50 | **UNVERIFIED** | Online grocers sometimes use a non-grocery MCC. The bank says "No rewards ... if merchant does not belong to utility/grocery category basis the MCC". That is, a wrong MCC can give 0.5% or nothing. | Savings Maximiser | "No rewards will be given in case merchant does not belong to utility/grocery category" | high for rule. Merchant MCC UNVERIFIED |
| 8 | IndianOil | Fuel, non-HPCL, MCC 5541/5542 | **0.00** | 0.00 | Non-HPCL fuel is excluded from every earn tier. No surcharge waiver. Fuel fee 1% above Rs 30,000 per cycle. | Savings Maximiser; MITC | "excluding Insurance premium payments, non-HPCL fuel spends, EMI transactions, ATM cash withdrawals" | high |
| 9 | HP Petrol Pump / HPCL | Fuel, authorised HPCL outlet | **5.00** by card. **6.50** if paid by QR in HP Pay App (5.00 RP + 1.50 Happy Coins) | 0.00 once Rs 12,000 cycle cap is reached (Happy Coins also stop at Rs 10,000) | Outlet must be on HPCL's MID list. Not UPI. Min Rs 150. Happy Coins are not statement credit. For a "statement credit only" demo use 5.00. | Savings Maximiser | "30X = 30 Rewards per ₹150 spends on HPCL fuel (1 Reward point = ₹0.25)" | high (cap-exceeded behaviour: medium) |
| 10 | MakeMyTrip | Travel agency, MCC 4722 | **0.50** direct on card | 0.50 | The 26.67% (hotel) and 13.33% (flight) bonus applies only to bookings made inside the IDFC FIRST Mobile App Rewards Gallery. MakeMyTrip direct is not eligible. | https://www.idfcfirst.bank.in/credit-card/hpcl-power-fuel-credit-card | "Earn bonus reward points on Flight & Hotel bookings done via the 'FIRST Rewards Gallery'" | high for rule. Merchant MCC UNVERIFIED |
| 11 | IndiGo | Airline, MCC 3xxx/4511 | **0.50** direct on card | 0.50 | Same Rewards Gallery limit as MakeMyTrip. Partner in the app unknown (UNVERIFIED). | same page | same | high for rule. Merchant MCC UNVERIFIED |
| 12 | BESCOM | Electricity, utility MCC 4900 | **5.00** | UNVERIFIED after the Rs 2,000 cap. 1% fee on all utility spend above Rs 20,000 per cycle | Direct on BESCOM portal or BBPS. If paid through a third-party app, MCC may differ (UNVERIFIED). | Savings Maximiser; MITC | "Utility 4814, 4816, 4899, 4900" (MITC MCC table) | high for rule. Merchant MCC mapping UNVERIFIED |
| 13 | Airtel (postpaid or broadband bill) | Telecom bill, utility MCC 4814 | **5.00** | UNVERIFIED after the cap. Same 1% fee above Rs 20,000 | Paid on Airtel app or site. | Savings Maximiser; MITC | same MCC table | high for rule. Merchant MCC mapping UNVERIFIED |
| 14 | Jio (recharge) | Telecom, utility MCC 4814 | **5.00** | UNVERIFIED after the cap. Same fee | Recharges through Google Pay, PhonePe or similar apps may not be coded 4814 (UNVERIFIED). | Savings Maximiser; MITC | same | high for rule. Merchant MCC mapping UNVERIFIED |

Conversion check: 30 RP x Rs 0.25 = Rs 7.50 per Rs 150 = Rs 5.00 per Rs 100. 3 RP x Rs 0.25 = Rs 0.75 per Rs 150 = Rs 0.50 per Rs 100.
Cross-check: the Power+ Product Guide savings summary (Rs 24,000 a year on grocery and utility gives Rs 1,200) equals 5%. The official page shows Rs 600 on Rs 24,000 for the base Power card (2.5%).

## 6. Source list

| Source | URL | Date | Use |
|---|---|---|---|
| FIRST Power+ Savings Maximiser (official PDF) | https://www.idfcfirst.bank.in/content/dam/idfcfirstbank/pdf/cards/Savings-Maximiser-FIRST-Power-plus.pdf (old host idfcfirstbank.com redirects here) | PDF modified 28 Aug 2025 | Earn rates, caps, exclusions |
| FIRST Power+ Product Guide (official PDF) | https://www.idfcfirst.bank.in/content/dam/idfcfirstbank/pdf/FIRST-Power-plus-Product-Guide.pdf | 2023 text, file dated Apr 2024 | Min Rs 150 fuel transaction, lounge Rs 20,000 rule |
| Official Power / Power+ page | https://www.idfcfirst.bank.in/credit-card/hpcl-power-fuel-credit-card | Live Nov 2026; carries "Effective 18th June 2026" note | Confirms 6.5%, 5%, 3X, Rewards Gallery travel bonus, Power vs Power+ |
| MITC / Schedule of Charges | https://www.idfcfirst.bank.in/content/dam/idfcfirstbank/pdf/credit-card/MITC-Document-Customer.pdf | PDF 17 to 18 Nov 2026 | Utility and fuel MCCs, 1% fair-usage fees, no fuel surcharge waiver on Power+ |
| Paisabazaar review | https://www.paisabazaar.com/idfc-first-bank/idfc-first-hpcl-power-plus-credit-card/ | Updated 15 Sep 2026 | Second source for caps and 0.25 value |
| CardInsider review | https://cardinsider.com/idfc-first-bank/idfc-hpcl-first-power-plus-credit-card/ | about Sep 2026 | Second source; cap behaviour |
| CardInsider devaluation article | https://cardinsider.com/blog/idfc-first-credit-cards-major-devaluation-mayura-ashva-first-power-impacted/ | 2026 | 2026 changes: Rs 150 to Rs 200 base on Classic/Select/Wealth, no change listed for Power+ |
| BankBazaar | https://www.bankbazaar.com/credit-card/idfc-first-hpcl-power-plus-credit-card.html | undated | Stale, conflicts with official figures. Used only for the fuel-cap statement |
| Family Product Guide (other card) | https://www.idfcfirstbank.com/content/dam/IDFCFirstBank/CreditCards/ProductGuide.pdf | 26 Oct 2026 | NOT Power+. Shows where "10X" and "Rs 200 per point" come from |

## 7. Open items

- Merchant MCCs (Amazon, Flipkart, Swiggy, Zomato, Barbeque Nation, DMart, BigBasket, MakeMyTrip, IndiGo, BESCOM, Airtel, Jio) are inferred, not bank-published. Only the utility MCC list is official.
- Reward value when grocery or utility cap (Rs 2,000) is exhausted: UNVERIFIED.
- Whether any 2026 change touched Power+ earn rates: none found on the official page or in the Nov 2026 MITC. The CardInsider headline names "FIRST Power", but its body lists no Power+ change.
- Rounding of points for purchases that are not multiples of Rs 150: UNVERIFIED.
- The 2023 Product Guide says "1X = 1 Reward per Rs 150". The 2026 Family guide moved other cards to Rs 200. The Power+ 3X base is still "per Rs 150" in the 2025 Savings Maximiser.
- CardInsider says FASTag "now earns only base 1X on all cards". This conflicts with the official Power+ page (5% FASTag). Not in scope for the 14 merchants.
