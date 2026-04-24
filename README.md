# BKC HiSocial — Social Publishing Platform

Internes Tool von **BKC / HiSocial**: Bilder & Videos hochladen → automatisch komprimieren → sofort oder zeitgeplant auf **Instagram**, **Facebook** und **TikTok** posten.

Läuft lokal, eine Datei für alles (SQLite + local filesystem), kein externer Service nötig.

## Stack

- **Next.js 16** (App Router) + React 19 + Tailwind 4
- **SQLite** (better-sqlite3) für User, Accounts, Media, Posts
- **FFmpeg** (fluent-ffmpeg) für Video-Compression (H.264 / AAC / 1080p / faststart)
- **Sharp** für Bild-Compression (mozjpeg, max 1920px)
- **node-cron** für Scheduled Publishing (1-Minuten-Tick)
- **jose** + bcrypt für Auth

## Setup

```bash
bun install
cp .env.example .env
# AUTH_SECRET mit: openssl rand -hex 32
# PUBLIC_BASE_URL wird nur für IG/FB gebraucht (z.B. ngrok URL)

bun dev
```

App läuft auf **http://localhost:3000** — erster Request legt die SQLite DB an.

## Ordnerstruktur

```
app/               Routes
  (app)/           Auth-protected Pages (Dashboard, Upload, Schedule, Accounts)
  api/             Route Handlers
  login/           Login Page
  register/        Register Page
lib/
  db.ts            SQLite schema + types
  auth.ts          JWT sessions
  storage.ts       File paths for uploads + compressed
  compression.ts   FFmpeg + Sharp Pipeline
  scheduler.ts     node-cron poller
  social/          Publishing Integrationen
    meta.ts        Instagram + Facebook Graph API
    tiktok.ts      TikTok Content Publishing API
    index.ts       Dispatcher + publishPost()
data/              Runtime: db, uploads, compressed (gitignored)
```

## Wichtig zu wissen

- **Instagram + Facebook** brauchen eine öffentlich erreichbare URL für das Media-File. Lokal → `ngrok http 3000` starten und die URL als `PUBLIC_BASE_URL` setzen.
- **TikTok** akzeptiert direkten File-Upload (chunked PUT), braucht kein ngrok.
- Der Scheduler läuft **in Process** über `instrumentation.ts` — startet automatisch mit `next dev`/`next start`.
- Auth Tokens werden unverschlüsselt in SQLite gespeichert (Single-User intern, local-only).

## Nächste Schritte (optional)

- OAuth-Flows statt manuelles Token-Einfügen
- Post-Preview pro Plattform
- Multi-User / Team-Workspaces
- S3-Storage statt local disk
