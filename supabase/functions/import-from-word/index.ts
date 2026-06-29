import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Authenticate user
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

    // Limit text size to avoid huge OpenAI costs (~100k chars ≈ 25k tokens)
    const excerpt = text.slice(0, 100_000)

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) return json({ error: 'OPENAI_API_KEY não configurada no projeto Supabase' }, 500)

    const prompt = `Você é um assistente de organização literária. Analise o texto de um livro ou manuscrito abaixo e extraia as informações no formato JSON especificado.

TEXTO DO MANUSCRITO:
${excerpt}

Retorne APENAS um JSON válido com esta estrutura (sem markdown, sem explicações):
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

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 16000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.text()
      return json({ error: `Erro OpenAI: ${err}` }, 502)
    }

    const openaiData = await openaiRes.json()
    const raw = openaiData.choices?.[0]?.message?.content ?? '{}'
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
