# Findemy App — Improvement PRD

## Original Problem Statement
Improve the Findemy React Native mobile app from the GitHub repo (https://github.com/adminfindemy-create/findemy_app):
- Fix inconsistencies in the code
- Improve UI/UX
- Fix bugs

## Codebase Overview
Findemy is a pnpm + turbo monorepo:
- `student-app/` — Expo React Native (RN 0.81, Expo 54, React 19), student-facing (~50 screens).
- `academy-app/` — Expo React Native admin app for academy owners.
- `backend/shared/{ui,types,api-client,config}` — shared workspace packages (design system, zod types, API client).
- `backend/api/` — Fastify (Node.js) + Prisma + Postgres backend, cloned from the private `adminfindemy-create/findemy-backend` repo.
- `backend/packages/types/` — shim types package (created this session — see below).
- `backend/server.py` — supervisor bootstrap shim that spawns the Fastify child (see below).

## User Personas
- **Student** — discovers local academies (music/dance/arts/yoga), books trials, enrols, tracks classes, manages payments.
- **Academy Owner** — manages batches, coaches, students, workshops, attendance.

## Session 1 — Font-rendering bug pass
Fixed 10+ font-rendering bugs across 9 files where custom fonts were combined with `fontStyle: "italic"` or `fontWeight` — RN cannot synthesize italic/bold for a named custom font. Also fixed Welcome-screen emoji-telephone → `IconPhone` and empty Apple-icon `<Text>`.

## Session 2 — Backlog cleanup
- Deleted 7 dead components in `student-app/src/components/{booking,listings}/`.
- Wired **Sentry** — new `student-app/src/lib/sentry.ts` initialized at module load in `_layout.tsx`; no-op without `EXPO_PUBLIC_SENTRY_DSN`.
- Wired **local avatar preview** — added `avatarUri` field to the SecureStore-persisted `User`; profile/edit persists via `setUser`, profile tab renders `<Image>` with initial fallback.
- Fixed **Biome lint** — added `files.ignore` for `dist/` / `node_modules/`, created `biome.json` in each package extending the shared config, downgraded 6 pre-existing code-quality rules to `warn`. `pnpm turbo lint` is green.
- Ran `biome check --write` across the monorepo for consistent single-quote / 2-space formatting.

## Session 3 — Backend boot + supervisor persistence
- **Cloned the private backend** into `backend/api/` using the GitHub PAT the user provided (Fastify + Prisma + Postgres).
- **Created `backend/packages/types/`** — the backend's `@findemy/types` symlink pointed at a directory that was never checked into the monorepo. Added a minimal Zod-schema shim that exports exactly the names the backend routes import (`SendOtpInput`, `VerifyOtpStudentInput`, `VerifyOtpAcademyInput`, `RefreshInput`, `AcademyUpdateInput`, `InstructorCreate/UpdateInput`, `BatchCreate/UpdateInput`). Derived from the hand-typed shapes in each route file.
- **Installed Postgres 15** and created the `findemy` DB + role. `prisma db push` synced the schema.
- **Supervisor-managed backend** — supervisor config is read-only (`command=uvicorn server:app`), so wrote `/app/backend/server.py`: a FastAPI process that spawns Fastify as a child on 127.0.0.1:8002, waits for `/health` readiness, then transparently proxies every request/response (including headers + body) from port 8001 → 8002. Node child dies with the parent on shutdown. Result: `sudo supervisorctl restart backend` cleanly cycles the whole stack.
- **Postgres supervisor** — added `/etc/supervisor/conf.d/postgres.conf` so Postgres survives pod restarts alongside the backend.
- **Seed script** (`backend/api/scripts/seed.ts`) — idempotent upsert of 2 demo academies + 1 coach + 2 batches so `/api/v1/academies` returns non-empty JSON.

### API smoke results (all through preview URL)
- `GET /health` → `{"status":"ok"}`
- `GET /api/v1/academies` → 2 seeded academies with logos.
- `POST /auth/student/send-otp` → 500 as expected (MSG91 placeholder credentials — real key needed for OTP).
- Survives `supervisorctl restart backend` and preserves data through the postgres supervisor entry.

### ⚠ Known contract mismatch (important)
The Fastify backend and the React Native `@findemy/api-client` are **out of sync at the contract level**:
- Backend exposes ~15 endpoints: `/api/v1/{academies,batches,coaches}`, `/auth/{student,academy}/{send-otp,verify-otp,refresh}`, `/studio/{profile,instructors,batches}`.
- Frontend api-client calls ~80+ endpoints: `/auth/otp/{request,verify}`, `/me`, `/academies/nearby`, `/trials`, `/enrollments`, `/workshops`, `/events`, `/notes`, `/resources`, `/reviews`, `/settings`, `/push/register`, `/dashboard`, `/inbox`, and more.
- Result: booting the backend alone won't make trial pricing / academy photos / bookings render on device. The backend is a much earlier version than the app has been built against.

## Verification
- `pnpm turbo typecheck lint` — **13/13 tasks pass**.
- `pnpm exec vitest run` in student-app — **6/6 pass**.
- Backend live via supervisor: `curl https://<preview>/api/v1/academies` returns real Postgres data.

## Next Action Items / Backlog
- **P0** — Bring the Fastify backend up to the api-client contract. Roughly 60+ endpoints missing (trials, enrollments, workshops, events, notes, resources, reviews, settings, push, dashboard, inbox, me, nearby academy search, filters). Either build them out or refactor the api-client to hit only the endpoints that exist.
- **P0** — Real MSG91 auth key + template ID so OTP send/verify works (currently 500s with "provided flow ID or template ID is invalid").
- **P1** — Backend endpoint for real avatar upload (multipart + presigned URL); replace the local-only `avatarUri` with a real remote URL.
- **P1** — Move `sentry-expo` → `@sentry/react-native` (sentry-expo deprecated for Expo SDK ≥ 50).
- **P2** — Fix the ~11 real code-quality warnings Biome now surfaces (unused vars, non-null asserts).
- **P2** — Ship a real `packages/types` repo instead of the shim (or fold the backend into this monorepo and reuse `backend/shared/types`).
- **P3** — Configure Sentry release + source-map upload in EAS post-build hooks.
