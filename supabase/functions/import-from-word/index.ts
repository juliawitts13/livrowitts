import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return json({ error: 'Sessão inválida' }, 401)

    const { text, projectId } = await req.json()
    if (!text || !projectId) return json({ error: 'text e projectId são obrigatórios' }, 400)

    const excerpt = text.slice(0, 100_000)

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY não configurada no projeto Supabase' }, 500)

    const prompt = `Você é um assistente de organização literária. Analise o texto de um livro ou manuscrito abaixo e extraia as informações no formato JSON especificado.

TEXTO DO MANUSCRITO:
${excerpt}

Retorne APENAS um JSON válido com esta estrutura (sem markdown, sem explicações, sem blocos de código):
{
  "chapters": [
    {
      "chapter_number": 1,
      "title": "Título do capítulo (ou 'Capítulo 1' se não tiver)",
      "content": "Conteúdo HTML do capítulo (parágrafos em <p>)",
      "status": "draft",
      "word_count": 0
    }
  ],
  "characters": [
    {
      "name": "Nome completo",
      "short_name": "Apelido ou primeiro nome",
      "role": "Protagonista / Antagonista / Secundário",
      "description": "Descrição física e de personalidade",
      "status": "alive"
    }
  ],
  "locations": [
    {
      "name": "Nome do local",
      "description": "Descrição do local",
      "thumb_emoji": "🏰"
    }
  ],
  "timeline_events": [
    {
      "title": "Título do evento",
      "description": "Descrição do evento",
      "in_world_date": "Data ou período no mundo da história (ex: 'Ano 1, Primavera')",
      "is_highlight": false
    }
  ]
}

Regras:
- Divida o texto em capítulos respeitando os títulos/divisões existentes
- Se não houver divisões claras, crie capítulos de ~2000 palavras
- Envolva cada parágrafo em <p></p> no campo content
- Calcule word_count como número aproximado de palavras do capítulo
- Extraia apenas personagens que aparecem de forma significativa
- Inclua apenas locais claramente descritos no texto
- Para timeline, identifique eventos narrativos importantes em ordem cronológica`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      return json({ error: `Erro Anthropic: ${err}` }, 502)
    }

    const anthropicData = await anthropicRes.json()
    const raw = anthropicData.content?.[0]?.text ?? '{}'
    const extracted = JSON.parse(raw)

    return json({ ok: true, data: extracted }, 200)

  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
