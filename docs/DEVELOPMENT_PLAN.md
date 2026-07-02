# ComeUp — Technical Audit & Phased Implementation Plan

Date: 2026-07-02 · Status: Phase 1 deliverable (no code changed yet)

---

## Part 1 — Technical Audit

### Architecture (confirmed healthy)

- **ui** — React 18 SPA (Vite), custom view-state router (`useRouter`), single `AppProvider` context, PWA served by Nginx. No react-router, no state library. Views: Dashboard, Programs, Workout, History, Nutrition, Profile, Admin, Auth.
- **backend** — Fastify + Zod + Mongoose (Atlas), JWT via `@fastify/jwt` plugin, helmet, CORS, global rate limit (120/min), per-route rate limit on plate generation. All routes under `/api/v1`. AI proxied through `services/aiClient.ts` with `AI_SERVICE_TOKEN` bearer — never exposed to client. Admin gated by `ADMIN_EMAILS` allowlist.
- **ai** — private Fastify service (program generation, nutrition plates, recommendations). OpenAI key lives only here.
- **shared/domain** — currently exports **nutrition types only** (`nutrition.ts`). Workout/program types are duplicated between `ui/src/types.ts` and backend models — a known gap, tolerable.

### Data model inventory

| Model | Key fields | Notes |
|---|---|---|
| User | profile basics, `goal` (4-enum), `preferredDays`, `sessionDuration`, `workoutDaysPerWeek`, `preferences{autoRestTimer, defaultRestSeconds, …}` | **No** targetWeight, goal deadline, walking/water targets, nutrition preference, muscle focus, limitations, missed-workout behavior, or sound preference |
| Program | embedded `exercises[]`, `schedule[]` with **fixed `startsAt` dates**, `isActive`, shareCode | Schedule is pre-expanded by `scheduleBuilder.ts` at creation time |
| WorkoutSession | userId, programId, exercises/sets, `status: active/completed/paused` | **Not linked to a schedule entry** — adherence is inferred by counting |
| NutritionPlan | weekly Persian meal-plan template (slots, protein rotation, rules) | Template/instance pattern with unique partial indexes. **Not macro/goal-based** |
| NutritionWeighLog | date, mealSlot, foodName, grams | Detailed logging exists; no "confirm meal" lightweight path |
| NutritionPlatePhoto / NutritionGeneratedPlate | S3-backed, auth-proxied media | Solid |
| BodyMeasurement | weight, bodyFat, girths, `measuredAt` | This is the weight-trend source |
| GptUsage / AiConversation / ExerciseMedia / CommunityExerciseMedia | quotas, chat, media | Untouched by this plan |

### Existing deterministic logic

- `routes/reports.ts` — weekly stats, 6-week overview, `/reports/daily` (today status, streak, medals, focus session). Logic lives **inline in the route file**; day boundaries use **server-local time** (risk: users are UTC+3:30, server may be UTC).
- `ui/src/lib/sessionEngine.ts` — pure, tested session engine with offline recovery (`runCompletion` never clears local state unless save succeeds). Must be preserved.
- `services/scheduleBuilder.ts` — expands preferred days into dated schedule entries.

### Gaps vs. the product brief

No walking logs, no water/supplement tracking, no meal confirmation states, no nutrition adherence scoring, no missed-workout shift/skip preference, no goal timeline, History is a flat list (no calendar), rest timer vibrates but has **no sound**, Home lacks nutrition/goal/walking cards and profile-completion prompt.

### Tests currently present

`sessionEngine.test.ts` (ui), `exerciseDictionary.test.ts`, `exerciseGifSearch.test.ts` (backend), `nutritionPlateImage.test.ts` (ai). Runner: `node --test` / `tsx --test`.

### Risks to manage

1. **Timezone** — server-local day keys will mislabel "today" for Iranian users on a UTC server. New date-sensitive endpoints must accept a client `date`/`tz` param (the nutrition routes already do this correctly with `date=YYYY-MM-DD`).
2. **Schedule immutability** — shift/skip must be computed as a **derived view** (pure function over schedule + completed sessions + preference + today), never by mutating stored `startsAt` dates. Mutating dates would corrupt shared/imported programs.
3. **NutritionPlan uniqueness indexes** — extend via **new models**, don't reshape the template system.
4. **UI language mix** — Nutrition is Persian/RTL, the rest English/LTR. New Food/Home features should follow the existing convention per view; flag for a future i18n pass.
5. **iOS audio** — rest beep needs a WebAudio context unlocked on a user gesture and must respect the mute switch (WebAudio respects silent mode on iOS when using the default audio session — acceptable behavior).

---

## Part 2 — Implementation Plan

### Guiding rules

- All schema changes are **additive with defaults** — no renames, no drops, no migration scripts needed.
- Deterministic logic goes in **pure, unit-tested service modules** (`backend/src/services/…`), not inline in routes; shared where the UI needs the same rule.
- Every new endpoint keeps the existing auth/rate-limit/Zod patterns.
- Each phase ships independently and leaves production working.

### Phase 2 — Home redesign

- New backend `GET /reports/home?date=YYYY-MM-DD` (or extend `/reports/daily` with a `date` param — decision at implementation: extend, keeping old fields) returning: today-status (completed/pending/rest/shifted), next workout, nutrition summary (next slot + logged state from NutritionWeighLog/meal confirmations), goal snippet, walking snippet, profile-completion hints.
- UI: `DashboardView` becomes card stack — Today card (start/resume/view/rest-day actions, reusing `useActiveSession` logic), Nutrition card, Goal progress card, Walking card (conditional on goal), gentle profile-completion prompt (dismissible, never blocking). Empty state routes to Programs/`ProgramCreateHub`.
- New service `backend/src/services/dayStatus.ts` — pure function `(schedule, completedSessions, missedBehavior, todayKey) → per-entry status` (completed | pending | missed | shifted | rest). Unit tested. This is the single source of truth reused by Home, History calendar, and reports.

### Phase 3 — Profile extensions

- **User schema additions** (all optional, defaulted): `targetWeight`, `goalDeadline`, `muscleFocus[]`, `physicalLimitations[]`, `nutritionPreference`, `supplements[]`, `waterTargetMl`, `walkingTarget { metric: 'steps'|'minutes'|'distanceKm', value }`, `missedWorkoutBehavior: 'shift'|'skip'` (default `'shift'`), `preferences.restCountdownSound` (default `true`).
- Extend `profileUpdateSchema` + `publicUser` + `ProfileEditor` UI (grouped sections, all skippable).
- No DB migration needed — absent fields simply stay unset for existing users.

### Phase 4 — Rest countdown beep

- `ui/src/lib/restSound.ts` — WebAudio oscillator (short soft sine ~880 Hz, ~120 ms, low gain), context created/resumed on the workout-start gesture. Three beeps at T−3/−2/−1 fired from `RestTimer`'s existing 1 s tick; skipped when `preferences.restCountdownSound === false`, when tab is hidden, or when audio is unavailable. Vibration untouched. Settings toggle in Profile.

### Phase 5 — History calendar

- New backend `GET /reports/calendar?month=YYYY-MM&tz=…` combining `dayStatus` output + sessions + nutrition logs/confirmations + walking logs into per-day markers.
- `HistoryView`: month grid with status dots, tap → day detail sheet (workout summary, nutrition status, walking, notes); future days link to program/food detail. Keep the existing session list beneath or inside the detail sheet.
- Extend weekly/monthly reports with adherence + consistency numbers derived from `dayStatus` (not raw counts).

### Phase 6 — Food page (goal-based nutrition)

New models (additive, separate from the existing template NutritionPlan):

- **NutritionTarget** — per-user macro structure: per-slot `{ proteinG, carbsG, fatG?, veg? }` ranges, waterMl, supplements, timing notes; `source: 'rules'|'ai'`, `status: 'proposed'|'accepted'`, editable. Draft generated by deterministic rules (Mifflin-St Jeor + goal adjustment) with optional AI phrasing — AI output schema-validated before save.
- **MealLog** — date, mealSlot, `status: 'done'|'heavier'|'lighter'|'off_plan'|'skipped'`, optional note. Coexists with detailed `NutritionWeighLog`.
- **HabitLog** — date, `waterMl`, `supplementsTaken[]`, optional drinks. One doc per user/day (upsert).

Routes: `/nutrition/target` (GET/POST/PATCH), `/nutrition/meal-logs` (GET/POST/DELETE), `/nutrition/habits` (GET/PUT). Scoring service `nutritionScore.ts` — pure, tested: daily/weekly adherence from confirmations + logs, with confidence labels ("based on confirmations only" vs. gram logs). Never fabricates calories.
UI: Food page gains a Targets tab (accept/edit plan), quick-confirm buttons per slot, water counter, supplement checklist. Existing plan/log/photo tabs untouched.

### Phase 7 — Goal timeline

- **WalkingLog** model — date, minutes, steps?, distanceKm?, note. Routes + quick-log UI (Home card + History detail).
- `services/goalProgress.ts` — pure, tested: inputs = profile goal/targets, BodyMeasurement weight trend (linear fit over recent weigh-ins), workout adherence, nutrition score, walking progress → outputs current/target state, % progress, ETA with `confidence: 'estimated'|'insufficient-data'`, on-track/behind flag. Deterministic only — AI may *explain* the result, never compute it.
- `GET /reports/goal` + Goal card (Home) + trend graphs (History/Reports). All copy labeled "estimated · based on your recent logs".

### Phase 8 — Polish & release

- Typecheck + tests + builds across all 4 packages; verification checklist (login, existing users/programs/sessions/nutrition/admin load, no secrets in bundle — grep dist for key patterns).
- Dokploy checklist: **no new env vars are anticipated in any phase**; additive Mongo indexes created by Mongoose on boot (all sparse/partial-safe); deploy order backend → ui (backend changes are backward-compatible so old UI keeps working during rollout).

### Database change summary (all additive)

| Change | Type | Migration |
|---|---|---|
| User: ~10 new optional fields + 1 preference | extend schema | none — defaults apply |
| NutritionTarget, MealLog, HabitLog, WalkingLog | new collections | none |
| No renames, no drops, no type changes | — | — |

### Test plan

Unit: `dayStatus` (shift vs. skip matrices), `goalProgress` (ETA math, insufficient data), `nutritionScore`, `restSound` gating helper, schedule/date helpers (timezone edges), new route validation. Existing `sessionEngine` tests must keep passing untouched.

### Pre-deploy risk highlights

1. Timezone correctness of "today" — mitigated by client-supplied date params; verify with a UTC+3:30 client against a UTC server.
2. iOS Safari audio unlock — beep must degrade silently; never block the timer.
3. Mongoose index builds on boot for new collections — small, but watch first deploy logs.
4. Old cached PWA bundles calling extended endpoints — all endpoint changes are additive, old bundles keep working; bump SW cache as usual.
