-- Drop the old users table and recreate with clerk_id as primary key
-- WARNING: this deletes all existing user rows. Fine for Phase 1 dev data.

DROP TABLE IF EXISTS collaborators;
DROP TABLE IF EXISTS op_log;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    clerk_id    TEXT PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL DEFAULT 'Untitled',
    owner_id    TEXT REFERENCES users(clerk_id) ON DELETE CASCADE,
    content     JSONB NOT NULL DEFAULT '{"ops":[{"insert":"\n"}]}',
    revision    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE collaborators (
    doc_id      UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id     TEXT REFERENCES users(clerk_id) ON DELETE CASCADE,
    permission  TEXT CHECK (permission IN ('read', 'edit')) DEFAULT 'edit',
    PRIMARY KEY (doc_id, user_id)
);

CREATE TABLE op_log (
    id          BIGSERIAL PRIMARY KEY,
    doc_id      UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id     TEXT REFERENCES users(clerk_id),
    revision    INTEGER NOT NULL,
    op          JSONB NOT NULL,
    applied_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON op_log (doc_id, revision);
CREATE INDEX ON documents (owner_id);
