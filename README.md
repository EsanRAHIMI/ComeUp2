# ComeUp

ComeUp is a gym workout companion with three deployable parts:

- `ui`: Expo / React Native app
- `backend`: Fastify API for auth, MongoDB Atlas persistence, programs, sessions, progress, and AI proxy routes
- `ai`: internal AI service for workout generation and recommendations

## Services

### Backend

Runs on port `4000` by default.

Key endpoints:

- `GET /health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/profile`
- `GET /api/v1/programs`
- `POST /api/v1/programs`
- `GET /api/v1/programs/active`
- `PATCH /api/v1/programs/:id`
- `POST /api/v1/programs/:id/activate`
- `POST /api/v1/programs/:id/share`
- `POST /api/v1/programs/import/:shareCode`
- `POST /api/v1/sessions/start`
- `PATCH /api/v1/sessions/:id/complete`
- `GET /api/v1/sessions`
- `POST /api/v1/ai/workouts/generate`
- `POST /api/v1/ai/recommendations`

### AI

Runs on port `4100` by default. It is internal and protected by `AI_SERVICE_TOKEN`.

Key endpoints:

- `GET /health`
- `POST /workouts/generate`
- `POST /recommendations`

## Local Setup

Create env files:

```bash
cp backend/.env.example backend/.env
cp ai/.env.example ai/.env
```

Use the same `AI_SERVICE_TOKEN` in both files. Set `MONGODB_URI` in `backend/.env` to the MongoDB Atlas connection string.

Install and build:

```bash
cd backend && npm install && npm run build
cd ../ai && npm install && npm run build
cd ../ui && npm install && npm run build
```

For mobile camera rep counting, use Node `22.13.0` or another React Native supported version:

```bash
nvm use
```

The workout camera uses native VisionCamera/Worklets/TFLite dependencies, so it requires an Expo development build:

```bash
cd ui
npx expo prebuild --clean
npx expo run:ios
npx expo run:android
```

Run services:

```bash
cd ai && npm run dev
cd backend && npm run dev
cd ui && npm run dev
```

Or with Docker:

```bash
docker compose up --build
```

## Production Notes

- Put `backend` behind HTTPS and expose only backend publicly.
- Keep `ai` private on the same network as backend.
- Use a long random `JWT_SECRET`.
- Use a long random shared `AI_SERVICE_TOKEN`.
- In MongoDB Atlas, restrict network access to deployment IPs.
- The current AI service is deterministic and production-safe for MVP recommendations. Real LLM or pose-analysis providers can be added behind the same `ai` service contract later.
