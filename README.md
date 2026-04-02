# InboxPilot

**Stop losing deals because you forgot to follow up.**

InboxPilot is an AI-powered email assistant that triages your Gmail inbox, surfaces what actually needs your attention, and drafts replies in your voice — so you spend less time managing email and more time on the work that matters.

---

## The Problem

Busy founders, account managers, and client-facing teams miss follow-ups, lose track of waiting threads, and spend hours each week just figuring out what to respond to next. Important emails get buried. Deals slip because nobody chased.

## What InboxPilot Does

- **Prioritizes your inbox** — AI scores every thread by urgency, sender importance, deadlines, and how long it's been waiting. Urgent items surface to the top automatically.
- **Detects what needs a reply** — No more scanning through hundreds of emails. See only the threads where someone is waiting on you.
- **Tracks follow-ups** — Automatically detects deadlines, commitments you made, and threads where the other side hasn't responded in 3+ days.
- **Drafts replies in your voice** — Generates reply suggestions that match your writing style, ready to review and send with one click in Gmail.
- **Daily morning brief** — A concise email summary delivered at 7am with your top priorities for the day.

Everything is **read-only by default**. InboxPilot never sends email without your explicit action.

---

## Key Features

| Feature | Description |
|---|---|
| Smart prioritization | 8-factor scoring: VIP senders, deadlines, urgency language, recency, financial context |
| Needs Reply view | Threads with open questions directed at you, detected by AI |
| Waiting on Others | Follow up automatically when no reply after 3 days |
| Follow-up tracking | Deadlines, promises made, commitments detected from email content |
| AI draft replies | Context-aware drafts styled to match your previous emails |
| Daily brief | Morning digest of your top 5 priorities via email |
| Gmail push sync | Real-time inbox updates via Gmail Pub/Sub webhooks |
| Full-text + semantic search | Find any thread by keyword or meaning |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Auth | Clerk |
| Database | Supabase (PostgreSQL + pgvector) |
| Background Jobs | BullMQ + Redis |
| AI | OpenAI GPT-4o / GPT-4o-mini |
| Email | Resend |
| Deployment | Vercel (web) + Railway (workers) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Clerk account
- A Google Cloud project with Gmail API enabled
- An OpenAI API key
- A Redis instance (Upstash or Railway)

### 1. Clone and install

```bash
git clone https://github.com/alijendoubi/AllAI.git
cd AllAI
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in all values in `.env.local`. See `.env.local.example` for the full list.

**Required keys:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` — from Clerk dashboard
- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` — from Google Cloud Console (OAuth 2.0)
- `OPENAI_API_KEY` — from OpenAI platform
- `REDIS_URL` — Redis connection string
- `TOKEN_ENCRYPTION_KEY` — generate with `openssl rand -hex 32`

### 3. Set up the database

Run the migration against your Supabase project:

```bash
# Via Supabase CLI
supabase db push

# Or paste supabase/migrations/001_initial_schema.sql directly into the Supabase SQL editor
```

### 4. Run locally

```bash
# Terminal 1 — Next.js dev server
npm run dev

# Terminal 2 — Background workers (requires Redis)
npm run worker:dev
```

Open [http://localhost:3000](http://localhost:3000), connect your Gmail account, and your inbox will start syncing within seconds.

---

## Deployment

### Vercel (web app + API)

1. Import the repo into Vercel
2. Add all environment variables from `.env.local.example`
3. Deploy — cron jobs in `vercel.json` are picked up automatically

### Railway (background workers)

1. Create a new Railway project
2. Add a service pointed at this repo with start command: `npm run worker`
3. Add the same environment variables (Redis, Supabase, OpenAI)
4. Add a Railway Redis plugin and set `REDIS_URL`

---

## Project Structure

```
├── app/                    # Next.js App Router pages and API routes
│   ├── (dashboard)/        # Dashboard views (urgent, needs reply, waiting, etc.)
│   ├── api/                # API routes (threads, sync, webhooks, cron)
│   └── (auth)/             # Sign in / sign up pages
├── components/
│   ├── dashboard/          # ThreadList, ThreadCard, ThreadPanel, DraftReply, Sidebar
│   └── onboarding/         # ConnectGmail, SyncProgress
├── lib/
│   ├── ai/                 # OpenAI integration, prompts, Zod schemas
│   ├── gmail/              # Gmail API client, parser, sync orchestration
│   ├── queue/              # BullMQ jobs and workers
│   ├── scoring/            # Priority scoring engine
│   ├── follow-ups/         # Follow-up detection rules
│   └── db/                 # Supabase client and query functions
├── workers/                # Standalone worker process entry point
├── supabase/migrations/    # Database schema
└── __tests__/              # Unit tests (43 passing)
```

---

## Security

- OAuth tokens are encrypted at rest using AES-256-GCM before database storage
- Supabase Row Level Security (RLS) is enabled on all tables
- The service role key is never exposed to the client
- Gmail access is read-only — InboxPilot cannot send, delete, or modify emails
- All API routes require authentication via Clerk

---

## License

MIT
