CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL DEFAULT 'Untitled',
    owner_id    UUID REFERENCES users(id) ON DELETE CASCADE,
    content     JSONB NOT NULL DEFAULT '{"ops":[{"insert":"\n"}]}',
    revision    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collaborators (
    doc_id      UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    permission  TEXT CHECK (permission IN ('read', 'edit')) DEFAULT 'edit',
    PRIMARY KEY (doc_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents (owner_id);
