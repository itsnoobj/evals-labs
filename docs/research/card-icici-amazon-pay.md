# ICICI Bank Amazon Pay Credit Card (India): rupees back per Rs 100, by merchant

Researched November 2026. Card is a Visa, lifetime free, issued with Amazon Pay.

## Assumptions

- Cardholder is an Amazon Prime member. Where the card distinguishes Prime from non-Prime, both numbers are shown.
- Reward = Amazon Pay balance. 1 reward point = Rs 1, credited as an Amazon gift card within 2 working days of the billing cycle. It is not cash. Redemption has no fee and no minimum. It can be spent only on Amazon and Amazon Pay purchases. This is the closest thing to a cash-like path.
- First purchase of the month. The official terms state no cap, so cap/threshold conditions below are about fees and exclusions only.
- Rewards are rounded down to the nearest whole point, so Rs 100 at 1% gives exactly 1 point.
- `effective_pct` = rupees back per Rs 100 spent. A fuel surcharge waiver is NOT a reward, so it is listed in conditions and not in `effective_pct`.

## Official sources used (all high confidence)

| Short name | URL | Date shown |
|---|---|---|
| ICICI T&C (rewards clause XXIV) | https://www.icici.bank.in/content/dam/icicibank/india/managed-assets/revamp-page-images/docs/pdf/tc-for-amazon-pay-credit-card.pdf | "Last updated on Oct 12, 2026" |
| ICICI MITC | https://www.icici.bank.in/terms-condition/tnc-for-amazon-pay | "Last updated on July 10, 2026" |
| ICICI FAQ | https://www.icici.bank.in/personal-banking/cards/credit-card/amazon-pay-credit-card/faqs | not shown |
| ICICI card page | https://www.icici.bank.in/personal-banking/cards/credit-card/amazon-pay-credit-card | not shown |

(`www.icicibank.com/...` URLs 301-redirect to `www.icici.bank.in/...`.)

## Results table

| Merchant | Category (MCC risk) | effective_pct (Prime / non-Prime) | Conditions | Source | Supporting quote (<=20 words) | Confidence | Source date |
|---|---|---|---|---|---|---|---|
| Amazon (amazon.in) | Amazon platform | **5 / 3** | Uncapped. Excludes gold coins, EMI purchases, Amazon Business. Digitally fulfilled items (gift cards, e-books, bill pay, recharges, wallet load) earn 2% for everyone. Aggregators say one excluded item in the cart voids cashback on the whole order. Prime expiry drops 5% to 3% immediately. | ICICI T&C cl. 7-9 (above); FAQ (above) | "earn rate of the Reward Points will be 5% of the transaction amount" / "...will be 3% of the transaction amount" | high | Oct 12, 2026 |
| Flipkart | Non-Amazon shopping | **1 / 1** | Base rate. Not an Amazon Pay partner in any source found. Merchant MCC not checked; if Flipkart is coded to an excluded MCC it would be 0%, but no source says so. | ICICI T&C cl. 10 | "1% Reward Points will be offered for all purchases on non-amazon platform" | high | Oct 12, 2026 |
| Swiggy | Food delivery | **1 / 1** direct card. **2 / 2** only if paid via Amazon Pay "Login and Pay" at checkout | 2% needs payment through Amazon Pay at a partner merchant. Swiggy is named as a partner by BankBazaar and Paisabazaar (2024), but I found no official current partner list, so the 2% path is low confidence. Paisabazaar's July 2024 worked example gives Swiggy 1% on this card. | 1%: ICICI T&C cl. 10. 2%: https://www.bankbazaar.com/amazon-credit-card-offers.html | "Amazon Pay ICICI Bank Credit Card at partner merchants like Swiggy, Zomato, Uber, BookMyShow" | 1%: high. 2%: low | 1%: Oct 12, 2026. 2%: undated |
| Zomato | Food delivery | **1 / 1** direct card. 2% path: UNVERIFIED | BankBazaar lists Zomato as a partner but I found no official source. Zomato's Dec 2025 deal with Amazon Pay is about paying with Amazon Pay Balance (earn Zomato Money), which is a different mechanism from card spend. | 1%: ICICI T&C cl. 10. Partner: BankBazaar link above. Zomato deal: https://www.outlookbusiness.com/corporate/zomato-partners-with-amazon-pay-earn-up-to-5-zomato-money-via-wallet | "earn 3% Zomato Money on weekday orders ... when paying via Amazon Pay Balance" | 1%: high. 2%: UNVERIFIED | 1%: Oct 12, 2026 |
| Barbeque Nation | Restaurant | **1 / 1** | Base rate. The ICICI "Culinary Treats" 15% restaurant discount is a discount, not cashback, and is not counted here. | ICICI T&C cl. 10 | "1% Reward Points will be offered for all purchases on non-amazon platform" | high | Oct 12, 2026 |
| DMart | Grocery (MCC 5411) | **1 / 1** | Grocery MCCs are listed in the T&C category table but are not in any exclusion clause. | ICICI T&C cl. 10, 13, 28 | "1% Reward Points will be offered for all purchases on non-amazon platform" | high | Oct 12, 2026 |
| BigBasket | Grocery (MCC 5411/5499) | **1 / 1** direct card. 2% path: UNVERIFIED | Same as DMart. I found no source saying BigBasket is an Amazon Pay partner. | ICICI T&C cl. 10 | "1% Reward Points will be offered for all purchases on non-amazon platform" | high | Oct 12, 2026 |
| IndianOil | Fuel (MCC 5541/5542) | **0 / 0** | No rewards on fuel. Separate 1% fuel surcharge waiver (a refund of the pump surcharge, not a reward). Band per aggregators: transactions Rs 400-4,000, max Rs 400 per cycle (CardMaven, Paisabazaar); the official pages state no band. Fee: 1% of the amount on fuel transactions above Rs 10,000. | ICICI T&C cl. 13; MITC fee schedule | "Transactions for the purchase of fuel ... will not be eligible for Reward Points." | high | Oct 12, 2026 / Jul 10, 2026 |
| HP Petrol Pump / HPCL | Fuel (MCC 5541/5542) | **0 / 0** | Same as IndianOil. | ICICI T&C cl. 13; MITC | "fuel transactions will be eligible for 1% surcharge waiver" | high | Oct 12, 2026 / Jul 10, 2026 |
| MakeMyTrip | Travel agency | **1 / 1** | Base rate. No travel exclusion in the T&C. The MITC "Transportation" category (MCC 4111, 4112, 4784, 4131) only adds a 1% fee above Rs 50,000 and does not obviously cover travel agencies. | ICICI T&C cl. 10; MITC | "1% Reward Points will be offered for all purchases on non-amazon platform" | high (rule). MCC not verified | Oct 12, 2026 |
| IndiGo | Airline | **1 / 1** | Base rate. Airline MCCs are not in any restricted list. Booking the same flight through Amazon.in/Amazon Pay is a different path (see notes). | ICICI T&C cl. 10 | "1% Reward Points will be offered for all purchases on non-amazon platform" | high (rule). MCC not verified | Oct 12, 2026 |
| BESCOM | Electricity bill (utility, MCC 4900) | **0 / 0** direct. **2 / 2** via Amazon Pay | Direct payment is outside the Amazon platform, so no reward. MITC adds a 1% fee on utility payments above Rs 50,000. Whether BESCOM is a biller on Amazon Pay: UNVERIFIED. If BESCOM's gateway codes the payment as Government (MCC 9399) instead of utility, one aggregator says that earns 1%. | ICICI T&C cl. 9, 12, 28; MITC | "utility transactions outside the Amazon platform will not be eligible for any Reward Points" | high | Oct 12, 2026 |
| Airtel (bill) | Telecom (MCC 4812-4815 are in the Utility list) | **0 / 0** direct. **2 / 2** via Amazon Pay | Telecom MCCs 4812, 4813, 4814, 4815 are in the T&C Utility category. Airtel postpaid/DTH/broadband via Amazon Pay is a digitally fulfilled bill payment. | ICICI T&C cl. 9, 12, 28 | "digitally fulfilled categories(E.g. Mobile recharges, Bill Payments, etc.) via Login and Pay with Amazon Pay" | high | Oct 12, 2026 |
| Jio (recharge) | Telecom (utility) | **0 / 0** direct. **2 / 2** via Amazon Pay | Same as Airtel. | ICICI T&C cl. 9, 12, 28 | "utility transactions outside the Amazon platform will not be eligible for any Reward Points" | high | Oct 12, 2026 |

## Does paying through Amazon Pay change anything for BESCOM / Airtel / Jio?

Yes. This is the largest swing on the card.

- Direct to the biller (BESCOM site, Airtel Thanks app, MyJio): **0%**. T&C clause 12 removed rewards on utility transactions outside Amazon, effective 11 Oct 2025.
- Through the Amazon app's bill-pay or recharge flow (card selected as the payment method): **2%**, the same for Prime and non-Prime (T&C clause 9, official FAQ).
- The ICICI FAQ states that bill payments and mobile/DTH recharges earn 2% back "irrespective of the Prime status of the card owner".
- The MITC 1% fee on utility payments applies only above Rs 50,000 per transaction, so it does not affect a normal bill.

## 2025/2026 changes that matter for this table

| Effective | Change | Source |
|---|---|---|
| 11 Oct 2025 | Utility payments outside Amazon: reward removed (was 1%). Education and international transactions: reward removed. Forex markup cut from 3.5% to 1.99%. | ICICI T&C cl. 11-12; GrabOn (12 Jun 2026) for forex date |
| 15 Jan 2026 | New 1% fee on wallet loads of Rs 5,000 or more. New 2% fee on skill-based gaming. New 1% fee on transportation-MCC spends above Rs 50,000. | ICICI MITC fee schedule |
| Sept 2025 | Amazon Pay and ICICI renewed the partnership (7 years per GrabOn). Headline rates 5% / 3% unchanged. | GrabOn; ETEdge |

## Conflicts between sources (official source wins)

1. **Utilities outside Amazon.** CardMaven says "1% cashback on most other eligible transactions, including utility payments". The official T&C clause 12 (updated Oct 12, 2026) says utility outside Amazon earns nothing. BankBazaar, GrabOn and SaveSage agree with the T&C. CardMaven is out of date.
2. **Flights and hotels.** SaveSage says ICICI's January 2026 terms excluded Amazon Pay flight/hotel bookings from the 5%/3% rate. CardMaven says they still earn 5%. The official T&C (cl. 7-8) lists only Gold Coins as excluded and says nothing about flights. Not resolved. This affects only bookings made on Amazon.in, not MakeMyTrip or IndiGo directly.
3. **Wallet load.** The official FAQ says Amazon Pay money loading earns 2%. GrabOn says loads under Rs 5,000 earn 1%. Not needed for the 14 merchants, but it matters if someone tops up Amazon Pay Balance to pay Zomato.
4. **Fuel surcharge band.** CardInsider says transactions up to Rs 4,000. CardMaven and Paisabazaar say Rs 400-4,000 with a Rs 400 per cycle cap. The official MITC states "1% of transaction value on all petrol pumps" and gives no band. Treat the band as medium confidence.

## UNVERIFIED items

- Current Amazon Pay partner list (the 2% "Login and Pay" tier). No official list was reachable, so 2% for Swiggy, Zomato, BigBasket, MakeMyTrip and IndiGo is unconfirmed. Swiggy and Zomato are named by BankBazaar only.
- Actual MCC used by Flipkart, DMart, BigBasket, MakeMyTrip, IndiGo, BESCOM. Results above follow the category rules, not a per-merchant MCC lookup.
- Whether BESCOM is available as a biller in the Amazon Pay app.
- Whether the Amazon-app bill-pay flow is subject to the Rs 50,000 utility fee. The MITC does not say.

## Secondary sources (for the claims not covered by ICICI documents)

- GrabOn review, 12 Jun 2026: https://www.grabon.in/indulge/finance/amazon-pay-icici-credit-card-review/
- SaveSage review, 10 Jul 2026 (updated 3 Sep 2026): https://savesage.club/blogs/amazon-pay-icici-credit-card-review
- BankBazaar card page (undated): https://www.bankbazaar.com/credit-card/amazon-pay-icici-credit-card.html
- CardMaven review 2026: https://cardmaven.in/amazon-pay-icici-bank-credit-card-review/
- CardInsider review: https://cardinsider.com/icici-bank/amazon-pay-icici-bank-credit-card/
- Paisabazaar comparison (July 2024, old): https://www.paisabazaar.com/credit-card/compare-flipkart-axis-bank-credit-card-vs-amazon-pay-icici-bank-credit-card/
- LiveMint, features as of 24 Oct 2026: https://www.livemint.com/money/personal-finance/amazon-pay-icici-bank-credit-card-no-joining-fee-no-annual-charges-cashback-prime-benefits-and-rewards-on-orders-11792831525978.html
