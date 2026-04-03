-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users (mirrors Clerk, extended with app data)
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id   VARCHAR(255) UNIQUE NOT NULL,
  email           VARCHAR(255) NOT NULL,
  display_name    VARCHAR(255),
  timezone        VARCHAR(100) DEFAULT 'UTC',
  preferences     JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);

-- Connected OAuth accounts (Gmail, future Slack)
CREATE TABLE connected_accounts (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider                    VARCHAR(50) NOT NULL,
  provider_account_id         VARCHAR(255) NOT NULL,
  email_address               VARCHAR(255),
  access_token_encrypted      TEXT NOT NULL,
  refresh_token_encrypted     TEXT,
  token_expires_at            TIMESTAMPTZ,
  scopes                      TEXT[],
  history_id                  VARCHAR(100),
  initial_sync_completed_at   TIMESTAMPTZ,
  last_sync_at                TIMESTAMPTZ,
  watch_expiry                TIMESTAMPTZ,
  is_active                   BOOLEAN DEFAULT TRUE,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider, provider_account_id)
);

-- Contacts
CREATE TABLE contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name  VARCHAR(255),
  is_vip        BOOLEAN DEFAULT FALSE,
  vip_reason    VARCHAR(500),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Contact identity resolution (email → contact)
CREATE TABLE contact_identities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id  UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  value       VARCHAR(500) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type, value)
);
CREATE INDEX idx_contact_identities_lookup ON contact_identities(user_id, type, value);

-- Threads (normalized across sources)
CREATE TABLE threads (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connected_account_id    UUID NOT NULL REFERENCES connected_accounts(id),
  external_thread_id      VARCHAR(500) NOT NULL,
  source                  VARCHAR(50) NOT NULL DEFAULT 'gmail',
  subject                 VARCHAR(1000),
  snippet                 TEXT,
  participant_emails      TEXT[],

  -- State machine
  status                  VARCHAR(50) DEFAULT 'open',
  snoozed_until           TIMESTAMPTZ,

  -- AI-derived (denormalized for dashboard query perf)
  priority_score          INTEGER DEFAULT 50,
  priority_label          VARCHAR(20) DEFAULT 'medium',
  needs_reply             BOOLEAN DEFAULT FALSE,
  needs_reply_confidence  FLOAT,
  waiting_on              VARCHAR(20),
  is_stale                BOOLEAN DEFAULT FALSE,
  thread_type             VARCHAR(50),

  -- Timestamps
  first_message_at        TIMESTAMPTZ,
  latest_message_at       TIMESTAMPTZ,
  last_reply_by_me_at     TIMESTAMPTZ,
  last_reply_by_them_at   TIMESTAMPTZ,
  resolved_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(connected_account_id, external_thread_id)
);

CREATE INDEX idx_threads_dashboard ON threads(user_id, status, priority_score DESC, latest_message_at DESC);
CREATE INDEX idx_threads_needs_reply ON threads(user_id, needs_reply, status) WHERE needs_reply = true;
CREATE INDEX idx_threads_waiting ON threads(user_id, waiting_on, status);
CREATE INDEX idx_threads_stale ON threads(user_id, is_stale) WHERE is_stale = true;
CREATE INDEX idx_threads_snoozed ON threads(snoozed_until) WHERE status = 'snoozed';
CREATE INDEX idx_threads_search ON threads USING gin(to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(snippet, '')));

-- Messages
CREATE TABLE messages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id             UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id),
  external_message_id   VARCHAR(500) NOT NULL,
  from_email            VARCHAR(500) NOT NULL,
  from_name             VARCHAR(500),
  to_emails             TEXT[],
  cc_emails             TEXT[],
  subject               VARCHAR(1000),
  body_text             TEXT,
  body_html             TEXT,
  is_outbound           BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at               TIMESTAMPTZ NOT NULL,
  gmail_label_ids       TEXT[],
  attachments_count     INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(thread_id, external_message_id)
);
CREATE INDEX idx_messages_thread ON messages(thread_id, sent_at ASC);
CREATE INDEX idx_messages_from ON messages(user_id, from_email);
CREATE INDEX idx_messages_search ON messages USING gin(to_tsvector('english', coalesce(body_text, '') || ' ' || coalesce(subject, '')));

-- Follow-ups
CREATE TABLE follow_ups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id       UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  type            VARCHAR(50) NOT NULL,
  status          VARCHAR(50) DEFAULT 'pending',
  due_at          TIMESTAMPTZ,
  detected_text   TEXT,
  notes           TEXT,
  ai_confidence   FLOAT,
  created_by      VARCHAR(20) DEFAULT 'ai',
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(thread_id, type)
);
CREATE INDEX idx_follow_ups_dashboard ON follow_ups(user_id, status, due_at ASC);
CREATE INDEX idx_follow_ups_thread ON follow_ups(thread_id);

-- AI summaries
CREATE TABLE ai_summaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  summary_text    TEXT NOT NULL,
  key_points      JSONB DEFAULT '[]',
  unresolved      TEXT,
  embedding       vector(1536),
  model_used      VARCHAR(100),
  prompt_version  VARCHAR(50),
  processed_at    TIMESTAMPTZ DEFAULT NOW(),
  tokens_used     INTEGER,
  UNIQUE(thread_id)
);
CREATE INDEX idx_ai_summaries_embedding ON ai_summaries USING ivfflat (embedding vector_cosine_ops);

-- AI labels (classification outputs)
CREATE TABLE ai_labels (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id               UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  needs_reply             BOOLEAN,
  needs_reply_reason      TEXT,
  needs_reply_confidence  FLOAT,
  waiting_on              VARCHAR(20),
  urgency_score           INTEGER,
  sentiment               VARCHAR(20),
  detected_deadlines      JSONB DEFAULT '[]',
  action_items            JSONB DEFAULT '[]',
  promises_made_by_me     JSONB DEFAULT '[]',
  promises_made_by_them   JSONB DEFAULT '[]',
  topic_tags              TEXT[],
  thread_type             VARCHAR(50),
  model_used              VARCHAR(100),
  processed_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(thread_id)
);

-- Draft reply suggestions
CREATE TABLE action_suggestions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  type            VARCHAR(50) NOT NULL DEFAULT 'draft_reply',
  content         TEXT,
  status          VARCHAR(50) DEFAULT 'pending',
  edited_content  TEXT,
  model_used      VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  acted_on_at     TIMESTAMPTZ
);
CREATE INDEX idx_suggestions_thread ON action_suggestions(thread_id, status);

-- Audit log
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  resource    VARCHAR(100),
  resource_id UUID,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_suggestions ENABLE ROW LEVEL SECURITY;
