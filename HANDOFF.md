# ComeUp — Production Handoff

This release adds GPT‑powered personalized programs, a full profile editor, inline
program editing, body measurements, weekly reporting, an improved coach‑plan parser,
a mobile‑first PWA frontend, and crash‑safe workout session tracking.

**Status:** backend, AI service, and UI all type‑check clean; ESLint passes with 0 errors;
14 unit tests pass (8 session engine, 6 exercise classifier). Not yet built/deployed —
run the local steps below first.

---

## 1. Changed / added files

### Frontend (`ui/`)
**New**
- `src/lib/` — `format.ts`, `exerciseImages.ts`, `storage.ts`, `sessionEngine.ts`, `sessionStore.ts`, `sessionSync.ts`, `sessionEngine.test.ts`
- `src/api/` — `client.ts`, `index.ts`
- `src/hooks/` — `useRouter.tsx`, `useTheme.tsx`, `useApp.ts`, `useWorkoutSession.ts`, `useActiveSession.ts`
- `src/store/AppProvider.tsx`
- `src/components/` — `BottomNav.tsx`, `AppHeader.tsx`, `Toast.tsx`, `EmptyState.tsx`, `ExerciseImage.tsx`, `RestTimer.tsx`, `ProgramCard.tsx`, `ProgramDetail.tsx`, `CoachPlanImporter.tsx`, `GenerateForm.tsx`, `ResumeBanner.tsx`, `GptBuilder.tsx`, `ProgramDays.tsx`, `ProfileEditor.tsx`, `ProgramEditor.tsx`, `MeasurementsPanel.tsx`
- `src/views/` — `AuthView.tsx`, `DashboardView.tsx`, `ProgramsView.tsx`, `WorkoutView.tsx`, `HistoryView.tsx`, `ProfileView.tsx`
- `public/` — `manifest.webmanifest`, `sw.js`, `icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`

**Modified**
- `src/App.tsx`, `src/main.tsx`, `src/types.ts`, `src/styles.css`
- `index.html` (PWA tags, fonts), `Dockerfile` (VITE_API_URL build arg), `package.json` (test script), `tsconfig.app.json` (exclude tests)

### Backend (`backend/`)
**New**
- `src/models/GptUsage.ts`, `AiConversation.ts`, `BodyMeasurement.ts`
- `src/services/exerciseDictionary.ts` (+ `.test.ts`), `gptQuota.ts`, `scheduleBuilder.ts`, `programNormalizer.ts`, `aiClient.ts`
- `src/routes/programChat.ts`, `reports.ts`, `measurements.ts`
- `src/utils/publicUser.ts`

**Modified**
- `src/models/User.ts` (gender, injuries, availableEquipment, preferredDays, sessionDuration)
- `src/routes/auth.ts`, `profile.ts`, `programs.ts` (preview/duplicate), `app.ts` (route registration)
- `src/services/coachPlanParser.ts` (dictionary + review flags)
- `package.json` (test script), `tsconfig.json` (exclude tests)

### AI service (`ai/`)
**New** — `src/services/gptProgram.ts`, `src/routes/program.ts`
**Modified** — `src/config/env.ts` (GPT_*), `src/app.ts` (route registration), `.env.example`

### Root
- `docker-compose.yml` (UI port/healthcheck fix, VITE_API_URL build arg, GPT env on ai), `README.md`

---

## 2. Local commands

```bash
# Install (first time / after pulling)
cd backend && npm install
cd ../ai && npm install
cd ../ui && npm install

# Type-check everything
cd backend && npm run typecheck
cd ../ai && npm run typecheck
cd ../ui && npx tsc -b

# Tests
cd backend && npm test     # exercise classifier
cd ui && npm test          # session engine

# Lint UI
cd ui && npm run lint

# Run locally (3 terminals)
cd ai && npm run dev        # :4100
cd backend && npm run dev   # :4000
cd ui && npm run dev        # :3000

# Production build
cd backend && npm run build
cd ai && npm run build
cd ui && npm run build      # must run on your Mac (native rollup/esbuild)
```

---

## 3. Dokploy deployment

Three services, all built with the **Dockerfile** builder.

**`ui`** — root `ui`, Dockerfile, port **80**.
- Build arg: `VITE_API_URL=https://gym.najahai.com/api` (baked at build time).

**`backend`** — root `backend`, Dockerfile, port **4000**. Env:
`MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN=7d`, `CORS_ORIGIN=https://gym.najahai.com`,
`AI_SERVICE_URL=https://gym.najahai.com/ai`, `AI_SERVICE_TOKEN`, `BIND_HOST=0.0.0.0`.

**`ai`** — root `ai`, Dockerfile, port **4100** (keep private). Env:
`AI_SERVICE_TOKEN` (same as backend), `BIND_HOST=0.0.0.0`,
`GPT_API_KEY` (OpenAI key), `GPT_MODEL=gpt-4o-mini` (optional), `GPT_BASE_URL=https://api.openai.com/v1` (optional).

Expose `ui` publicly; expose `backend` only if external clients need it; keep `ai` private.
Deploy order: `ai` → `backend` → `ui`.

---

## 4. Required environment variables

| Service | Variable | Required | Notes |
|---|---|---|---|
| ui (build arg) | `VITE_API_URL` | prod | Baked into the static bundle; e.g. `https://gym.najahai.com/api` |
| backend | `MONGODB_URI` | yes | Atlas connection string |
| backend | `JWT_SECRET` | yes | ≥ 32 chars |
| backend | `JWT_EXPIRES_IN` | no | default `7d` |
| backend | `CORS_ORIGIN` | yes (prod) | your UI origin |
| backend | `AI_SERVICE_URL` | yes | e.g. `https://gym.najahai.com/ai` |
| backend | `AI_SERVICE_TOKEN` | yes | shared with ai, ≥ 16 chars |
| backend | `BIND_HOST` | yes | `0.0.0.0` |
| ai | `AI_SERVICE_TOKEN` | yes | same value as backend |
| ai | `GPT_API_KEY` | for GPT | server-side only; empty → GPT path returns 503, Quick Generate still works |
| ai | `GPT_MODEL` | no | default `gpt-4o-mini` |
| ai | `GPT_BASE_URL` | no | default OpenAI; set for Azure/OpenAI-compatible |

**The GPT key never reaches the frontend** — it lives only in the private `ai` service.

---

## 5. MongoDB indexes / migrations

**No data migration required** — all changes are additive.

**Indexes — action needed.** The backend sets `autoIndex: false` in production
(`src/config/database.ts`), so the new indexes will **not** auto-build. New collections:
`gptusages` (unique `userId`), `aiconversations` (`userId`, `userId+updatedAt`),
`bodymeasurements` (`userId`, `userId+measuredAt`). The unique `userId` index on
`gptusages` matters for quota integrity.

Do **one** of the following after first deploy:
- One-time: temporarily set `autoIndex: true`, start the backend once so Mongoose builds
  indexes, then revert; **or**
- Run a short script calling `Model.syncIndexes()` for `GptUsage`, `AiConversation`,
  `BodyMeasurement` (and existing models) against the production DB.

---

## 6. Backward compatibility

- **Existing users:** new profile fields (gender, injuries, equipment, preferredDays,
  sessionDuration) are optional. Existing docs read back as empty/`undefined`; the UI shows
  "—"/"Not set" and the Profile editor lets users fill them. No backfill required.
- **Existing programs:** untouched. New endpoints (duplicate, preview, PATCH editing) are
  additive. Old programs without a `schedule` still render (flat fallback) and remain editable.
- **Workout sessions / localStorage:** the active-session recovery format is unchanged from
  the previous release; in-progress workouts survive the upgrade.
- **Auth tokens:** unchanged (same JWT). Users stay logged in.

---

## 7. Known limitations

- GPT requires `GPT_API_KEY`. Without it the GPT builder returns a clear 503; rule-based
  Quick Generate and coach import are unaffected.
- GPT quota is 5 messages per user per ISO week (Monday 00:00 UTC). A failed generation does
  not consume quota; a successful one does.
- The program editor edits existing exercises, their fields, and day titles, and remaps
  renamed exercises in the schedule. It does **not** yet add/remove/reorder exercises.
- Measurements UI supports add + list; per-entry delete exists on the API but isn't surfaced
  in the UI yet.
- Exercise image replacement is still by pasted URL (no upload).
- The "AI recommendations" endpoint remains rule-based (unchanged).
- Tests cover the session engine and the exercise classifier (unit). No automated e2e/browser
  tests yet.
- `vite build` must run on a host whose installed native binaries match its platform.

---

## 8. Mobile QA checklist

**Install / PWA**
- [ ] "Add to Home Screen" works on iOS Safari and Android Chrome; icon + name correct.
- [ ] Launches standalone (no browser chrome); status bar/theme color correct in dark & light.
- [ ] Offline: relaunch with no network shows the app shell (not a browser error).

**Auth & profile**
- [ ] Register, log out, log back in; session persists across refresh.
- [ ] Edit profile (all fields incl. equipment/days/injuries) → reload → values persisted (from Atlas, not just local).

**Home (sections A–F)**
- [ ] Resume banner appears only with an unfinished workout; Resume and Discard both work.
- [ ] Today's workout shows correct title/duration/exercise count; Start works.
- [ ] Weekly progress numbers match reality; streak/adherence render.
- [ ] Next sessions shows 2–3 upcoming only; full exercise list is NOT on Home.
- [ ] GPT card shows "N of 5 left".

**Workout runner**
- [ ] Set tiles tap-to-complete with haptic; rest timer counts down with vibration.
- [ ] Refresh mid-workout → progress restored; finish → summary; History updates.
- [ ] Kill network before Finish → "Couldn't save" with Save again; reconnect → syncs.

**Programs**
- [ ] Grouped by training day; expand/collapse smooth one-handed.
- [ ] Edit program (name, day title, exercise fields) → save → reload → persisted.
- [ ] Duplicate, Share (code copied), Activate work.
- [ ] Delete asks for confirmation; deleting the ACTIVE program requires a second confirm.
- [ ] Coach import → review step flags bad items (e.g. "Close", mis-tagged curls) before saving.
- [ ] Share-code import adds a program.

**GPT builder**
- [ ] Open from Home and Programs; send a message; draft renders grouped by day.
- [ ] Correction chips (e.g. "Make it 4 days", "Adjust for knee pain") update the draft.
- [ ] Quota decrements; at 0 the composer is disabled with a clear message.
- [ ] "Save & activate" creates the program and it becomes active.

**Measurements & general**
- [ ] Add a measurement → appears in latest + history → persists after reload.
- [ ] Dark/light toggle persists; bottom nav reachable with thumb; no horizontal scroll;
      tap targets ≥ 44px; safe-area insets respected on notched phones.
