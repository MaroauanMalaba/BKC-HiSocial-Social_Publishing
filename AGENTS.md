<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# HiSocial Studio — AI Developer Guide

> This document is the single source of truth for any AI or developer continuing work on this project.
> Read it fully before touching anything. Do not guess. Do not rely on training data for Next.js APIs.

---

## 1. Project Overview

**HiSocial Studio** is an internal social publishing tool for BKC Consulting / HiSocial.
It lets users upload media, compress it, write captions, pick platforms & formats, then publish immediately or schedule for later.

- Runs **locally** — no cloud backend, no external DB
- Everything in one process: Next.js server + SQLite + cron scheduler
- Single tenant — one user or a small team, one SQLite file

**Owner:** Maraouan Malaba — office@hisocial.at  
**App Admin (Meta):** same  
**Workspace Owner (Zernio):** same

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server Components by default — mark client code with `"use client"` |
| Runtime | Bun | Use `bun` not `npm`/`npx` everywhere |
| UI | React 19 + Tailwind 4 | Tailwind config in `tailwind.config.ts` |
| Database | SQLite via `better-sqlite3` | Sync API — no await needed. File: `data/hisocial.db` |
| Video compression | FFmpeg via `fluent-ffmpeg` | H.264 / AAC / 1080p / faststart |
| Image compression | Sharp | mozjpeg, max 1920px |
| Scheduling | `node-cron` | 1-minute tick, in-process via `instrumentation.ts` |
| Auth | `jose` (JWT) + `bcrypt` | Sessions stored in SQLite, cookie-based |
| Publishing | Zernio API | Primary publish layer — handles OAuth + all platforms |
| Meta OAuth | Meta Graph API v21.0 | Only for Instagram + Facebook account connection |

---

## 3. Architecture

```
Browser (React 19)
    │
    ├── Server Components (app/(app)/**/page.tsx)   ← data fetching, no interactivity
    └── Client Components (*-client.tsx, *-composer.tsx)  ← forms, state, uploads

Next.js App Router
    │
    ├── /api/*  Route Handlers  ← REST API consumed by client components
    │     ├── /api/post          CRUD for posts
    │     ├── /api/upload        multipart → compress → save
    │     ├── /api/auth/*        login / register / logout / session
    │     ├── /api/zernio/*      connect accounts, publish, insights
    │     └── /api/meta/*        Meta OAuth callback
    │
    ├── lib/db.ts                SQLite schema + getDb() singleton
    ├── lib/auth.ts              JWT session helpers (getCurrentUser, etc.)
    ├── lib/compression.ts       FFmpeg + Sharp pipelines
    ├── lib/scheduler.ts         node-cron — polls for scheduled posts every minute
    └── lib/social/
          ├── index.ts           publishPost() dispatcher
          ├── zernio.ts          Zernio API client
          ├── platform-formats.ts  format definitions + toZernioSpecific()
          └── insights.ts        performance data fetching
```

**Scheduler startup:** `instrumentation.ts` at project root starts `lib/scheduler.ts` when Next.js boots (`next dev` / `next start`). It runs every 60 seconds, finds posts with `status = 'scheduled'` and `scheduled_at <= now`, and calls `publishPost()`.

---

## 4. Database Schema

File: `lib/db.ts` — auto-migrated on first `getDb()` call.

### `users`
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
name        TEXT NOT NULL
email       TEXT UNIQUE NOT NULL
password    TEXT NOT NULL          -- bcrypt hash
role        TEXT DEFAULT 'editor'  -- 'admin' | 'editor'
zernio_profile_id  TEXT            -- Zernio profile linked to this user
created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
```

### `posts`
```sql
id              INTEGER PRIMARY KEY AUTOINCREMENT
user_id         INTEGER REFERENCES users(id)
caption         TEXT
platforms_json  TEXT    -- JSON: { platforms: string[], post_type: string, platform_formats: { [platform]: format } }
media_path      TEXT    -- relative path under /data/compressed/
media_type      TEXT    -- 'image' | 'video'
status          TEXT    -- 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
scheduled_at    DATETIME
published_at    DATETIME
zernio_job_id   TEXT    -- returned by Zernio after publish
error_message   TEXT
is_draft        INTEGER DEFAULT 0
created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
```

**`platforms_json` structure (important — this is what gets JSON.parse'd everywhere):**
```json
{
  "platforms": ["instagram", "youtube"],
  "post_type": "reel",
  "platform_formats": {
    "instagram": "reel",
    "youtube": "short"
  }
}
```

⚠️ Always wrap `JSON.parse(row.platforms_json)` in try/catch — rows created before migrations may have invalid JSON.

```ts
let meta: Record<string, unknown> = {};
try { meta = JSON.parse(row.platforms_json); } catch { /* ignore */ }
const platforms = Array.isArray(meta.platforms) ? (meta.platforms as string[]) : [];
```

### `sessions`
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
user_id     INTEGER REFERENCES users(id)
token       TEXT UNIQUE NOT NULL
expires_at  DATETIME NOT NULL
created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
```

---

## 5. Social Media Integrations

### 5.1 Zernio API (primary publishing layer)

Zernio handles OAuth account connections + publishing to **all** platforms.

**Base URL:** `https://api.zernio.io/v1`  
**Auth:** `Authorization: Bearer ${ZERNIO_API_KEY}` header  
**Key:** Get from app.zernio.io → Settings → API Keys (BKC/HiSocial workspace)

**Client:** `lib/social/zernio.ts`

Key functions:
```ts
getOrCreateProfile(userId, email)    // creates a Zernio profile for the user, returns profile_id
getConnectedAccounts(profileId)      // lists connected social accounts
getConnectUrl(profileId, platform)   // returns OAuth redirect URL for connecting an account
publishPost(profileId, payload)      // publishes to selected platforms, returns job_id
getJobStatus(jobId)                  // polls job status
getInsights(profileId, platform)     // fetches analytics data
```

**Publishing flow:**
1. Client calls `POST /api/post` with caption, platforms, formats, media, scheduled_at
2. If publishing now → API calls `publishPost()` → Zernio returns `job_id`
3. If scheduled → record saved as `status = 'scheduled'`; scheduler picks it up later
4. Scheduler / direct publish sets `status = 'publishing'` → calls Zernio → on success: `status = 'published'`, `published_at = now`

**Platform identifiers used by Zernio:**
- `instagram`, `facebook`, `tiktok`, `youtube`, `linkedin`

**Format mapping** (`lib/social/platform-formats.ts` → `toZernioSpecific()`):
```ts
instagram: feed → { type: "feed" }
instagram: reel → { type: "reel" }
instagram: story → { type: "story" }
youtube: short → { type: "short" }
tiktok: video → { type: "video" }
// etc.
```

---

### 5.2 Meta Graph API (Instagram + Facebook connection)

Meta is used **only for account authentication/connection** — not for direct publishing (Zernio handles that).

**App:** HiSocial Studio  
**App ID:** `940087908782876` (public, safe in env + README)  
**App Secret:** Private — get from developers.facebook.com → App → Settings → Basic → App Secret  
**API Version:** v21.0

**OAuth flow:**
1. User clicks "Instagram verbinden" → `/api/zernio/connect?platform=instagram`
2. Server builds Meta OAuth URL with scope `instagram_basic,pages_read_engagement,instagram_content_publish`
3. User authorizes → Meta redirects to `/api/meta/callback?code=...`
4. Server exchanges code for access token (server-side, never expose secret to browser)
5. Token + page/account info saved to Zernio profile via `zernio.linkMetaAccount()`
6. Redirect to `/accounts?connected=instagram`

**Required Meta permissions (already configured in Meta App):**
- `instagram_basic`
- `instagram_content_publish`
- `pages_read_engagement`
- `pages_manage_posts`
- `public_profile`

**Important:** Meta requires a **publicly reachable URL** (`PUBLIC_BASE_URL`) to fetch media files before publishing images/videos. For local dev: use ngrok. For production: set real domain.

**Facebook Pages limitation:** Meta only allows posting via Facebook Pages (not personal profiles). If no page found → redirect to `/accounts?error=no_facebook_pages`.

---

### 5.3 Platform Formats

Defined in `lib/social/platform-formats.ts`:

```ts
export const PLATFORM_FORMATS = {
  instagram: [
    { id: "feed",      label: "Feed",      desc: "Quadratisch oder 4:5 Portrait" },
    { id: "reel",      label: "Reel",      desc: "9:16 Vertical Video, max 90s" },
    { id: "story",     label: "Story",     desc: "9:16, verschwindet nach 24h" },
    { id: "carousel",  label: "Karussell", desc: "Bis zu 10 Bilder/Videos" },
  ],
  youtube: [
    { id: "video",  label: "Video",  desc: "Standard YouTube Video" },
    { id: "short",  label: "Short",  desc: "Vertical, max 60s" },
  ],
  facebook: [
    { id: "post",   label: "Post",  desc: "Standard Facebook Post" },
    { id: "reel",   label: "Reel",  desc: "Vertical Video" },
    { id: "story",  label: "Story", desc: "Verschwindet nach 24h" },
  ],
  linkedin: [
    { id: "post",     label: "Post",     desc: "Text + Bild/Video" },
    { id: "article",  label: "Artikel",  desc: "Long-form Content" },
    { id: "document", label: "Dokument", desc: "PDF/Präsentation" },
  ],
  tiktok: [
    { id: "video", label: "Video", desc: "9:16, 15s–10min" },
  ],
}
```

---

## 6. API Routes Reference

### `POST /api/upload`
Accepts `multipart/form-data` with `file` field.  
Compresses via FFmpeg (video) or Sharp (image).  
Returns: `{ path: string, type: "image"|"video" }`

### `GET /api/post`
Returns all posts for current user.  
Query params: `?status=scheduled` etc.

### `POST /api/post`
Body (JSON):
```ts
{
  caption: string
  platforms: string[]           // ["instagram", "youtube"]
  platform_formats: Record<string, string>  // { instagram: "reel", youtube: "short" }
  media_path: string
  media_type: "image" | "video"
  scheduled_at?: string         // ISO datetime, optional
  is_draft?: boolean            // true → save as draft, don't publish
}
```

### `DELETE /api/post?id=<id>`
Deletes post if owned by current user.

### `GET /api/zernio/connect?platform=<platform>`
Starts OAuth connection flow for given platform.  
Redirects user to platform's OAuth page.

### `GET /api/meta/callback`
Handles Meta OAuth callback. Exchanges code, saves token, redirects to accounts page.

### `GET /api/zernio/insights?platform=<platform>`
Returns analytics data from Zernio.

### `POST /api/auth/login`
Body: `{ email, password }` → sets session cookie, returns user.

### `POST /api/auth/register`
Body: `{ name, email, password }` → creates user + session.

### `POST /api/auth/logout`
Clears session cookie.

### `GET /api/auth/session`
Returns current user or 401.

---

## 7. Key Patterns

### Server Components vs Client Components
- `page.tsx` = Server Component → fetches data from DB directly, passes to client components as props
- `*-client.tsx`, `*-composer.tsx` = Client Components (`"use client"`) → handle forms, state, interactivity
- Never call `getDb()` inside a Client Component

### Auth check pattern (all protected pages)
```ts
const user = await getCurrentUser();
if (!user) redirect("/login");
```

### JSON.parse safety pattern
```ts
let meta: Record<string, unknown> = {};
try { meta = JSON.parse(row.platforms_json); } catch { /* ignore */ }
const platforms = Array.isArray(meta.platforms) ? (meta.platforms as string[]) : [];
```

### File paths
- Uploaded files: `data/uploads/<filename>`
- Compressed files: `data/compressed/<filename>`
- Both are `.gitignore`d — never commit media files
- Served via Next.js static file serving from `public/` directory? No — served via `/api/media?path=...` route

### CSS design system
All custom classes are in `app/globals.css`:

| Class | Effect |
|---|---|
| `.glass` | Glassmorphism card (backdrop-filter, border) |
| `.card-lift` | Hover: translateY(-4px) + shadow lift |
| `.kpi-card` | KPI card hover: translateY(-5px) + scale(1.018) |
| `.platform-card` | Platform card hover: translateY(-3px) + scale(1.012) |
| `.s-enter` | Section entrance animation (fadeIn + slideUp) |
| `.s-d1` – `.s-d6` | Staggered animation delays (0s – 0.40s) |
| `.stat-num` | Number pop-in animation |
| `.sn-2` – `.sn-5` | Staggered stat delays |
| `.hs-btn-primary` | Green CTA button |
| `.hs-btn-glass` | Glass secondary button |
| `.hs-btn-ghost` | Ghost tertiary button |
| `.hs-chip` | Status/tag chip |
| `.hs-chip-green` | Green status chip |
| `.nav-item` | Sidebar nav link (hover: translateX(4px), skips active) |
| `.h-eyebrow` | Small uppercase label text |
| `.ai-shimmer` | Animated shimmer for AI elements |

### CSS variables (theme)
```css
--text-1          /* primary text */
--text-2          /* secondary text */
--text-3          /* tertiary/muted text */
--green-action    /* primary green (#22c55e range) */
--accent-blue     /* accent blue */
--green-glow      /* box-shadow glow color */
--glass-shadow    /* glass card shadow */
--bg-1            /* page background */
--surface-1       /* card background */
```

---

## 8. Implementation Status

### ✅ Done

- [x] Auth (login, register, session, logout)
- [x] Upload page (drag & drop, compression, format picker, platform selector)
- [x] Format selector UI (Reel / Story / Short / Feed / etc.) in composer
- [x] Draft saving (`is_draft` field, `status = 'draft'`)
- [x] Scheduled posting (datetime picker, cron scheduler, auto-publish)
- [x] Dashboard (KPIs, upcoming posts, top posts, AI banner)
- [x] Schedule page (calendar view, upcoming posts list, content strategy, templates)
- [x] Insights page (analytics, top posts)
- [x] Accounts page (connect/disconnect social accounts)
- [x] Team page (invite, roles, member list)
- [x] Projects page (campaign management)
- [x] Sidebar navigation with active state + hover animations
- [x] Animation system (section entrance, hover lifts, stat counters)
- [x] Zernio API client (connect accounts, publish, insights)
- [x] Meta OAuth flow (Instagram + Facebook account connection)
- [x] Platform format definitions (`platform-formats.ts`)
- [x] README.md (developer setup guide)
- [x] `.env.example` (fully documented with all required vars)
- [x] SQLite DB (auto-migration, all tables)

### ❌ Still needs to be built / verified

- [ ] **Zernio API key** — needs to be obtained from app.zernio.io and set in `.env.local`
- [ ] **Meta App Secret** — needs to be set in `.env.local` from Meta Developer Dashboard
- [ ] **Media serving route** (`/api/media`) — verify it exists and serves compressed files correctly for Meta (needs `PUBLIC_BASE_URL`)
- [ ] **Carousel upload** — Instagram carousel (up to 10 files) not yet implemented in UI
- [ ] **LinkedIn article** — long-form editor not implemented
- [ ] **LinkedIn document** — PDF upload not implemented
- [ ] **TikTok direct upload** — Zernio should handle this, but verify file size limits
- [ ] **Post editing** — no edit UI after creation (only delete)
- [ ] **Error recovery UI** — failed posts have no retry button in UI (status shows "failed" but user can't retry from UI)
- [ ] **Zernio webhook** — for async publish confirmation (currently polling or fire-and-forget)
- [ ] **Multi-file upload** — only single file per post currently
- [ ] **Instagram carousel** — UI for selecting multiple files and ordering them
- [ ] **Analytics real data** — insights page uses real Zernio data but may need pagination
- [ ] **Settings page** — `/settings` route exists as placeholder, no real functionality
- [ ] **Notifications** — no in-app notification system for publish success/failure

---

## 9. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | ✅ | Random secret for JWT signing. Generate: `openssl rand -hex 32` |
| `APP_BASE_URL` | ✅ | Internal base URL. Local: `http://localhost:3000` |
| `PUBLIC_BASE_URL` | ✅ for Instagram/Facebook | Public internet URL. Local: ngrok URL. Production: real domain |
| `META_APP_ID` | ✅ | `940087908782876` — already set, do not change |
| `META_APP_SECRET` | ✅ | From developers.facebook.com → App → Settings → Basic → App Secret |
| `ZERNIO_API_KEY` | ✅ | From app.zernio.io → Settings → API Keys (BKC/HiSocial workspace) |

**Never commit `.env.local`** — it's in `.gitignore`.

---

## 10. Local Dev Checklist

```bash
# 1. Clone + install
git clone https://github.com/MaroauanMalaba/BKC-HiSocial-Social_Publishing.git
cd BKC-HiSocial-Social_Publishing
bun install

# 2. Environment
cp .env.example .env.local
# Fill in META_APP_SECRET and ZERNIO_API_KEY
# For Instagram/Facebook: start ngrok and set PUBLIC_BASE_URL

# 3. Start
bun dev
# → http://localhost:3000
# → First request auto-creates SQLite DB at data/hisocial.db

# 4. Register first user
# → http://localhost:3000/register

# 5. Connect accounts (optional for local testing)
# → http://localhost:3000/accounts
# → Click "Instagram verbinden" (requires ngrok + Meta credentials)
```

**Type checking:**
```bash
bunx tsc --noEmit   # zero output = clean
```

---

## 11. Known Gotchas

1. **`JSON.parse` without try/catch crashes the server** — `platforms_json` column can be null or malformed in older rows. Always use the try/catch pattern shown in section 7.

2. **Meta needs `PUBLIC_BASE_URL`** — if this is empty or `localhost`, Meta will refuse to fetch media. Instagram/Facebook publishing will fail silently or with a confusing error.

3. **Scheduler runs in-process** — if `instrumentation.ts` doesn't run (e.g., custom server, some edge deployments), scheduled posts will never publish. Check this in production.

4. **`getDb()` is sync** — `better-sqlite3` is synchronous. Never `await` it. Never call it in a Client Component (it will throw).

5. **Bun runtime** — this project uses `bun`, not `node`. Use `bun install`, `bun dev`, `bun build`. Don't use `npm` or `yarn`.

6. **App Router only** — there is no Pages Router. Every `page.tsx` is a Server Component. Every Route Handler is in `app/api/`. Don't create `pages/` directory.

7. **`data/` directory is gitignored** — `data/hisocial.db`, `data/uploads/`, `data/compressed/` are never committed. The directory is created at runtime. Make sure it's writable.

8. **TypeScript strict mode** — the project uses strict TypeScript. `unknown` types need explicit casts. `JSON.parse` returns `any` but once you type it as `Record<string, unknown>` you need casts for every property access.

9. **Zernio `_id` not `id`** — Zernio account objects use `_id` as the identifier field, not `id`. Check the TypeScript types in `zernio.ts`.

10. **`searchParams` in App Router pages are async** — in Next.js 16, `searchParams` is a `Promise`. Always `await searchParams` before accessing properties.

---

## 12. File Structure

```
app/
  (app)/              Auth-protected pages (layout wraps all with auth check)
    dashboard/        Overview + KPIs + upcoming posts
    upload/           Composer (upload, caption, scheduling, format picker)
    schedule/         Calendar + content planning
    insights/         Analytics
    projects/         Campaign management
    accounts/         Connect social accounts
    team/             Team management
    settings/         Account settings (placeholder)
    sidebar.tsx       Sidebar navigation
    layout.tsx        Protected layout (auth check + sidebar)
  api/                Route Handlers (REST API)
    post/             CRUD posts
    upload/           Media upload + compression
    auth/             login / register / logout / session
    zernio/           connect accounts, publish, insights
    meta/             Meta OAuth callback
  login/              Login page
  register/           Register page
  globals.css         All CSS (design system, animations, components)
  layout.tsx          Root layout
lib/
  db.ts               SQLite schema + getDb() singleton + TypeScript types
  auth.ts             JWT sessions (getCurrentUser, createSession, etc.)
  compression.ts      FFmpeg + Sharp compression pipelines
  scheduler.ts        node-cron poller (checks scheduled posts every 60s)
  social/
    index.ts          publishPost() dispatcher
    zernio.ts         Zernio API client + TypeScript types
    platform-formats.ts  PLATFORM_FORMATS constant + toZernioSpecific()
    insights.ts       Performance data fetching
components/
  ui/
    icons.tsx         SVG icon system (Icon component, ~30 icons)
    platform-logos.tsx  PlatformLogo component + PLATFORM_COLOR map
data/                 Runtime data (gitignored)
  hisocial.db         SQLite database
  uploads/            Raw uploaded files
  compressed/         FFmpeg/Sharp compressed output
instrumentation.ts    Next.js instrumentation hook — starts scheduler
```

---

## 13. Contact & Access

| Resource | Details |
|---|---|
| **Owner** | Maraouan Malaba — office@hisocial.at |
| **Meta App** | developers.facebook.com/apps/940087908782876 — request access from owner |
| **Zernio Workspace** | app.zernio.io — owner can add team members |
| **GitHub** | github.com/MaroauanMalaba/BKC-HiSocial-Social_Publishing |

To get access as a developer:
1. Contact Maraouan → he adds you as Tester/Developer in the Meta App
2. Contact Maraouan → he invites you to the Zernio workspace so you can get an API key
3. You'll need ngrok locally for Instagram/Facebook testing
