# ComeUp — In-App Purchase & Monetization Plan

**Status:** Implementation started (Phase B+C on `feat/app-store-storekit-iap`)  
**Last updated:** 2026-09-10  
**Related:** App Store prep on Capacitor iOS (`com.najahai.comeup`)

---

## خلاصه فارسی (برای تأیید محصول)

- روی **iOS**، قابلیت‌های دیجیتال و اشتراک داخل اپ باید از مسیر **StoreKit / In-App Purchase** اپل بروند؛ لینک‌دادن یا هدایت کاربر به پرداخت وب برای باز کردن همان قابلیت دیجیتال داخل اپ ممنوع است (قوانین IAP / anti-steering اپل).
- پیشنهاد: لایهٔ **رایگان** قوی + **ComeUp Premium** ماهانه/سالانه.
- رایگان: حساب، لاگ تمرین پایه، برنامه‌های دستی، تغذیهٔ پایه، سهمیهٔ GPT فعلی (**۵ پیام/هفته**).
- Premium (پیشنهادی): سهمیهٔ GPT بالاتر یا نامحدود با استفادهٔ منصفانه، تولید تصویر بشقاب AI، و ظرفیت‌های AI بیشتر — **تبلیغات نداریم، پس «حذف تبلیغ» اختراع نکنید**.
- حذف حساب و لاگ تمرین پایه پشت paywall نروند (Guideline 4.2 / حداقل ارزش کاربردی).
- شناسه‌های پیشنهادی محصول: `comeup_premium_monthly` ، `comeup_premium_yearly`.
- فازها: A اسناد + محصولات App Store Connect → B StoreKit 2 + اعتبارسنجی رسید بک‌اند → C UI paywall.
- قیمت‌ها فقط **مثال** هستند تا ASC پر شود.

---

## 1. Apple rule (digital goods on iOS)

For **digital features and subscriptions unlocked inside the iOS app**, Apple requires **In-App Purchase (StoreKit)**.

**Do:**

- Sell Premium unlock / subscription via StoreKit products.
- Restore purchases.
- Describe subscription terms clearly (length, price, auto-renew, cancel).

**Do not (inside the iOS app):**

- Steer users to an external website/checkout to unlock the **same digital features** available in-app.
- Only offer “pay on web” buttons for digital unlock without IAP where IAP is required.
- Gate account deletion or core logging behind payment in a way that makes the free app a hollow shell (see §6 and App Review 4.2).

Web / PWA outside the App Store binary can use different commercial models; this plan focuses on the **iOS App Store** build.

---

## 2. Recommended products

| Tier | Type | Suggested ASC Product ID | Notes |
|------|------|--------------------------|-------|
| Free | — | — | Default for all accounts |
| ComeUp Premium | Auto-renewable subscription | `comeup_premium_monthly` | Monthly |
| ComeUp Premium | Auto-renewable subscription | `comeup_premium_yearly` | Yearly (better value) |

Optional later (not required for v1):

- `comeup_premium_lifetime` (non-consumable) — only if you accept one-time pricing complexity.
- Consumable “AI credit packs” — only if fair-use unlimited is too costly; prefer subscription first for simplicity.

**Subscription group (ASC):** e.g. `comeup_premium` so monthly/yearly are in one group (user has one active Premium entitlement).

---

## 3. Free vs Premium (map to real features)

Base this on **what ships today**, not invented ads or HealthKit.

### Free (keep usable)

| Area | Free behavior (current / recommended) |
|------|----------------------------------------|
| Account | Register, login, password reset, **account deletion** |
| Programs | Create / edit / import / activate programs manually |
| Sessions | Start workout, log sets, rest timer, sync completed sessions |
| Reports | Weekly / overview / daily reports |
| Measurements | Log body measurements |
| Nutrition | Meal plan, weigh logs, habit logs, **upload plate photos** (archive) |
| AI program chat / quick generate | **5 GPT messages per user per week** (`WEEKLY_GPT_LIMIT = 5`) |
| Exercise media | Use community catalog; personal overrides as today |

### Premium (recommended entitlements)

| Area | Premium behavior |
|------|------------------|
| AI program GPT | Higher weekly cap **or** unlimited with **fair use** (server-enforced). Example targets to decide later: 50/week or unlimited soft-cap. |
| AI plate generation | Included (or generous daily/monthly cap) — today this hits OpenAI Images and is costly |
| Future AI | Room for more models / longer context without changing Free baseline |
| Support | Optional: priority support email — only if you will actually staff it |

**Explicitly not in plan:** “Remove ads” — **the app has no ad SDK / ad placements**.

**Do not invent for paywall copy:** barcode scan, Cal-AI photo macros, live pose scoring, push coaching — those are not shipped.

---

## 4. Entitlement model (later implementation)

Documentation target architecture (Phase B+):

1. **Source of truth for “is Premium?”**  
   - Backend user entitlement fields (e.g. `subscriptionStatus`, `productId`, `expiresAt`, `originalTransactionId`) **or** a small `Subscription` collection.  
   - Client may cache for UI, but **quota and AI routes must check server**.

2. **Receipt / transaction validation**  
   - Prefer **StoreKit 2** (`Transaction` / App Store Server API).  
   - Validate on backend before flipping entitlement.  
   - Handle renew, expire, refund, revoke, grace period.

3. **RevenueCat (optional later)**  
   - Useful if you add Android or want dashboard analytics quickly.  
   - Not required for Phase B if you implement Apple Server API directly.  
   - If used, still keep server-side entitlement for GPT/plate gates.

4. **Web users**  
   - Decide explicitly: Premium iOS-only at first, or mirror entitlement for web after a separate (non-steering) commercial path.  
   - Do not deep-link from iOS paywall to web checkout for the same digital unlock.

---

## 5. App Store Connect setup (Phase A)

1. Agreements, Tax, and Banking active for Paid Apps.  
2. Create subscription group `comeup_premium`.  
3. Create products:
   - `comeup_premium_monthly`
   - `comeup_premium_yearly`
4. Localization: English + Persian (FA) subscription display names/descriptions.  
5. Review screenshot / paywall notes when Phase C UI exists.  
6. Privacy Policy URL (hosted): e.g. `https://gym.najahai.com/privacy` (see `PRIVACY_POLICY_*.md`).  
7. Update App Privacy nutrition labels using `APP_STORE_PRIVACY_ANSWERS.md`.

---

## 6. What NOT to put behind a paywall poorly

Keep these available without Premium (Guideline **4.2** minimum functionality + good practice):

- **Account deletion** (already required for App Store; in-app + `DELETE /api/v1/account`)  
- **Basic workout logging** from an active program  
- **Viewing / editing own programs** created manually  
- **Sign-in / password reset**  
- Core nutrition logging (weigh + habits); Premium can enhance AI plate gen, not lock the whole Nutrition tab  

Paywall should gate **incremental AI capacity / costly generation**, not turn Free into a login screen.

---

## 7. Example pricing only

> **Examples for planning — not final commercial decisions.** Confirm local price tiers in App Store Connect.

| Product ID | Example price (illustrative) |
|------------|------------------------------|
| `comeup_premium_monthly` | e.g. USD 4.99 / month (or local equivalent) |
| `comeup_premium_yearly` | e.g. USD 39.99 / year (~2 months free vs monthly) |

Also prepare:

- Free trial (e.g. 7 days) — optional, decide before ASC submission.  
- Introductory offer — optional.  
- Clear cancel instructions (Settings → Apple ID → Subscriptions).

---

## 8. Phased implementation roadmap

### Phase A — Docs + ASC (this branch)

- [x] Privacy policies FA/EN  
- [x] This monetization plan  
- [x] App Privacy answers checklist  
- [ ] Create ASC subscription products with IDs above  
- [ ] Host privacy URL on `gym.najahai.com`  
- [ ] Fill App Privacy labels from checklist  

### Phase B — StoreKit 2 client + backend verify

- [x] StoreKit 2 product fetch + purchase + restore (`@capgo/native-purchases`, `ui/src/lib/iap.ts`)  
- [x] Backend verify via JWS (`jose`) and/or App Store Server API (`APPLE_IAP_*` env)  
- [x] Persist entitlement; enforce on GPT quota + plate generate routes  
- [ ] Webhook / server notifications for renew & expire (**stub** `POST /api/v1/billing/apple/notifications`)  
- [x] **No** external payment CTA for digital unlock in iOS UI  

### Phase C — Paywall UI

- [x] Paywall UI with en / fa / ar (benefits Free vs Premium)  
- [x] Entry points: GPT quota exhausted, plate generate, Profile upsell  
- [x] Manage subscription via StoreKit / Apple ID settings  
- [ ] Analytics events (optional, privacy-reviewed) — not required for first ship  

### Env / ASC configuration (implementation)

See `backend/.env.example`:

- `APPLE_BUNDLE_ID=com.najahai.comeup`
- `APPLE_IAP_ENVIRONMENT=Sandbox|Production`
- `APPLE_IAP_ISSUER_ID`, `APPLE_IAP_KEY_ID`, `APPLE_IAP_PRIVATE_KEY` (PEM or path — **do not commit real keys**)
- `PREMIUM_GPT_WEEKLY_LIMIT=50`
- Dev only: `APPLE_IAP_DEV_GRANT=1` with `signedTransactionInfo` starting `DEV.` or `{ productId, devGrant: true }`

ASC: subscription group `comeup_premium`, products `comeup_premium_monthly` / `comeup_premium_yearly`. Enable **In-App Purchase** capability in Xcode.

### Explicitly out of scope

- RevenueCat dashboard / forced RC account  
- Play Billing  
- Lifetime product  
- Changing Privacy Policy hosting  

---

## 9. Engineering notes for later (non-binding)

Current free GPT enforcement: `backend/src/services/gptQuota.ts` (`FREE_WEEKLY_GPT_LIMIT = 5`; premium uses `PREMIUM_GPT_WEEKLY_LIMIT`).

Premium should:

- Either raise limit via config keyed by entitlement, or  
- Skip hard fail when `entitlement === premium` and apply fair-use soft limits.

Plate generation already rate-limited per user; Premium may raise that limit separately from GPT chat.

---

## 10. Decision checklist for product owner

1. Monthly vs yearly launch both at once, or monthly only?  
2. Premium GPT: fixed higher cap vs fair-use unlimited?  
3. Is AI plate generation Free-with-small-cap or Premium-only?  
4. Host privacy URL path confirmation (`/privacy`).  
5. Final example → real ASC price points per storefront (IR/US/AE/…).  

---

*Implementation started on `feat/app-store-storekit-iap`. ASN V2 webhook remains TODO.*
