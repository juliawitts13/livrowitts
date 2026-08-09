-- ================================================================
-- ADMINISTRAÇÃO: membros do projeto + sugestões de revisão
-- Rode este arquivo no SQL Editor do Supabase (Dashboard > SQL Editor)
-- ================================================================

CREATE TABLE IF NOT EXISTS project_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'revisor' CHECK (role IN ('autor','revisor')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suggestions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id  UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL DEFAULT '',
  excerpt     TEXT NOT NULL,          -- trecho original selecionado
  proposal    TEXT NOT NULL,          -- texto sugerido
  comment     TEXT,                   -- observação opcional
  status      TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','recusada')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suggestions_chapter ON suggestions(chapter_id);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions     ENABLE ROW LEVEL SECURITY;

-- Mesmo padrão anônimo usado nas demais tabelas do app estático
CREATE POLICY "project_members_anon_all" ON project_members
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "suggestions_anon_all" ON suggestions
  FOR ALL USING (true) WITH CHECK (true);
