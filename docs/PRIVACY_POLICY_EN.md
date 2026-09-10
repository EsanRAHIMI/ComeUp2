# ComeUp Privacy Policy

**Last updated:** 10 September 2026 (2026-09-10)

This Privacy Policy explains how **ComeUp** (associated brand: **Najah AI**) collects, uses, stores, and shares personal data when you use the ComeUp web app, API, and iOS (Capacitor) client. A hosted copy may later be published at [https://gym.najahai.com/privacy](https://gym.najahai.com/privacy).

> **Legal note:** This document supports App Store readiness and user transparency. Finalize controller legal entity, registered address, and contact details with counsel before public launch.

---

## 1. Data controller / service identity

| Item | Placeholder until confirmed |
|------|-----------------------------|
| Product | ComeUp |
| Brand / organization | Najah AI |
| Web / API | [https://gym.najahai.com](https://gym.najahai.com) |
| iOS App ID | `com.najahai.comeup` |
| Privacy contact | `privacy@najahai.com` |

In this Policy, “we”, “us”, “ComeUp”, and “Najah AI” refer to the provider of this service.

---

## 2. What ComeUp is — and is not

ComeUp is a **fitness and workout/nutrition tracking** application. It helps you build training programs, log workout sessions, track nutrition goals, and optionally use AI to draft programs or generate plate images from logged meals.

**ComeUp is not a medical device.** Scores, calorie estimates, nutrition targets, and AI suggestions are for **general fitness and informational use only**. They are not a substitute for advice from a physician, dietitian, or other qualified professional. If you have injuries, illness, or special conditions, consult a professional before changing training or diet.

---

## 3. Data we collect

We collect data needed to operate current product features. **We do not run in-app advertising**, and we do not collect data for third-party advertising purposes.

### 3.1 Account and contact information

- Display name  
- Email address  
- Password (stored only as a bcrypt hash; plaintext is never stored)  
- Password-reset tokens (hashed, short-lived)

### 3.2 Fitness profile (user-provided)

If you enter them:

- Age, height, weight, gender  
- Training goal, fitness level, workout days per week  
- Self-reported injuries / physical limitations, available equipment  
- Preferred training weekdays, session duration, missed-workout behavior  
- Target weight, goal deadline, muscle focus  
- Nutrition preference, supplements, water target, walking target (steps / minutes / distance)

### 3.3 Programs and workout sessions

- Your workout programs (exercises, sets, reps, rest, schedule)  
- Sessions: start/end time, completed sets, weights, duration, notes, status  
- Form-score fields exist in the data model; **the current web/Capacitor client does not capture real camera/pose form scores** (typically recorded as `0`)

### 3.4 Body measurements

If you log them: weight, body-fat percentage, chest/waist/hips/arms/thighs circumferences, optional notes.

### 3.5 Nutrition

- Meal plans / nutrition targets and meal slots  
- Meal and weigh-in logs (optional macros, meal status, notes)  
- Daily habits (water, supplements, drinks)  
- **Plate photos** you upload (JPEG/PNG/WebP/GIF, max ~8 MB)  
- **AI-generated plate images** (if you use that feature) and related prompt text  

Photos are served through authenticated API routes, not as public S3 URLs.

### 3.6 AI-related content

- GPT program-building chat history (user and assistant messages)  
- Generated program drafts  
- Weekly GPT message quota counters (current free cap: **5 messages per user per week**)

### 3.7 Exercise media

- Personal override image URLs for exercises (if you set them)  
- Contributions to shared community exercise media (if you use those flows)

### 3.8 App preferences

UI settings such as rest timer and rest countdown sound. Legacy database fields related to voice feedback / form correction / notifications may exist but are **not exposed as active features in the current UI/API**.

### 3.9 Session / technical data

- JWT after sign-in (typically stored in on-device local storage; default expiry about 7 days)  
- Operational server logs for security, debugging, and reliability

### 3.10 What we do not collect (current product)

As implemented today:

- Precise or approximate location as a product feature  
- Device contacts  
- HealthKit / automatic Apple Health sync  
- Advertising data, advertising identifiers, or cross-app ad tracking  
- Barcode scanning or photo→macro estimation (photos are archival; macros come from manual logs)  
- In-app purchase / purchase history (not implemented yet; this Policy will be updated if IAP ships)

---

## 4. Purposes of processing

| Purpose | Examples |
|---------|----------|
| Account & authentication | Register, login, password reset |
| Personalize training & nutrition | Programs, calorie/macro targets, schedules |
| Progress tracking | Sessions, weekly reports, measurements |
| AI features | Program drafts, plate images |
| Security & abuse prevention | Rate limits, password confirmation for account deletion |
| Support & store compliance | Respond to user / Apple requests |

---

## 5. Legal bases (GDPR-style clarity)

Depending on your jurisdiction, processing typically relies on:

- **Contract / service delivery** — account, sync, features you request  
- **Consent** — photo uploads, sending content to AI models, and marketing if ever offered (we do not currently run product marketing email campaigns)  
- **Legitimate interests** — security, fraud prevention, infrastructure reliability, quality with data minimization  
- **Legal obligation** — where required by valid lawful requests  

Self-reported health and fitness data are processed only to provide those fitness features. We do **not** sell them for third-party advertising.

---

## 6. Sharing with processors / service providers

We **do not sell** your personal data. We use infrastructure providers to host and operate the service:

| Provider | Role | Example data |
|----------|------|--------------|
| **MongoDB Atlas** | Primary database | Profile, programs, sessions, nutrition, AI chats, quotas |
| **Amazon Web Services (S3)** | Private nutrition file storage | Plate photos and generated images |
| **OpenAI** (via our internal AI service) | Text/program and image generation | Chat messages and plate-generation prompts; API keys stay server-side |
| **SMTP / email provider** (optional) | Password-reset email | Email, name, reset link |

AI requests are **not** sent from the client directly to OpenAI; they go through our **backend and internal AI service**. Content may be processed under OpenAI’s terms — avoid pasting unnecessary sensitive information into chat.

We may disclose information if required by law or to protect legal rights.

---

## 7. Retention

- Account and content data are kept while your account remains active.  
- After **account deletion**, user-owned records are hard-deleted from the database, and nutrition storage objects are removed on a best-effort basis.  
- Password-reset tokens are short-lived.  
- Server logs may be retained for a limited period for security and troubleshooting.  
- Cloud provider backups may delay complete erasure until their backup cycle ends.

Exact backup retention depends on Atlas/AWS configuration and will be updated here when operational policy is finalized.

---

## 8. Security

Current measures include (no system is perfectly secure):

- bcrypt password hashing  
- JWT sessions; secrets only on servers  
- OpenAI keys only on the AI service  
- Helmet, request rate limiting, restricted CORS  
- Upload MIME allowlist and size caps  
- S3 objects with `Cache-Control: private`, accessed via authenticated API  

You are responsible for keeping your password and device secure.

---

## 9. Account deletion and your rights

### In-app / web

Use **Profile** to request deletion. Confirm by typing `DELETE` and entering your password.

### API

Authenticated request:

`DELETE /api/v1/account`  
Body: `{ "confirm": "DELETE", "password": "<your password>" }`

This removes the account and user-owned data (programs, sessions, nutrition, media, AI conversations, quotas, etc.).

You may also email `privacy@najahai.com` to request access, correction, or deletion. We may verify your identity for security.

Depending on your location, you may have rights to access, rectify, erase, restrict, object, or port data, and to lodge a complaint with a supervisory authority.

---

## 10. Children

ComeUp is not directed at children. The profile model allows ages from 12, but we do not target users under 13 (or the applicable digital age of consent). If you believe a child’s data was collected without appropriate consent, contact us to delete it.

---

## 11. International transfers

Infrastructure (including MongoDB Atlas, AWS, and OpenAI) may process data in countries other than where you live. Using the service means this transfer is necessary to provide it; appropriate contractual safeguards with processors are used where required.

---

## 12. Changes to this Policy

If we make material changes, we will update the “Last updated” date and, where appropriate, notify you in the app or on the website. Continued use after the effective date means you accept the updated Policy, unless applicable law provides otherwise.

---

## 13. Contact

Privacy questions: **privacy@najahai.com**  
Product site: **https://gym.najahai.com**

---

*Persian version: `docs/PRIVACY_POLICY_FA.md`*
