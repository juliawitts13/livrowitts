-- ================================================================
-- FOTOS: galerias em locais e eventos da linha do tempo
-- (já aplicado no projeto via MCP em 2026-08-09)
-- ================================================================

ALTER TABLE locations       ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]';
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]';

INSERT INTO storage.buckets (id, name, public) VALUES ('fotos','fotos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "fotos_anon_select" ON storage.objects FOR SELECT USING (bucket_id = 'fotos');
CREATE POLICY "fotos_anon_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'fotos');
CREATE POLICY "fotos_anon_delete" ON storage.objects FOR DELETE USING (bucket_id = 'fotos');
