# HDFC Infinia Metal and HDFC Swiggy: rupees back per Rs 100 (research, Nov 2026)

Method: web search and fetch only, no `.env` read. `effective_pct` = rupees back per Rs 100 spent on one purchase, first of the month, below every monthly cap and spend threshold.
Confidence: high = official HDFC page/MITC; medium = two or more agreeing aggregators; low = one aggregator or inference. Never guessed: unknowns are `UNVERIFIED`.

Limits of this research:
- The official Infinia reward-programme T&C PDF (`hdfcbank.com/.../Infinia/RP-Program-TnC.pdf`) and the Swiggy MCC/exclusion list (`hdfcbank.com/content/api/contentstream-id/.../763f32fe-...`) timed out on fetch. Only their search-result snippets were seen. The official Swiggy product page was readable.
- Swiggy "exclusions" for the original card were read from aggregators, not from the official list.

---

## 1. HDFC Infinia Metal

### 1.1 Earn and redemption rules (apply to every row)

| Item | Value | Source | Quote (<=20 words) | Conf. | Date |
|---|---|---|---|---|---|
| Base earn | 5 RP per Rs 150 = 3.333 RP per Rs 100. Spend under Rs 150 residual earns nothing. | https://cardinsider.com/hdfc-bank/hdfc-bank-infinia-credit-card/ ; https://m.economictimes.com/wealth/spend/hdfc-bank-to-revise-reward-point-criteria-for-this-credit-card-from-february-1-2026-check-apple-tanishq-flight-booking-deals-and-more/articleshow/127793864.cms | "you earn 5 Reward Points for every ₹150 spent using this card." | medium | Jun 30 2026 (CardInsider); Jan 30 2026 (ET) |
| Redemption (a) statement credit / cashback | 1 RP = Rs 0.30. So base = 3.333 x 0.30 = **1.00%**. Cap 50,000 RP/month against statement balance (ET). | https://cardinsider.com/hdfc-bank/hdfc-bank-infinia-credit-card/ ; https://economictimes.indiatimes.com/wealth/spend/hdfc-bank-to-revise-reward-point-criteria-for-this-credit-card-from-february-1-2026-check-apple-tanishq-flight-booking-deals-and-more/articleshow/127793864.cms?from=mdr | "However, the redemption rate is lower (1 RP = ₹0.30) in this case." | medium (ET attributes to HDFC website) | Jun 30 2026; Jan 30 2026 |
| Redemption (b) best path | 1 RP = Rs 1 for SmartBuy flights/hotels, Apple/Tanishq, and 1 RP = 1 airmile. Base = **3.33%**. Caveat (CardInsider only): RPs may pay at most 70% of a flight/hotel bill. Flight/hotel redemption cap 1,50,000 RP/month. | https://cardinsider.com/hdfc-bank/hdfc-bank-infinia-credit-card/ ; https://www.paisabazaar.com/hdfc-bank/infinia-credit-card | "The value of 1 Reward Point for redemption against the flight booking is ₹1." | medium | Jun 30 2026; Paisabazaar updated Oct 30 2026 |
| Products/vouchers via SmartBuy or netbanking | 1 RP = Rs 0.50 (not used as the best path below). | https://www.paisabazaar.com/hdfc-bank/infinia-credit-card | "1 RP = Rs. 0.50 for vouchers and product purchase on SmartBuy" | medium | Oct 30 2026 |
| SmartBuy brand vouchers (GyFTR/Woohoo) | 5X = 25 RP per Rs 150 = 16.667 RP per Rs 100. Bonus capped at 3,000 RP/month (about Rs 22,500 of vouchers), inside an overall 15,000 RP/month SmartBuy cap. New since **1 Jul 2026**. | https://www.business-standard.com/finance/personal-finance/hdfc-bank-changes-smartbuy-rewards-rules-caps-benefits-rules-explained-126070100563_1.html ; https://magnify.club/guides/hdfc-smartbuy-gift-voucher-points-cap/ | "Overall monthly cap of 15,000 reward points, with only 3,000 points allowed from brand vouchers." | medium (3 outlets agree; official SmartBuy T&C not fetched) | Jul 1 2026 |
| SmartBuy hotels (MakeMyTrip, Cleartrip) | 10X = 50 RP per Rs 150 = 33.33 RP per Rs 100. | https://cardinsider.com/blog/hdfc-bank-smartbuy-rewards-program-offers/ | "Hotels (MakeMyTrip & Cleartrip) 10x RPs" (table row, Infinia column) | medium | Oct 29 2026 ("November 2026" edition) |
| SmartBuy flights | 5X via Cleartrip, Goibibo, Yatra, EaseMyTrip (not MakeMyTrip). Trains (ConfirmTkt/MMT) 3X. MMT holiday packages 5X. | https://cardinsider.com/blog/hdfc-bank-smartbuy-rewards-program-offers/ | "Flights – Via Cleartrip, Goibibo, Yatra, and EaseMyTrip" | medium | Oct 29 2026 |
| Exclusions (no RP) | Fuel, rent, property management, government, EasyEMI, e-wallet reloads. | https://cardinsider.com/hdfc-bank/hdfc-bank-infinia-credit-card/ ; https://1finance.co.in/blog/hdfc-infinia-credit-card-benefits/ | "Transactions such as fuel, rent, property management, government spending, EasyEMI, and e-wallet reloading will not be eligible for RPs." | medium | Jun 30 2026 |
| Utilities cap | Utility MCC 4900: 2,000 RP/month cap (about Rs 60,000 of spend). Still earns. | https://v.hdfc.bank.in/htdocs/common/sms-communication-sept.html | "Reward Points earned on Utility transactions will be capped at 2000 Reward Points per calendar month." | **high** | Sep 2024 notice; Paisabazaar (Oct 30 2026) still lists utilities as earning |
| Telecom and cable cap | MCC 4812, 4814, 4899: 2,000 RP/month cap. Still earns. | https://v.hdfc.bank.in/htdocs/common/sms-communication-sept.html | "Reward Points earned on Telecom & Cable transactions will be capped at 2000 Reward Points per calendar month." | **high** | Sep 2024 |
| Grocery cap | 2,000 RP/month (about Rs 60,000). | https://www.hdfcbank.com/content/bbp/repositories/723fb80a-2dde-42a3-9793-7ae1be57c87f/?path=/Personal/Pay/Cards/Credit%20Card/Credit%20Card%20Landing%20Page/Credit%20Cards/Super%20Premium/Infinia/RP-Program-TnC.pdf (search snippet only; PDF timed out) | "Reward points earned on grocery transaction will be capped at 2000 RP per calendar month." | high (snippet of official PDF) | undated |
| Insurance cap | 10,000 RP/month (single aggregator). | https://cardinsider.com/hdfc-bank/hdfc-bank-infinia-credit-card/ | "Reward Points for insurance transactions are capped at 10,000 per month." | low | Jun 30 2026 |
| Fuel surcharge waiver (not a reward) | 1% surcharge waived on Rs 400 to Rs 1,00,000, max Rs 1,000/month. No RP on fuel. | https://cardinsider.com/hdfc-bank/hdfc-bank-infinia-credit-card/ | "Do note that no RPs can be earned for any purchases at fuel stations." | medium | Jun 30 2026 |

2025/2026 changes to note:
- 16 Jan 2026: planned cut of voucher 5X to 3X was reversed (Moneycontrol: "Infinia cardholders will continue to earn 5X reward points on voucher purchases").
- 1 Feb 2026: max 5 redemptions/month. ET quotes HDFC site: "can be redeemed up to a maximum of five times per month."
- 1 Apr 2026: card retention needs Rs 18 lakh annual spend or Rs 50 lakh relationship value (CardInsider, medium).
- 1 Jul 2026: brand-voucher bonus cap of 3,000 RP/month (above).
- Paisabazaar flags another "Major Update on HDFC Infinia from Next Financial Year". Not opened. UNVERIFIED what it contains.

### 1.2 Merchant table

Columns `cashback %` and `best %` use the two redemption paths. "Direct" = tap the card at the merchant. Best path numbers assume RPs redeemed at Rs 1 each (SmartBuy flights/hotels or airmiles). Voucher rows ignore any GyFTR/Woohoo discount on the voucher price (extra, varies by brand).

| # | Merchant (category) | Earn route | cashback % (Rs 0.30/RP) | best % (Rs 1/RP) | Conditions | Source | Quote | Conf. |
|---|---|---|---|---|---|---|---|---|
| 1 | Amazon (online shopping) | Direct | 1.00 | 3.33 | Base earn. | CardInsider Infinia page (above) | "you earn 5 Reward Points for every ₹150 spent using this card." | medium |
| 1 | Amazon | Best: SmartBuy brand voucher 5X | 5.00 | 16.67 | Bonus cap 3,000 RP/month. Buy voucher, spend voucher later. Brand named in https://cardinsider.com/blog/hdfc-bank-smartbuy-rewards-program-offers/ | CardInsider SmartBuy page | "5X Brand Vouchers (Amazon Pay, Flipkart, Myntra, etc.)" | medium |
| 2 | Flipkart (online shopping) | Direct | 1.00 | 3.33 | Base earn. | as above | as above | medium |
| 2 | Flipkart | Best: SmartBuy voucher 5X | 5.00 | 16.67 | Same cap as row 1. | CardInsider SmartBuy page | "5X Brand Vouchers (Amazon Pay, Flipkart, Myntra, etc.)" | medium |
| 3 | Swiggy app (food delivery) | Direct | 1.00 | 3.33 | Base earn. | as above | as above | medium |
| 3 | Swiggy | Best: SmartBuy voucher 5X | 5.00 | 16.67 | Swiggy vouchers named by LiveFromALounge; per-brand 5X list not seen. | https://livefromalounge.com/hdfc-bank-credit-cards-devalues-smartbuy-gift-vouchers-accelerated-rewards-with-new-monthly-cap-effective-today/ | "purchasing vouchers for Amazon, Flipkart, Swiggy, Zomato, BigBasket, Blinkit and hundreds of other merchants" | low |
| 4 | Zomato (food delivery) | Direct | 1.00 | 3.33 | Base earn. | as above | as above | medium |
| 4 | Zomato | Best: SmartBuy voucher 5X | 5.00 | 16.67 | Zomato voucher named in LiveFromALounge (above) and GyFTR (https://www.gyftr.com/instantvouchers/blog/hdfc-smartbuy-infinia/: "Amazon, Hmaleys, Zomato, Blinkit, and more"). | LiveFromALounge | as row 3 | low |
| 5 | Barbeque Nation (dining) | Direct | 1.00 | 3.33 | Base earn. Swiggy Dineout offers are discounts, not points. | as above | as above | medium |
| 5 | Barbeque Nation | Best: SmartBuy voucher 5X | 5.00 | 16.67 | Voucher exists on GyFTR Instant Vouchers (SmartBuy's voucher partner). That this brand earns 5X is **UNVERIFIED**. | https://www.gyftr.com/instantvouchers/barbeque-nation-gift-vouchers | "Barbeque Nation Gift Vouchers" (listing: "Flat 5% Off") | low |
| 6 | DMart (groceries) | Direct | 1.00 | 3.33 | Grocery MCC, 2,000 RP/month cap. | HDFC RP T&C PDF snippet | "Reward points earned on grocery transaction will be capped at 2000 RP per calendar month." | high (cap); medium (rate) |
| 6 | DMart | Best | UNVERIFIED | UNVERIFIED | No DMart voucher found on SmartBuy/GyFTR. | none | none | n/a |
| 7 | BigBasket (groceries) | Direct | 1.00 | 3.33 | Grocery cap 2,000 RP/month. | HDFC RP T&C PDF snippet | as row 6 | high (cap); medium (rate) |
| 7 | BigBasket | Best: SmartBuy voucher 5X | 5.00 | 16.67 | Voucher named by LiveFromALounge only. | LiveFromALounge | as row 3 | low |
| 8 | IndianOil (fuel) | Direct | **0** | **0** | Fuel excluded from RP. 1% surcharge waiver is separate (max Rs 1,000/month), not a reward. | https://cardinsider.com/hdfc-bank/hdfc-bank-infinia-credit-card/ | "Do note that no RPs can be earned for any purchases at fuel stations." | medium |
| 8 | IndianOil | Best | UNVERIFIED | UNVERIFIED | IOCL gift card exists on GyFTR (https://www.gyftr.com/iocl). Whether a SmartBuy fuel/wallet-type voucher earns 5X RP is **UNVERIFIED**. | none | none | n/a |
| 9 | HP Petrol Pump / HPCL (fuel) | Direct | **0** | **0** | Same as row 8. | same | same | medium |
| 9 | HPCL | Best | UNVERIFIED | UNVERIFIED | "HP Pay" gift card exists on GyFTR (https://www.gyftr.com/hppay) and loads a wallet. RP eligibility **UNVERIFIED**. Wallet loads are excluded on the card. | none | none | n/a |
| 10 | MakeMyTrip (travel) | Direct | 1.00 | 3.33 | Base earn. | CardInsider Infinia page | as row 1 | medium |
| 10 | MakeMyTrip | Best: SmartBuy **hotels** via MMT, 10X | 10.00 | 33.33 | Hotels only. MMT flights are not on SmartBuy flights (partners: Cleartrip, Goibibo, Yatra, EaseMyTrip). Trains 3X = 3.00 / 10.00. Holiday packages 5X = 5.00 / 16.67. Bonus inside 15,000 RP/month cap. | https://cardinsider.com/blog/hdfc-bank-smartbuy-rewards-program-offers/ | "Hotels (MakeMyTrip & Cleartrip) 10x RPs" | medium |
| 11 | IndiGo (airline) | Direct | 1.00 | 3.33 | Base earn. | CardInsider Infinia page | as row 1 | medium |
| 11 | IndiGo | Best: SmartBuy flights 5X (via Cleartrip/Goibibo/Yatra/EaseMyTrip) | 5.00 | 16.67 | Assumes the IndiGo fare is sold by those partners. Not checked per airline. | CardInsider SmartBuy page | "Flights 5x RPs" (table row) | low |
| 12 | BESCOM (electricity bill) | Direct (MCC 4900 utility) | 1.00 | 3.33 | Earns. Cap 2,000 RP/month. Third-party bill-pay apps may use other MCCs. UNVERIFIED which channel BESCOM uses. | https://v.hdfc.bank.in/htdocs/common/sms-communication-sept.html ; https://www.paisabazaar.com/hdfc-bank/infinia-credit-card | "5 Reward Points per Rs. 150 spent across all retail categories including insurance, utilities and education" | high (cap) / medium (earns) |
| 13 | Airtel (telecom bill) | Direct (MCC 4812/4814/4899) | 1.00 | 3.33 | Cap 2,000 RP/month. | https://v.hdfc.bank.in/htdocs/common/sms-communication-sept.html | "Reward Points earned on Telecom & Cable transactions will be capped at 2000 Reward Points per calendar month." | high (cap) |
| 14 | Jio (telecom recharge) | Direct | 1.00 | 3.33 | Same as row 13. | same | same | high (cap) |

For rows 12 to 14 there is no accelerated route found. Best % equals the 3.33 base at Rs 1/RP.

---

## 2. HDFC Swiggy Credit Card (original card; Ornge/BLCK differences noted)

### 2.1 Rules (apply to every row)

| Item | Value | Source | Quote (<=20 words) | Conf. | Date |
|---|---|---|---|---|---|
| Tiers | 10% Swiggy app; 5% "online MCCs"; 1% other. | https://v.hdfc.bank.in/htdocs/amp/personal/pay/cards/credit-cards/swiggy-hdfc-bank-credit-card.html | "10% Cashback on Swiggy application (Food ordering, Instamart, Dineout & Genie)." | **high** | undated |
| 5% scope | Only selected merchants mapped to listed MCCs. | https://www.hdfcbank.com/content/api/contentstream-id/723fb80a-2dde-42a3-9793-7ae1be57c87f/763f32fe-e68c-4738-88dd-e785d57db5ec (snippet only) | "only selected merchants mapped under the above list of MCCs are eligible for 5% Cashback Category." | high | undated |
| 5% categories | Apparel, electronics, entertainment, home decor, department store, personal care, medical store, local cabs, pet stores, discount stores. Gift cards and grocery do not earn 5%. | https://cardinsider.com/hdfc-bank/swiggy-hdfc-bank-credit-card/ | "5% cashback does not apply to gift cards and grocery purchases." | medium | CardInsider, page updated May 2026 |
| 5% named brands | Amazon, Flipkart, Myntra, Nykaa, Ajio, BookMyShow, Meesho, Uber, Ola. Zomato **is not named**. | https://www.grabon.in/indulge/finance/swiggy-hdfc-credit-card-review/ | "major e-commerce platforms such as Amazon, Flipkart, Myntra, Nykaa, Ajio, BookMyShow, and Meesho." | medium | May 28 2026 |
| Same brands, HDFC customer notice for the replacement cards | Ornge/BLCK: "select online brands such as Amazon, Flipkart, Nykaa and Myntra". | https://www.moneycontrol.com/news/business/personal-finance/hdfc-bank-to-phase-out-existing-swiggy-credit-card-what-changes-for-cardholders-14016691.html | "5 percent cashback on select online brands such as Amazon, Flipkart, Nykaa and Myntra" | medium | ~Aug 20 2026 |
| Caps | 10%: Rs 1,500/cycle. 5%: Rs 1,500/cycle. 1%: Rs 500/cycle (original). Ornge/BLCK 1% cap is Rs 1,000/cycle. | https://www.bankbazaar.com/credit-card/swiggy-hdfc-bank-credit-card.html ; https://tradebrains.in/money/swiggy-hdfc-bank-credit-card-to-be-phased-out-check-best-alternative-options-fees-and-cashback-benefits-12446867 | "1% cashback on other categories, up to Rs.500 per billing cycle" | medium | Nov 6 2026; Aug 28 2026 |
| Minimum transaction | 10% Swiggy: Rs 249 per transaction **from 17 Apr 2026** (was Rs 100). 5% and 1%: Rs 100. | https://cardinsider.com/blog/swiggy-hdfc-credit-card-update/ ; https://v.hdfc.bank.in/htdocs/amp/personal/pay/cards/credit-cards/swiggy-hdfc-bank-credit-card.html | "each transaction must be ₹249 or more." | medium (Rs 249); high (Rs 100 floor, official) | Mar 17 2026 |
| Swiggy exclusions | Swiggy Money wallet, Swiggy Minis, Swiggy Liquor. | official page above | "Cashback cannot be earned on transactions made using Swiggy Money Wallet, Swiggy Minis & Swiggy Liquor" | **high** | undated |
| 1% exclusions (original, aggregator-derived) | Rent, fuel, jewellery, wallet loads, government, EMI (all types), cash advances, forex. | https://www.bankbazaar.com/credit-card/swiggy-hdfc-bank-credit-card.html | "Cashback is not earned on rent, fuel, jewellery, wallet loads, government-related transactions, EMI transactions of all types" | medium | Nov 6 2026 |
| Utilities / insurance (conflict) | CardExpert (2025) and NewsBytes (Mar 2026) list utilities and insurance as excluded from 1%. BankBazaar, Paisabazaar footnote and the BLCK exclusion list do not name them. | https://www.cardexpert.in/hdfc-swiggy-credit-card-review/ ; https://www.newsbytesapp.com/news/business/swiggy-and-hdfc-bank-launch-blck-ornge-credit-cards/tldr | "excludes rent, utilities, fuel, insurance, EMIs, jewelry, government spends, wallet loads, and similar" | low (conflicting) | Feb 2025; Mar 12 2026 |
| Flights/hotels (original) | Excluded from 5% per CardExpert (2025). Cleartrip flights/hotels got a separate 5% (cap Rs 1,500/cycle) from Apr 2026. | https://www.cardexpert.in/hdfc-swiggy-credit-card-review/ ; https://cardinsider.com/blog/swiggy-hdfc-credit-card-update/ | "From 5% cashback: Flight, hotel bookings, etc" | low | Feb 2025; Mar 17 2026 |
| How cashback is paid (conflict) | Official HDFC page text still says Swiggy Money, redeemable only in the Swiggy app. Four aggregators say statement credit since 21 Jun 2024, adjusted in the same cycle since 17 Apr 2026. The rows below use **statement credit**, so Re 1 cashback = Re 1. If Swiggy Money applies, value is the same face amount but usable only on Swiggy food/Instamart/Dineout/Genie and expires after 1 year. | official page; https://www.grabon.in/indulge/finance/swiggy-hdfc-credit-card-review/ ; https://cardinsider.com/blog/swiggy-hdfc-credit-card-update/ | Official: "Cashback will be redeemable only on Swiggy Application as Swiggy Money." GrabOn: "Prior to June 2024, cashback was credited as Swiggy Money within the Swiggy app." | medium (statement credit) | May 28 2026 / Mar 17 2026 |

**Phase-out (biggest 2026 change).** Moneycontrol, ~20 Aug 2026: "HDFC Bank is now phasing out its existing Swiggy HDFC Bank Credit Card". Holders are moved to Ornge (5% Swiggy, 1-year Swiggy One, lifetime free for migrated holders) or BLCK (10% Swiggy, Rs 1,000 fee). Default is Ornge after a 30-day notice. New card number. This reverses the Mar 2026 CardInsider report that the card "will not be migrated". Non-Swiggy rows below are the same on all three variants. Only the Swiggy-app row changes (10% original/BLCK, 5% Ornge). Ornge Swiggy and online 5% tiers: Rs 1,500 cap each per Tradebrains (Desidime says a shared cap, so conflicting; not resolved).

### 2.2 Merchant table (statement credit; no points)

| # | Merchant (category) | effective_pct | Conditions | Source | Quote | Conf. | Date |
|---|---|---|---|---|---|---|---|
| 1 | Amazon (online) | **5** | Applies if Amazon's MCC maps to a listed category. Amazon gift-card purchases may fall outside (CardExpert: "It depends"). Rs 1,500/cycle cap, min Rs 100. | https://www.grabon.in/indulge/finance/swiggy-hdfc-credit-card-review/ | "major e-commerce platforms such as Amazon, Flipkart, Myntra, Nykaa, Ajio, BookMyShow, and Meesho." | medium | May 28 2026 |
| 2 | Flipkart (online) | **5** | Same as row 1. | same | same | medium | May 28 2026 |
| 3 | Swiggy app (food delivery) | **10** | Rs 249 min per order. Rs 1,500/cycle cap (about Rs 15,000 spend). Not on Swiggy Money wallet, Minis, Liquor. Ornge variant: 5. | official page + https://cardinsider.com/blog/swiggy-hdfc-credit-card-update/ | "10% Cashback on Swiggy application (Food ordering, Instamart, Dineout & Genie)." | **high** | undated / Mar 17 2026 |
| 4 | Zomato (food delivery) | **UNVERIFIED** (not named in any 5% list; if it is not in a 5% MCC it earns 1) | Zomato appears only on the Millennia 5% list. No source puts it on the Swiggy card list. | https://cardinsider.com/hdfc-bank/swiggy-hdfc-bank-credit-card/ | no supporting quote found | n/a | n/a |
| 5 | Barbeque Nation (restaurant, dining) | **1** | Restaurants are not in the 5% category list. Not in the exclusion lists. Rs 100 min, 1% cap Rs 500/cycle. Dineout (Swiggy app) is the 10% case, not a direct restaurant swipe. | https://cardinsider.com/hdfc-bank/swiggy-hdfc-bank-credit-card/ | "1% cashback on all other eligible categories, with the maximum benefit capped at ₹500 per billing cycle." | low (inferred from category rules) | May 2026 |
| 6 | DMart (groceries) | **1** | Grocery is outside 5%. Not excluded. Cap Rs 500/cycle. | https://cardinsider.com/hdfc-bank/swiggy-hdfc-bank-credit-card/ | "5% cashback does not apply to gift cards and grocery purchases." | medium | May 2026 |
| 7 | BigBasket (groceries) | **1** | Same as row 6. Instamart (Swiggy) is the 10% grocery case, not BigBasket. | same | same | medium | May 2026 |
| 8 | IndianOil (fuel) | **0** | Fuel excluded. No fuel surcharge waiver on this card either. | https://www.bankbazaar.com/credit-card/swiggy-hdfc-bank-credit-card.html ; https://www.grabon.in/indulge/finance/swiggy-hdfc-credit-card-review/ | "Cashback is not earned on rent, fuel, jewellery, wallet loads" | medium | Nov 6 2026 |
| 9 | HP Petrol Pump / HPCL (fuel) | **0** | Same as row 8. | same | same | medium | Nov 6 2026 |
| 10 | MakeMyTrip (travel) | **UNVERIFIED** (likely 1 on the original card; 5 possible on Ornge/BLCK) | Original: travel excluded from 5% per CardExpert (2025). Ornge/BLCK 5% list names "Travel & Hotel" and Cleartrip, Ixigo, Yatra, EaseMyTrip, Goibibo, Paytm Travel, but not MakeMyTrip. | https://www.paisabazaar.com/hdfc-bank/swiggy-blck-hdfc-credit-card/ | "Travel & Hotel" (BLCK footnote) | n/a | Mar 10 2026 |
| 11 | IndiGo (airline) | **1** | Original: flights excluded from 5%. Airlines not named as excluded from 1%. IndiGo BluChips (1 per Rs 250) is for Swiggy-app spend only. | https://www.cardexpert.in/hdfc-swiggy-credit-card-review/ | "From 5% cashback: Flight, hotel bookings, etc" | low | Feb 2025 |
| 12 | BESCOM (electricity bill) | **UNVERIFIED** (0 per two aggregators; official list not seen) | Utilities named as excluded by CardExpert and NewsBytes. Official-derived exclusion lists (BLCK footnote) do not name utilities. HDFC's Sep 2024 notice says Swiggy cards keep "capping as per the product feature". | https://www.newsbytesapp.com/news/business/swiggy-and-hdfc-bank-launch-blck-ornge-credit-cards/tldr | "excludes rent, utilities, fuel, insurance, EMIs, jewelry, government spends, wallet loads, and similar" | low | Mar 12 2026 |
| 13 | Airtel (telecom bill) | **UNVERIFIED** (0 or 1) | No source says whether telecom counts as "utilities". HDFC treats Utility (MCC 4900) and Telecom (4812/4814/4899) as separate categories. | https://v.hdfc.bank.in/htdocs/common/sms-communication-sept.html | "Telecom & Cable 4812, 4814, 4899" (separate from Utility 4900) | n/a | Sep 2024 |
| 14 | Jio (telecom recharge) | **UNVERIFIED** (0 or 1) | Same as row 13. | same | same | n/a | n/a |

---

## 3. Answers to the specific questions

- Infinia, points per Rs 150: 5 RP. No cap on base earn. Accelerated SmartBuy earn capped at 15,000 RP/month overall, 3,000 RP/month of that from brand vouchers (since 1 Jul 2026).
- Infinia exclusions: fuel, rent, property management, government, EasyEMI, wallet reloads. Utilities, telecom, grocery earn but are capped at 2,000 RP/month each. Insurance reported capped at 10,000 RP/month (low confidence).
- Infinia point value: Rs 0.30 statement credit, Rs 0.50 products/vouchers, Rs 1 flights/hotels/Apple/Tanishq/airmile.
- Swiggy 10%: Swiggy app (food, Instamart, Dineout, Genie), Rs 249 minimum order, Rs 1,500/cycle cap.
- Swiggy 5% list: Amazon and Flipkart yes. Zomato not named anywhere for this card. Dining and groceries get 1% only.
- Swiggy caps: 10% Rs 1,500; 5% Rs 1,500; 1% Rs 500 (Rs 1,000 on Ornge/BLCK), each per billing cycle.
