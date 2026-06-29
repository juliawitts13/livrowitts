-- ================================================================
-- Story OS — Schema Principal
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================================================
-- PROFILES (extensão de auth.users)
-- ================================================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT NOT NULL DEFAULT '',
  avatar_color    TEXT NOT NULL DEFAULT 'linear-gradient(135deg,#6B5FE4,#9B8FF8)',
  plan            TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','team')),
  daily_word_goal INTEGER NOT NULL DEFAULT 2000,
  editor_font     TEXT NOT NULL DEFAULT 'Georgia',
  theme           TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light','dark')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- PROJECTS
-- ================================================================
CREATE TABLE projects (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL,
  subtitle                TEXT,
  description             TEXT,
  category                TEXT NOT NULL DEFAULT 'Livros'
                          CHECK (category IN ('Livros','Acadêmico','Outros')),
  project_type            TEXT NOT NULL DEFAULT 'book'
                          CHECK (project_type IN ('book','academic','other')),
  cover_emoji             TEXT NOT NULL DEFAULT '📖',
  cover_gradient          TEXT NOT NULL DEFAULT 'linear-gradient(135deg,#6B5FE4,#9B8FF8)',
  cover_image_url         TEXT,
  genre                   TEXT,
  subgenres               TEXT[],
  language                TEXT NOT NULL DEFAULT 'pt-BR',
  status                  TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','archived','completed')),
  target_word_count       INTEGER,
  total_chapters_planned  INTEGER,
  sort_order              INTEGER NOT NULL DEFAULT 0,
  metadata                JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_category ON projects(owner_id, category);

-- ================================================================
-- ACTS (Ato I, Ato II, Ato III)
-- ================================================================
CREATE TABLE acts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_acts_project ON acts(project_id, sort_order);

-- ================================================================
-- CHAPTERS
-- ================================================================
CREATE TABLE chapters (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  act_id              UUID REFERENCES acts(id) ON DELETE SET NULL,
  chapter_number      INTEGER NOT NULL,
  title               TEXT NOT NULL DEFAULT 'Capítulo sem título',
  content             TEXT NOT NULL DEFAULT '',
  word_count          INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','review','done','outline')),
  pov_character_id    UUID,
  location_id         UUID,
  synopsis            TEXT,
  notes               TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_edited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, chapter_number)
);

CREATE INDEX idx_chapters_project ON chapters(project_id, sort_order);
CREATE INDEX idx_chapters_act ON chapters(act_id);
CREATE INDEX idx_chapters_status ON chapters(project_id, status);
CREATE INDEX idx_chapters_search ON chapters USING gin(
  to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(notes,''))
);

-- ================================================================
-- WRITING SESSIONS
-- ================================================================
CREATE TABLE writing_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_id    UUID REFERENCES chapters(id) ON DELETE SET NULL,
  words_written INTEGER NOT NULL DEFAULT 0,
  session_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_date ON writing_sessions(user_id, session_date DESC);
CREATE INDEX idx_sessions_project ON writing_sessions(project_id, session_date DESC);

-- ================================================================
-- CHARACTERS
-- ================================================================
CREATE TABLE characters (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  short_name      TEXT,
  initials        TEXT,
  role            TEXT,
  role_type       TEXT CHECK (role_type IN ('protagonist','antagonist','supporting','minor','pov')),
  is_pov          BOOLEAN NOT NULL DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'alive'
                  CHECK (status IN ('alive','dead','unknown','missing')),
  age             INTEGER,
  nationality     TEXT,
  occupation      TEXT,
  languages       TEXT[],
  description     TEXT,
  physical_desc   TEXT,
  personality     TEXT,
  goals           TEXT,
  fears           TEXT,
  virtues         TEXT,
  flaws           TEXT,
  arc_notes       TEXT,
  notes           TEXT,
  avatar_color    TEXT NOT NULL DEFAULT 'linear-gradient(135deg,#6B5FE4,#9B8FF8)',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_characters_project ON characters(project_id, sort_order);
CREATE INDEX idx_characters_search ON characters USING gin(
  to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(description,''))
);

-- ================================================================
-- CHARACTER ARC STAGES
-- ================================================================
CREATE TABLE character_arc_stages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  act_id        UUID REFERENCES acts(id) ON DELETE SET NULL,
  stage_label   TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'planned'
                CHECK (status IN ('planned','in_progress','written')),
  accent_color  TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_arc_stages_character ON character_arc_stages(character_id, sort_order);

-- ================================================================
-- CHARACTER ARC POINTS (emotional arc graph)
-- ================================================================
CREATE TABLE character_arc_points (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id    UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  chapter_id      UUID REFERENCES chapters(id) ON DELETE SET NULL,
  chapter_number  INTEGER,
  emotional_value NUMERIC(4,2) NOT NULL CHECK (emotional_value BETWEEN 0 AND 100),
  label           TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_arc_points_character ON character_arc_points(character_id, sort_order);

-- ================================================================
-- CHARACTER RELATIONSHIPS
-- ================================================================
CREATE TABLE character_relationships (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  character_a_id      UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  character_b_id      UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  relationship_type   TEXT NOT NULL,
  relationship_label  TEXT,
  description         TEXT,
  strength            TEXT DEFAULT 'medium'
                      CHECK (strength IN ('weak','medium','strong')),
  sentiment           TEXT DEFAULT 'neutral'
                      CHECK (sentiment IN ('positive','negative','neutral','complex')),
  style_color         TEXT,
  style_dashed        BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (character_a_id <> character_b_id)
);

CREATE INDEX idx_char_rel_project ON character_relationships(project_id);
CREATE INDEX idx_char_rel_a ON character_relationships(character_a_id);
CREATE INDEX idx_char_rel_b ON character_relationships(character_b_id);
CREATE UNIQUE INDEX idx_char_rel_unique ON character_relationships(
  LEAST(character_a_id::text, character_b_id::text),
  GREATEST(character_a_id::text, character_b_id::text)
);

-- ================================================================
-- CHAPTER_CHARACTERS (junction)
-- ================================================================
CREATE TABLE chapter_characters (
  chapter_id    UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  is_pov        BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (chapter_id, character_id)
);

CREATE INDEX idx_cc_character ON chapter_characters(character_id);

-- ================================================================
-- LOCATIONS
-- ================================================================
CREATE TABLE locations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  thumb_emoji     TEXT NOT NULL DEFAULT '🌍',
  thumb_gradient  TEXT NOT NULL DEFAULT 'linear-gradient(135deg,#1a1a2e,#16213e)',
  notes           TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_project ON locations(project_id, sort_order);

-- ================================================================
-- LOCATION_CHARACTERS (junction)
-- ================================================================
CREATE TABLE location_characters (
  location_id   UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  PRIMARY KEY (location_id, character_id)
);

-- ================================================================
-- FK de chapters para characters e locations (criado depois das tabelas)
-- ================================================================
ALTER TABLE chapters
  ADD CONSTRAINT fk_chapter_pov
    FOREIGN KEY (pov_character_id) REFERENCES characters(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_chapter_location
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

-- ================================================================
-- TIMELINE EVENTS
-- ================================================================
CREATE TABLE timeline_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_id    UUID REFERENCES chapters(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  in_world_date TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_future     BOOLEAN NOT NULL DEFAULT FALSE,
  is_highlight  BOOLEAN NOT NULL DEFAULT FALSE,
  accent_color  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timeline_project ON timeline_events(project_id, sort_order);

-- ================================================================
-- TIMELINE_EVENT_CHARACTERS (junction)
-- ================================================================
CREATE TABLE timeline_event_characters (
  event_id      UUID NOT NULL REFERENCES timeline_events(id) ON DELETE CASCADE,
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, character_id)
);

-- ================================================================
-- IDEAS
-- ================================================================
CREATE TABLE ideas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  category    TEXT,
  emoji       TEXT NOT NULL DEFAULT '💡',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ideas_project ON ideas(project_id, created_at DESC);
CREATE INDEX idx_ideas_category ON ideas(project_id, category);

-- ================================================================
-- RESEARCH
-- ================================================================
CREATE TABLE research (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'note'
              CHECK (source_type IN ('pdf','link','video','image','note','book')),
  url         TEXT,
  source_label TEXT,
  emoji       TEXT NOT NULL DEFAULT '📝',
  notes       TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_research_project ON research(project_id, sort_order);

-- ================================================================
-- UNIVERSE CATEGORIES
-- ================================================================
CREATE TABLE universe_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  emoji       TEXT NOT NULL DEFAULT '📖',
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_univcat_project ON universe_categories(project_id, sort_order);

-- ================================================================
-- UNIVERSE ENTRIES
-- ================================================================
CREATE TABLE universe_entries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES universe_categories(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_universe_project ON universe_entries(project_id);
CREATE INDEX idx_universe_category ON universe_entries(category_id);
CREATE INDEX idx_universe_search ON universe_entries USING gin(
  to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(content,''))
);

-- ================================================================
-- GLOSSARY
-- ================================================================
CREATE TABLE glossary (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  term        TEXT NOT NULL,
  definition  TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_glossary_project ON glossary(project_id);
CREATE INDEX idx_glossary_term ON glossary(project_id, lower(term));

-- ================================================================
-- TAGS
-- ================================================================
CREATE TABLE tags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6B5FE4',
  UNIQUE (project_id, name)
);

-- ================================================================
-- TAG ASSIGNMENTS (polimórfico)
-- ================================================================
CREATE TABLE tag_assignments (
  tag_id       UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_type  TEXT NOT NULL CHECK (entity_type IN (
    'chapter','character','location','idea','research','universe_entry'
  )),
  entity_id    UUID NOT NULL,
  PRIMARY KEY (tag_id, entity_type, entity_id)
);

CREATE INDEX idx_tag_assignments_entity ON tag_assignments(entity_type, entity_id);

-- ================================================================
-- USER PROJECT SETTINGS
-- ================================================================
CREATE TABLE user_project_settings (
  user_id                   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id                UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  last_viewed_chapter_id    UUID REFERENCES chapters(id) ON DELETE SET NULL,
  last_active_view          TEXT DEFAULT 'dashboard',
  PRIMARY KEY (user_id, project_id)
);

-- ================================================================
-- VIEW: project_stats (para o Dashboard)
-- ================================================================
CREATE OR REPLACE VIEW project_stats AS
SELECT
  p.id                  AS project_id,
  p.owner_id,
  p.title,
  p.total_chapters_planned,
  p.target_word_count,
  COUNT(DISTINCT ch.id) AS total_chapters,
  COALESCE(SUM(ch.word_count), 0) AS total_words,
  COUNT(DISTINCT ch.id) FILTER (WHERE ch.status = 'done')   AS done_chapters,
  COUNT(DISTINCT ch.id) FILTER (WHERE ch.status = 'draft')  AS draft_chapters,
  COUNT(DISTINCT ch.id) FILTER (WHERE ch.status = 'review') AS review_chapters,
  COUNT(DISTINCT c.id)  AS total_characters,
  COUNT(DISTINCT c.id) FILTER (WHERE c.is_pov) AS pov_characters,
  COUNT(DISTINCT l.id)  AS total_locations,
  COUNT(DISTINCT i.id)  AS total_ideas,
  ROUND(
    100.0 * COUNT(DISTINCT ch.id) FILTER (WHERE ch.status = 'done')
    / NULLIF(p.total_chapters_planned, 0), 1
  ) AS completion_pct
FROM projects p
LEFT JOIN chapters   ch ON ch.project_id = p.id
LEFT JOIN characters c  ON c.project_id  = p.id
LEFT JOIN locations  l  ON l.project_id  = p.id
LEFT JOIN ideas      i  ON i.project_id  = p.id AND NOT i.is_archived
GROUP BY p.id;

-- ================================================================
-- FUNCTION: user_owns_project (helper para RLS)
-- ================================================================
CREATE OR REPLACE FUNCTION user_owns_project(p_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects WHERE id = p_id AND owner_id = auth.uid()
  )
$$;

-- ================================================================
-- FUNCTION: get_writing_streak
-- ================================================================
CREATE OR REPLACE FUNCTION get_writing_streak(
  p_user_id    UUID,
  p_project_id UUID DEFAULT NULL
)
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER AS $$
  WITH dates AS (
    SELECT DISTINCT session_date
    FROM writing_sessions
    WHERE user_id = p_user_id
      AND (p_project_id IS NULL OR project_id = p_project_id)
      AND words_written > 0
    ORDER BY session_date DESC
  ),
  numbered AS (
    SELECT session_date,
           ROW_NUMBER() OVER (ORDER BY session_date DESC) AS rn
    FROM dates
  ),
  groups AS (
    SELECT session_date, rn,
           (session_date - (rn || ' days')::INTERVAL)::DATE AS grp
    FROM numbered
  )
  SELECT COALESCE(COUNT(*)::INTEGER, 0) FROM groups
  WHERE grp = (SELECT grp FROM groups ORDER BY session_date DESC LIMIT 1)
$$;

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects               ENABLE ROW LEVEL SECURITY;
ALTER TABLE acts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters               ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters             ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_arc_stages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_arc_points   ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_characters     ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_characters    ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_event_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE research               ENABLE ROW LEVEL SECURITY;
ALTER TABLE universe_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE universe_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossary               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_assignments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_project_settings  ENABLE ROW LEVEL SECURITY;

-- Perfil próprio
CREATE POLICY "profiles_owner" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Projetos próprios
CREATE POLICY "projects_owner" ON projects
  FOR ALL USING (owner_id = auth.uid());

-- Tabelas com project_id direto
CREATE POLICY "acts_owner" ON acts
  FOR ALL USING (user_owns_project(project_id));
CREATE POLICY "chapters_owner" ON chapters
  FOR ALL USING (user_owns_project(project_id));
CREATE POLICY "characters_owner" ON characters
  FOR ALL USING (user_owns_project(project_id));
CREATE POLICY "character_relationships_owner" ON character_relationships
  FOR ALL USING (user_owns_project(project_id));
CREATE POLICY "locations_owner" ON locations
  FOR ALL USING (user_owns_project(project_id));
CREATE POLICY "timeline_events_owner" ON timeline_events
  FOR ALL USING (user_owns_project(project_id));
CREATE POLICY "ideas_owner" ON ideas
  FOR ALL USING (user_owns_project(project_id));
CREATE POLICY "research_owner" ON research
  FOR ALL USING (user_owns_project(project_id));
CREATE POLICY "universe_categories_owner" ON universe_categories
  FOR ALL USING (user_owns_project(project_id));
CREATE POLICY "universe_entries_owner" ON universe_entries
  FOR ALL USING (user_owns_project(project_id));
CREATE POLICY "glossary_owner" ON glossary
  FOR ALL USING (user_owns_project(project_id));
CREATE POLICY "tags_owner" ON tags
  FOR ALL USING (user_owns_project(project_id));

-- Writing sessions
CREATE POLICY "writing_sessions_owner" ON writing_sessions
  FOR ALL USING (user_id = auth.uid());

-- Tabelas dependentes via join
CREATE POLICY "character_arc_stages_owner" ON character_arc_stages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_id AND user_owns_project(c.project_id)
    )
  );
CREATE POLICY "character_arc_points_owner" ON character_arc_points
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_id AND user_owns_project(c.project_id)
    )
  );
CREATE POLICY "chapter_characters_owner" ON chapter_characters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chapters ch
      WHERE ch.id = chapter_id AND user_owns_project(ch.project_id)
    )
  );
CREATE POLICY "location_characters_owner" ON location_characters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM locations l
      WHERE l.id = location_id AND user_owns_project(l.project_id)
    )
  );
CREATE POLICY "timeline_event_chars_owner" ON timeline_event_characters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM timeline_events te
      WHERE te.id = event_id AND user_owns_project(te.project_id)
    )
  );
CREATE POLICY "tag_assignments_owner" ON tag_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tags t
      WHERE t.id = tag_id AND user_owns_project(t.project_id)
    )
  );
CREATE POLICY "user_project_settings_owner" ON user_project_settings
  FOR ALL USING (user_id = auth.uid());

-- ================================================================
-- TRIGGER: atualizar updated_at automaticamente
-- ================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_chapters
  BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_characters
  BEFORE UPDATE ON characters FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_locations
  BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_timeline_events
  BEFORE UPDATE ON timeline_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_ideas
  BEFORE UPDATE ON ideas FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_research
  BEFORE UPDATE ON research FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_universe_entries
  BEFORE UPDATE ON universe_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_glossary
  BEFORE UPDATE ON glossary FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
-- TRIGGER: criar profile automaticamente ao registrar usuário
-- ================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
