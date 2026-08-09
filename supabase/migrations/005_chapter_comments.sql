-- ================================================================
-- COMENTÁRIOS ancorados em trechos do capítulo
-- (já aplicado no projeto via MCP em 2026-08-09)
-- ================================================================

CREATE TABLE IF NOT EXISTS chapter_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id  UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  anchor      TEXT NOT NULL,           -- id do span .cmt dentro do conteúdo
  member_name TEXT NOT NULL DEFAULT '',
  excerpt     TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL,
  resolved    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chapter_comments_chapter ON chapter_comments(chapter_id);

ALTER TABLE chapter_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chapter_comments_anon_all" ON chapter_comments
  FOR ALL USING (true) WITH CHECK (true);
