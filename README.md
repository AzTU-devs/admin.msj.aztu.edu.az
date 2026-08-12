# msj-admin

Editorial dashboard for the Machine Science journal — Next.js 16 (App Router, React 19).

## Run

```bash
cp .env.example .env.local     # NEXT_PUBLIC_API_URL -> backend
npm install
npm run dev                    # http://localhost:3001
```

Sign in with an editorial account, e.g. `admin@msj.aztu.edu.az` / `Demo12345!`.
Only `ADMIN`, `EDITOR_IN_CHIEF`, and `EDITOR` roles may enter.

## What's here

- **Login** (`app/login/page.tsx`) — email/password → JWT; refresh-token rotation
  handled transparently in `lib/api.ts`.
- **Dashboard** (`app/page.tsx`) — stat cards (submissions, published, users,
  views, downloads, citations), an inline-SVG **traffic chart** (30-day views vs.
  downloads), pipeline-by-status, and a most-read-articles table. All live from
  `/api/v1/admin/dashboard` + `/admin/metrics/overview`.
- **Submissions** (`app/articles/page.tsx`) — every manuscript with status pill,
  subject, DOI, a status filter, and a per-row **status transition** control that
  `PATCH`es the editorial workflow (writes `article_status_history`).
- `components/Shell.tsx` — auth guard + sidebar; redirects to `/login` when unauthenticated.

## Remaining

- Article detail drawer: authors, files, reviews, assign reviewers, editor discussion.
- Reviewer console (invitations, submit review) — API tables exist
  (`review_assignments`, `reviews`).
- CMS editing (content pages, announcements, board members, settings — all JSONB-backed).
- Users management screen (`GET /admin/users` in `UserRepository.search`, controller pending).
- **Security hardening:** move the access/refresh tokens from `localStorage` to
  httpOnly cookies before production.

## Docker (independent deploy)

This app is self-contained and deploys on its own:

```bash
# API_URL is baked into the /api + /files proxy rewrites at build time.
docker build --build-arg API_URL=https://api.your-domain.com -t msj-admin .
docker run -p 3001:3001 -e API_URL=https://api.your-domain.com msj-admin
```

Browsers stay same-origin: the Next server proxies `/api` and `/files` to the
backend, so no CORS is needed. `NEXT_PUBLIC_API_URL` can be set to call the
backend directly instead (then configure the backend's `CORS_ORIGINS`).
