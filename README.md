# ComeUp

ComeUp is a gym workout companion with three deployable parts:

- `ui`: Vite / React web app
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

Run services:

```bash
cd ai && npm run dev
cd backend && npm run dev
cd ui && npm run dev
```

Or with Docker:

```bash
cp .env.example .env
# Edit .env and replace every secret before deploying.
docker compose up --build
```

## Dokploy Deployment

The hosted deployment uses three separate Dokploy services. Prefer the Dockerfile builder for production deployments. Nixpacks works, but it can spend several minutes downloading and preparing the Nix toolchain before the real app build starts.

### `ui` service

- Root directory: `ui`
- Builder: Dockerfile
- Dockerfile path: `Dockerfile`
- Port: `80`
- Optional env: `VITE_API_URL=https://gym.najahai.com/api`

The UI is built once with Vite and served as static files by Nginx. This is faster and smaller than running a Node server for the web app.

### `backend` service

- Root directory: `backend`
- Builder: Dockerfile
- Dockerfile path: `Dockerfile`
- Port: `4000`

Configure these environment variables:

- `MONGODB_URI` with the MongoDB Atlas connection string
- `JWT_SECRET`
- `CORS_ORIGIN=https://gym.najahai.com`
- `AI_SERVICE_URL=https://gym.najahai.com/ai`
- `AI_SERVICE_TOKEN`
- `BIND_HOST=0.0.0.0`

### `ai` service

- Root directory: `ai`
- Builder: Dockerfile
- Dockerfile path: `Dockerfile`
- Port: `4100`

Configure these environment variables:

- `AI_SERVICE_TOKEN`, with the same value used by `backend`
- `BIND_HOST=0.0.0.0`

Do not set `VITE_API_URL` on the `ai` service. It is only used by the frontend build.

Optional port variables if Dokploy does not inject `PORT` automatically:

- `UI_PORT` defaults to `3000`
- `BACKEND_PORT` defaults to `4000`
- `AI_PORT` defaults to `4100`

Expose `ui` publicly for the web app and `backend` publicly only if the mobile app or external clients need direct API access. Keep `ai` private when Dokploy networking allows it.

If a service must stay on Nixpacks, keep the matching `nixpacks.toml` file. For faster deploys, switch all three services to Dockerfile in Dokploy.

## Production Notes

- Put `backend` behind HTTPS and expose only backend publicly.
- Keep `ai` private on the same network as backend.
- Use a long random `JWT_SECRET`.
- Use a long random shared `AI_SERVICE_TOKEN`.
- If using MongoDB Atlas instead of the bundled MongoDB service, set `MONGODB_URI` in Dokploy and restrict Atlas network access to deployment IPs.
- The current AI service is deterministic and production-safe for MVP recommendations. Real LLM or pose-analysis providers can be added behind the same `ai` service contract later.
