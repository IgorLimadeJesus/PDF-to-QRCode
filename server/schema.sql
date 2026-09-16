CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  token UUID NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
