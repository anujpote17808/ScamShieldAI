# ScamShield AI

ScamShield AI is a URL security analysis platform with real-time threat intelligence.

It provides:

- Deterministic local URL heuristic analysis (SSRF-safe, DNS-validated)
- External threat intelligence via VirusTotal API v3 and Google Web Risk
- Infrastructure intelligence (DNS, TLS certificate, RDAP/WHOIS)
- Transparent risk aggregation with per-signal evidence
- Real-time scan progress via Socket.IO
- JWT authentication with HTTP-only cookies
- Rate limiting, Helmet security headers, request size limits
- Full PostgreSQL persistence via Prisma

---

## Architecture

```
React frontend (Vite)
      ↓  HTTPS
Express backend (Node.js / TypeScript)
      ↓
Local deterministic analysis
      ↓
External threat intelligence (VirusTotal, Google Web Risk)
      ↓
Infrastructure intelligence (DNS · TLS · RDAP)
      ↓
Risk aggregation engine
      ↓
PostgreSQL (via Prisma)
      ↓
Dashboard / scan history
```

---

## Prerequisites

- Node.js 20 or later
- PostgreSQL 15 or later (local or managed)
- npm 10 or later

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd Scamshieldaiwebapp-main
```

### 2. Start local PostgreSQL

The included `docker-compose.yml` starts a PostgreSQL 15 instance with a
persistent volume:

```bash
docker compose up -d
```

This exposes PostgreSQL on `localhost:5432` with:
- User: `user`
- Password: `password`
- Database: `scamshield`

> These are development-only credentials. Do **not** use them in production.

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`. At minimum set:

```
DATABASE_URL="postgresql://user:password@localhost:5432/scamshield"
JWT_SECRET=<generate a 64-character random hex string>
FRONTEND_URL=http://localhost:5173
```

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Install dependencies and apply the database schema

```bash
cd backend
npm install
npm run db:push      # applies schema to local DB without migration history
npx prisma generate  # generates the Prisma client
```

### 5. Start the backend

```bash
npm run dev
# Server running on http://localhost:5001
```

### 6. Start the frontend

```bash
cd ../frontend
npm install
npm run dev
# Frontend running on http://localhost:5173
```

---

## Production Database Deployment

### Supported providers

Any PostgreSQL 15+ provider is supported, including:

- [Supabase](https://supabase.com) (recommended — free tier available)
- [Neon](https://neon.tech) (serverless PostgreSQL)
- [Railway](https://railway.app)
- [Render](https://render.com)
- Self-hosted PostgreSQL

### 1. Obtain a DATABASE_URL

Your provider will give you a connection string in the form:

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

The `?sslmode=require` parameter is **mandatory** for all managed providers.

### 2. Set environment variables on the backend host

All required backend variables:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
JWT_SECRET=<64-character random hex>
FRONTEND_URL=https://your-frontend-domain.com
NODE_ENV=production
PORT=5001
VIRUSTOTAL_API_KEY=<optional>
GOOGLE_WEB_RISK_API_KEY=<optional>
```

See `backend/.env.example` for all available variables and their defaults.

### 3. Apply the database schema to production

Use Prisma's safe migration deployment command. This command applies pending
migrations and **never destroys existing data**:

```bash
cd backend
npm run migrate:deploy
```

This command is equivalent to `npx prisma migrate deploy` and is safe to run
on every deployment.

Alternatively, for providers where migration history is not needed:

```bash
npm run db:push
```

> `db:push` is simpler but does not maintain a migration history. Use
> `migrate:deploy` for production deployments that require an audit trail.

### 4. Generate the Prisma client

```bash
npx prisma generate
```

This must be run as part of your deployment build step.

---

## Database Schema

The application uses 6 models:

| Model | Purpose |
|---|---|
| `User` | Account records, hashed passwords |
| `Scan` | Individual scan requests |
| `ScanResult` | Risk scores, verdicts, local analysis JSON, external intelligence JSON |
| `ThreatIndicator` | Per-signal indicator records linked to a scan |
| `UserSettings` | Per-user preferences |
| `Notification` | System notifications |

`ScanResult.analysis` (JSONB) stores local heuristic signals and infrastructure intelligence.  
`ScanResult.externalIntelligence` (JSONB) stores normalized VirusTotal and Google Web Risk results.

---

## Build

```bash
# Backend
cd backend
npm run build       # compiles TypeScript to dist/
npx prisma generate # must be run after build for production

# Frontend
cd frontend
npm run build       # outputs static files to dist/
```

---

## Tests

```bash
cd backend
npm test            # builds then runs node:test security suite (10 tests)
```

---

## Security Notes

- `DATABASE_URL`, `JWT_SECRET`, and all API keys are **backend-only** and are
  never referenced in frontend source code.
- The frontend is built with Vite; no backend environment variables are
  accessible unless explicitly prefixed with `VITE_`. None of the sensitive
  variables use this prefix.
- The backend error handler never exposes Prisma internals, connection strings,
  or stack traces to HTTP clients.
- Prisma logs are restricted to `error` level in production.

---

## Required Backend Environment Variables (Summary)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `JWT_SECRET` | ✅ Yes | JWT signing secret (min 32 chars) |
| `FRONTEND_URL` | ✅ Yes | Exact frontend origin for CORS |
| `NODE_ENV` | ✅ Yes | `production` in production |
| `PORT` | No | Default: `5001` |
| `VIRUSTOTAL_API_KEY` | No | Falls back to local analysis |
| `GOOGLE_WEB_RISK_API_KEY` | No | Falls back to local analysis |
| `JWT_EXPIRES_IN` | No | Default: `7d` |
| `JWT_COOKIE_MAX_AGE_DAYS` | No | Default: `7` |
| `JSON_BODY_LIMIT` | No | Default: `16kb` |
| `LOGIN_RATE_LIMIT_MAX` | No | Default: `10` per 15 min |
| `SCAN_RATE_LIMIT_MAX` | No | Default: `20` per 60 sec |
| `SCAN_CONCURRENCY_MAX` | No | Default: `4` concurrent scans |
