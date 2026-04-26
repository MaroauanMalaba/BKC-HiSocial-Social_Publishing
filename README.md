# HiSocial Studio — Social Publishing Platform

Internes Tool von **BKC Consulting / HiSocial**: Medien hochladen → automatisch komprimieren → sofort oder zeitgeplant auf **Instagram**, **Facebook**, **TikTok**, **YouTube** und **LinkedIn** posten.

Läuft lokal, eine Datei für alles (SQLite + lokales Filesystem), kein Cloud-Backend nötig.

---

## Stack

| Layer | Technologie |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + Tailwind 4 |
| Datenbank | SQLite via `better-sqlite3` |
| Video | FFmpeg via `fluent-ffmpeg` (H.264 / AAC / 1080p / faststart) |
| Bild | Sharp (mozjpeg, max 1920px) |
| Scheduling | `node-cron` (1-Minuten-Tick, läuft in-process) |
| Auth | `jose` (JWT) + `bcrypt` |
| Publishing | **Zernio API** (OAuth + Multi-Platform Publishing) |
| Meta OAuth | Meta Graph API (Instagram, Facebook) |

---

## Setup für neue Entwickler

### 1. Repository klonen

```bash
git clone https://github.com/MaroauanMalaba/BKC-HiSocial-Social_Publishing.git
cd BKC-HiSocial-Social_Publishing
bun install
```

### 2. Environment Variables anlegen

```bash
cp .env.example .env.local
```

Dann `.env.local` befüllen:

```env
AUTH_SECRET=<openssl rand -hex 32>
APP_BASE_URL=http://localhost:3000
PUBLIC_BASE_URL=<ngrok URL für lokale Meta-Integration>
META_APP_ID=940087908782876
META_APP_SECRET=<vom Meta Developer Dashboard holen — siehe unten>
ZERNIO_API_KEY=<vom Zernio Dashboard holen — siehe unten>
```

### 3. Starten

```bash
bun dev
```

App läuft auf **http://localhost:3000** — erster Request legt die SQLite-DB automatisch an.

---

## Credentials — wo sie herkommen

### Meta App (Instagram + Facebook)

- **App-ID:** `940087908782876` — bereits in `.env.example` eingetragen, nicht ändern
- **App Secret:**
  1. → [developers.facebook.com](https://developers.facebook.com/apps/940087908782876)
  2. → App Settings → Basic → App Secret → „Show"
  3. Secret in `META_APP_SECRET` eintragen
- **App-Name:** HiSocial Studio (BKC Consulting)
- **Zugang anfordern:** Maraouan Malaba (office@hisocial.at) ist App-Admin → kann weitere Entwickler als Tester/Admin hinzufügen

### Zernio API (Multi-Platform Publishing)

- **Dashboard:** [app.zernio.io](https://app.zernio.io)
- **API Key:** Settings → API Keys → Key für den BKC/HiSocial Workspace
- **Zugang:** Maraouan Malaba (office@hisocial.at) ist Workspace-Owner

### ngrok (für lokale Meta-Integration)

Meta benötigt eine öffentlich erreichbare URL zum Abrufen von Media-Dateien.  
Für lokale Entwicklung:

```bash
ngrok http 3000
# Gibt eine URL aus: https://abc123.ngrok.io
# Diese URL als PUBLIC_BASE_URL in .env.local eintragen
```

TikTok, YouTube und LinkedIn funktionieren auch ohne ngrok (direkter File-Upload).

---

## Ordnerstruktur

```
app/
  (app)/           Auth-geschützte Pages
    dashboard/     Übersicht + KPIs
    upload/        Composer (Upload, Caption, Scheduling)
    schedule/      Kalender + Content-Planung
    insights/      Analytics
    projects/      Kampagnen-Verwaltung
    accounts/      Social Accounts verbinden
    team/          Team-Verwaltung
    settings/      Account-Einstellungen
  api/             Route Handlers
  login/           Login Page
  register/        Register Page
lib/
  db.ts            SQLite Schema + Typen
  auth.ts          JWT Sessions
  compression.ts   FFmpeg + Sharp Pipeline
  scheduler.ts     node-cron Poller (Scheduled Posts)
  social/
    index.ts       publishPost() Dispatcher
    zernio.ts      Zernio API Client
    platform-formats.ts  Formate pro Plattform (Reel, Story, Short ...)
    insights.ts    Performance-Daten
components/
  ui/
    icons.tsx      SVG Icon-System
    platform-logos.tsx  Plattform-Logos + Farben
data/              Runtime: DB, Uploads, Compressed (gitignored)
```

---

## Wichtig zu wissen

- **Instagram + Facebook** brauchen `PUBLIC_BASE_URL` (öffentliche URL) damit Meta die Media-Dateien abrufen kann. Lokal → ngrok verwenden.
- **Der Scheduler** läuft in-process über `instrumentation.ts` — startet automatisch mit `next dev` / `next start`.
- **Auth Tokens** werden in SQLite gespeichert (Single-Tenant, lokal). Kein separates Token-Store nötig.
- **DB-Migrationen** laufen automatisch beim ersten `getDb()`-Aufruf (ALTER TABLE IF NOT EXISTS Pattern).
- **Neue Plattform-Formate** → `lib/social/platform-formats.ts` erweitern.

---

## Kontakt

**Maraouan Malaba** — office@hisocial.at  
App-Admin (Meta), Workspace-Owner (Zernio), GitHub-Owner
