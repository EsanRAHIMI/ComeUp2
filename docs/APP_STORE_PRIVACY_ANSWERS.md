# App Store Connect — App Privacy “Nutrition Labels” Answers

**Last updated:** 2026-09-10  
**App:** ComeUp (`com.najahai.comeup`)  
**Basis:** Current codebase only — do **not** declare collection you do not implement.

Use this checklist when filling **App Store Connect → App Privacy**. Prefer “Data Used to Track You” = **No** (no advertising SDK / no third-party ad tracking observed).

Privacy Policy URLs (when hosted):

- FA: `docs/PRIVACY_POLICY_FA.md` → e.g. `https://gym.najahai.com/privacy`
- EN: `docs/PRIVACY_POLICY_EN.md` (Apple often expects an English policy)

---

## Tracking

| Question | Answer | Notes |
|----------|--------|-------|
| Does this app use data for tracking? | **No** | No AdSupport/ATT ad tracking, no ad network SDKs in repo |
| Privacy Nutrition Labels “Used to Track You” | Leave unchecked for all types | Revisit if analytics/ads added later |

---

## Data collection overview

Declare data that is **collected and linked to identity** (account / userId), even if only stored on your servers.

| Apple category | Collect? | Linked to identity? | Used for tracking? | Product purpose(s) | Actual ComeUp fields / sources |
|----------------|----------|---------------------|--------------------|--------------------|--------------------------------|
| **Contact Info → Name** | Yes | Yes | No | App Functionality | `User.name` |
| **Contact Info → Email Address** | Yes | Yes | No | App Functionality | `User.email`; password-reset email |
| **Contact Info → Phone Number** | **No** | — | — | — | Not in schema |
| **Contact Info → Physical Address** | **No** | — | — | — | Not collected |
| **Health & Fitness → Fitness** | Yes | Yes | No | App Functionality | Goals, fitness level, preferred days, session duration, programs, workout sessions (sets/reps/weights/duration), walking target |
| **Health & Fitness → Health** | Yes (optional user-entered) | Yes | No | App Functionality | Self-reported height/weight/age/gender, injuries/limitations, body measurements (weight, body fat, circumferences), nutrition targets/logs, water/supplements. **Not** HealthKit. **Not** a medical device |
| **Sensitive Info** | Generally **No** as Apple “Sensitive Info” | — | — | — | Do not over-declare; fitness self-report is covered under Health & Fitness. No political/religious/sexual orientation collection |
| **Photos or Videos** | Yes | Yes | No | App Functionality | User-uploaded nutrition plate photos; AI-generated plate PNGs stored for the user |
| **Audio Data** | **No** | — | — | — | No microphone capture feature shipped |
| **User Content → Other User Content** | Yes | Yes | No | App Functionality | Programs, AI chat messages, meal notes/captions, exercise media overrides |
| **Identifiers → User ID** | Yes | Yes | No | App Functionality | MongoDB user `_id` / JWT `sub` |
| **Identifiers → Device ID** | **No** (current) | — | — | — | No dedicated device ID analytics; JWT in localStorage is account session, not a sold device identifier |
| **Purchases** | **No** (until IAP ships) | — | — | — | Update when StoreKit products go live |
| **Usage Data → Product Interaction** | Yes | Yes | No | App Functionality | Workout session activity; `GptUsage` weekly message counts; feature usage necessary to sync |
| **Usage Data → Advertising Data** | **No** | — | — | — | No ads |
| **Diagnostics → Crash Data / Performance** | Optional / **No** unless you add a crash SDK | — | — | — | Server logs exist operationally; if you do **not** feed them into an analytics product linked to the app’s privacy form, keep conservative. If you later add Firebase/Sentry linked to users, update this row |
| **Location** | **No** | — | — | — | Not a product feature |
| **Contacts** | **No** | — | — | — | Not collected |
| **Browsing History** | **No** | — | — | — | N/A |
| **Search History** | **No** (unless you later persist exercise GIF search as personal history) | — | — | — | Admin GIF search is admin tooling |
| **Body** (Apple “Body” under Health if shown) | Prefer declare under **Health & Fitness** as above | Yes | No | App Functionality | Height, weight, measurements |

---

## Third-party / “Data shared with third parties”

Apple distinguishes **shared with third parties** (e.g. for their advertising) vs **used by the developer** via processors.

Recommended posture for current architecture:

| Processor | Role | Label guidance |
|-----------|------|----------------|
| MongoDB Atlas | Primary datastore | Typically **not** “sold”; processing on your behalf — declare collection by you, not third-party advertising share |
| AWS S3 | Private file storage | Same — processor for App Functionality |
| OpenAI (via internal AI service) | LLM + image generation | Content necessary for AI features may be sent to OpenAI as a **service provider**. Do **not** mark as tracking. Ensure Privacy Policy discloses OpenAI. In App Privacy, keep purposes = App Functionality; only mark “shared with third parties” if Apple’s questionnaire treats model providers that way for your setup — when unsure, follow Apple’s latest wording and disclose clearly in the Privacy Policy (already done) |
| SMTP provider | Password reset | Processor; email only |

**We do not sell data.**

---

## Purpose checkboxes (typical for ComeUp)

For collected types above, enable:

- ✅ **App Functionality**  
- ❌ Advertising  
- ❌ Third-Party Advertising  
- ❌ Product Personalization (optional: only if you claim algorithmic personalization beyond “user-configured profile”; current product is mostly user-driven — **App Functionality** is enough)  
- ❌ Other Purposes (avoid unless needed)

---

## Nutrition / camera / Health notes for Review

- Camera / Photo Library: used for **nutrition plate photo upload** (Info.plist usage strings).  
- Not a medical device; no disease diagnosis claims.  
- Form-score / pose / voice preferences are **not** live product features in the current client.  
- Account deletion available in Profile and via `DELETE /api/v1/account`.

---

## When monetization ships

After IAP (see `IAP_MONETIZATION_PLAN.md`):

1. Add **Purchases** history / subscription status if stored linked to the user.  
2. Still **No** tracking if you only use Apple IAP + your backend.  
3. Update Privacy Policy retention/sections for receipts / `originalTransactionId`.

---

## Quick “declare these” list for ASC

1. Name  
2. Email Address  
3. User ID  
4. Fitness  
5. Health (user-entered fitness/nutrition/body metrics — not HealthKit)  
6. Photos or Videos  
7. Other User Content  
8. Product Interaction  

Skip: Location, Contacts, Advertising Data, Phone Number, Purchases (for now), Tracking.

---

*Re-audit this file whenever you add analytics, crash reporting, HealthKit, IAP, or ads.*
