import mammoth from 'mammoth'
import { supabase } from '../../lib/supabase'
import { appStore } from '../../store/app.store'
import { createChapter, upsertChapter } from '../../services/chapters.service'
import { upsertCharacter } from '../../services/characters.service'
import { upsertLocation } from '../../services/locations.service'
import { upsertTimelineEvent } from '../../services/timeline.service'

interface ImportedData {
  chapters: Array<{
    chapter_number: number
    title: string
    content: string
    status: string
    word_count: number
  }>
  characters: Array<{
    name: string
    short_name?: string
    role?: string
    description?: string
    status?: string
  }>
  locations: Array<{
    name: string
    description?: string
    thumb_emoji?: string
  }>
  timeline_events: Array<{
    title: string
    description?: string
    in_world_date?: string
    is_highlight?: boolean
  }>
}

export function showImportWordModal(): void {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.id = 'import-word-overlay'
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:560px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div style="font-size:16px;font-weight:700;color:var(--text);">📄 Importar do Word</div>
        <button class="btn modal-close" id="import-close" style="padding:4px 10px;font-size:14px;">✕</button>
      </div>

      <div id="import-step-upload">
        <div style="font-size:13px;color:var(--text-2);margin-bottom:16px;line-height:1.6;">
          Faça o upload do seu arquivo <strong>.docx</strong>. A IA vai ler o texto e extrair automaticamente
          capítulos, personagens, locais e eventos para o projeto atual.
        </div>

        <label id="import-drop-zone"
          style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;
                 border:2px dashed var(--border);border-radius:12px;padding:36px;cursor:pointer;
                 transition:border-color 0.15s;min-height:140px;">
          <div style="font-size:36px;">📁</div>
          <div style="font-size:14px;font-weight:600;color:var(--text);">Clique ou arraste seu arquivo .docx aqui</div>
          <div style="font-size:12px;color:var(--text-3);">Somente arquivos .docx do Microsoft Word</div>
          <input type="file" id="import-file-input" accept=".docx" style="display:none;" />
        </label>

        <div id="import-file-name" style="font-size:12px;color:var(--accent);margin-top:10px;display:none;"></div>

        <div id="import-error" style="color:#C62828;font-size:12px;margin-top:10px;display:none;"></div>

        <div style="display:flex;justify-content:flex-end;margin-top:20px;gap:10px;">
          <button class="btn" id="import-cancel">Cancelar</button>
          <button class="btn btn-primary" id="import-analyze" disabled>Analisar com IA →</button>
        </div>
      </div>

      <div id="import-step-loading" style="display:none;text-align:center;padding:40px 0;">
        <div style="font-size:36px;margin-bottom:16px;">🤖</div>
        <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:8px;">Analisando seu texto...</div>
        <div style="font-size:13px;color:var(--text-3);" id="import-progress-msg">Extraindo texto do Word...</div>
        <div style="margin-top:20px;height:4px;background:var(--surface-2);border-radius:4px;overflow:hidden;">
          <div id="import-progress-bar" style="height:100%;width:0%;background:var(--accent);border-radius:4px;transition:width 0.4s;"></div>
        </div>
      </div>

      <div id="import-step-review" style="display:none;">
        <div style="font-size:13px;color:var(--text-2);margin-bottom:16px;">
          Revise o que será importado. Desmarque o que não quiser.
        </div>
        <div id="import-review-content" style="max-height:360px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;"></div>
        <div id="import-save-error" style="color:#C62828;font-size:12px;margin-top:10px;display:none;"></div>
        <div style="display:flex;justify-content:space-between;margin-top:20px;gap:10px;">
          <button class="btn" id="import-back">← Voltar</button>
          <button class="btn btn-primary" id="import-save">Importar para o projeto ✓</button>
        </div>
      </div>

      <div id="import-step-done" style="display:none;text-align:center;padding:32px 0;">
        <div style="font-size:40px;margin-bottom:12px;">✅</div>
        <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px;">Importação concluída!</div>
        <div style="font-size:13px;color:var(--text-2);" id="import-done-msg"></div>
        <button class="btn btn-primary" id="import-finish" style="margin-top:20px;">Fechar</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  const project = appStore.getState().currentProject
  if (!project) {
    alert('Abra um projeto primeiro.')
    overlay.remove()
    return
  }

  let extractedText = ''
  let importedData: ImportedData | null = null

  // Close handlers
  overlay.querySelector('#import-close')!.addEventListener('click', () => overlay.remove())
  overlay.querySelector('#import-cancel')!.addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })

  // File input
  const fileInput = overlay.querySelector('#import-file-input') as HTMLInputElement
  const dropZone  = overlay.querySelector('#import-drop-zone') as HTMLLabelElement
  const analyzeBtn = overlay.querySelector('#import-analyze') as HTMLButtonElement
  const fileNameEl = overlay.querySelector('#import-file-name') as HTMLElement

  function onFileSelected(file: File | null) {
    if (!file) return
    if (!file.name.endsWith('.docx')) {
      showError('Por favor selecione um arquivo .docx')
      return
    }
    fileNameEl.textContent = `✓ ${file.name}`
    fileNameEl.style.display = 'block'
    analyzeBtn.disabled = false
    dropZone.style.borderColor = 'var(--accent)'
    ;(analyzeBtn as HTMLButtonElement & { _file: File })._file = file
  }

  fileInput.addEventListener('change', () => onFileSelected(fileInput.files?.[0] ?? null))

  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent)' })
  dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = 'var(--border)' })
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    onFileSelected(e.dataTransfer?.files?.[0] ?? null)
  })

  function showError(msg: string) {
    const el = overlay.querySelector('#import-error') as HTMLElement
    el.textContent = msg
    el.style.display = 'block'
  }

  function setProgress(pct: number, msg: string) {
    const bar = overlay.querySelector('#import-progress-bar') as HTMLElement
    const txt = overlay.querySelector('#import-progress-msg') as HTMLElement
    if (bar) bar.style.width = `${pct}%`
    if (txt) txt.textContent = msg
  }

  function switchStep(step: 'upload' | 'loading' | 'review' | 'done') {
    ;['upload','loading','review','done'].forEach(s => {
      const el = overlay.querySelector(`#import-step-${s}`) as HTMLElement
      if (el) el.style.display = s === step ? 'block' : 'none'
    })
  }

  // Analyze
  analyzeBtn.addEventListener('click', async () => {
    const file = (analyzeBtn as HTMLButtonElement & { _file?: File })._file
    if (!file) return

    switchStep('loading')
    setProgress(10, 'Extraindo texto do Word...')

    try {
      // Extract text from .docx
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      extractedText = result.value
      setProgress(35, 'Enviando para análise da IA...')

      // Call Edge Function
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada. Faça login novamente.')

      setProgress(50, 'A IA está lendo seu texto (pode levar 30s)...')

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-from-word`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ text: extractedText, projectId: project.id }),
        }
      )

      setProgress(90, 'Processando resultado...')
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Erro desconhecido')

      importedData = body.data as ImportedData
      setProgress(100, 'Pronto!')

      renderReview(importedData)
      switchStep('review')

    } catch (err) {
      switchStep('upload')
      showError(String(err))
    }
  })

  function renderReview(data: ImportedData) {
    const container = overlay.querySelector('#import-review-content') as HTMLElement

    const section = (emoji: string, title: string, count: number, key: string, items: string[]) => {
      if (items.length === 0) return ''
      return `
        <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;">
          <div style="background:var(--surface-2);padding:10px 14px;display:flex;align-items:center;justify-content:space-between;">
            <div style="font-size:13px;font-weight:600;color:var(--text);">${emoji} ${title} <span style="color:var(--text-3);font-weight:400;">(${count})</span></div>
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-2);cursor:pointer;">
              <input type="checkbox" class="import-section-toggle" data-key="${key}" checked /> Importar todos
            </label>
          </div>
          <div style="padding:10px 14px;display:flex;flex-direction:column;gap:6px;">
            ${items.map((item, i) => `
              <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;">
                <input type="checkbox" class="import-item-check" data-key="${key}" data-index="${i}" checked style="margin-top:2px;flex-shrink:0;" />
                <span style="font-size:12px;color:var(--text-2);line-height:1.5;">${item}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `
    }

    container.innerHTML = [
      section('📚', 'Capítulos', data.chapters?.length ?? 0, 'chapters',
        (data.chapters ?? []).map(c => `<strong>Cap. ${c.chapter_number}</strong> — ${c.title} (~${c.word_count} palavras)`)),
      section('👤', 'Personagens', data.characters?.length ?? 0, 'characters',
        (data.characters ?? []).map(c => `<strong>${c.name}</strong>${c.role ? ` · ${c.role}` : ''}`)),
      section('📍', 'Locais', data.locations?.length ?? 0, 'locations',
        (data.locations ?? []).map(l => `<strong>${l.name}</strong>${l.description ? ` — ${l.description.slice(0, 60)}…` : ''}`)),
      section('📅', 'Linha do Tempo', data.timeline_events?.length ?? 0, 'timeline',
        (data.timeline_events ?? []).map(e => `<strong>${e.title}</strong>${e.in_world_date ? ` · ${e.in_world_date}` : ''}`)),
    ].join('')

    // Section toggle
    container.querySelectorAll('.import-section-toggle').forEach(toggle => {
      toggle.addEventListener('change', () => {
        const key = (toggle as HTMLInputElement).dataset.key
        const checked = (toggle as HTMLInputElement).checked
        container.querySelectorAll(`.import-item-check[data-key="${key}"]`).forEach(item => {
          (item as HTMLInputElement).checked = checked
        })
      })
    })
  }

  overlay.querySelector('#import-back')!.addEventListener('click', () => switchStep('upload'))

  overlay.querySelector('#import-save')!.addEventListener('click', async () => {
    if (!importedData) return
    const saveBtn = overlay.querySelector('#import-save') as HTMLButtonElement
    const saveErr = overlay.querySelector('#import-save-error') as HTMLElement
    saveBtn.disabled = true
    saveBtn.textContent = 'Importando...'
    saveErr.style.display = 'none'

    try {
      const checkedIndexes = (key: string) =>
        Array.from(overlay.querySelectorAll<HTMLInputElement>(`.import-item-check[data-key="${key}"]:checked`))
          .map(el => parseInt(el.dataset.index!))

      const chapIdxs  = checkedIndexes('chapters')
      const charIdxs  = checkedIndexes('characters')
      const locIdxs   = checkedIndexes('locations')
      const tlIdxs    = checkedIndexes('timeline')

      let saved = { chapters: 0, characters: 0, locations: 0, events: 0 }

      for (const i of chapIdxs) {
        const c = importedData.chapters[i]
        const created = await createChapter(project.id, null, c.chapter_number, c.title)
        await upsertChapter({
          id: created.id,
          content: c.content,
          word_count: c.word_count ?? 0,
          status: (c.status === 'writing' ? 'draft' : c.status as 'draft' | 'review' | 'done' | 'outline') ?? 'draft',
        })
        saved.chapters++
      }

      for (const i of charIdxs) {
        const c = importedData.characters[i]
        await upsertCharacter({
          project_id: project.id,
          name: c.name,
          short_name: c.short_name ?? null,
          role: c.role ?? null,
          description: c.description ?? null,
          status: (c.status as 'alive' | 'dead' | 'unknown' | 'missing') ?? 'alive',
        })
        saved.characters++
      }

      for (const i of locIdxs) {
        const l = importedData.locations[i]
        await upsertLocation({
          project_id: project.id,
          name: l.name,
          description: l.description ?? null,
          thumb_emoji: l.thumb_emoji ?? '📍',
          thumb_gradient: 'linear-gradient(135deg,#6B5FE4,#9B8FF8)',
        })
        saved.locations++
      }

      for (const i of tlIdxs) {
        const e = importedData.timeline_events[i]
        await upsertTimelineEvent({
          project_id: project.id,
          title: e.title,
          description: e.description ?? null,
          in_world_date: e.in_world_date ?? null,
          is_highlight: e.is_highlight ?? false,
          sort_order: i,
        })
        saved.events++
      }

      const doneMsg = overlay.querySelector('#import-done-msg') as HTMLElement
      doneMsg.innerHTML = [
        saved.chapters  ? `📚 ${saved.chapters} capítulos`    : '',
        saved.characters? `👤 ${saved.characters} personagens` : '',
        saved.locations ? `📍 ${saved.locations} locais`       : '',
        saved.events    ? `📅 ${saved.events} eventos`         : '',
      ].filter(Boolean).join(' · ') + ' importados com sucesso.'

      switchStep('done')
      document.dispatchEvent(new CustomEvent('story-os:import-complete'))

    } catch (err) {
      saveErr.textContent = `Erro ao salvar: ${String(err)}`
      saveErr.style.display = 'block'
      saveBtn.disabled = false
      saveBtn.textContent = 'Importar para o projeto ✓'
    }
  })

  overlay.querySelector('#import-finish')!.addEventListener('click', () => overlay.remove())
}
