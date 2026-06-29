import { getProjects, createProject } from '../../services/projects.service'
import { appStore } from '../../store/app.store'
import { PROJECT_CATEGORY_ICONS, GENRES } from '../../lib/constants'
import type { Project } from '../../types/database.types'

export async function renderProjectsHome(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <div class="projects-home">
      <div class="projects-topbar">
        <div>
          <div class="page-title">Meus Projetos</div>
          <div class="page-sub">Escolha um projeto para abrir o workspace</div>
        </div>
        <button class="btn btn-primary" id="btn-new-project">+ Novo Projeto</button>
      </div>
      <div class="projects-content" id="projects-content">
        <div style="color:var(--text-3);font-size:13px;">Carregando projetos...</div>
      </div>
    </div>
  `

  const btn = container.querySelector('#btn-new-project') as HTMLButtonElement
  btn.addEventListener('click', () => showNewProjectWizard(container))

  await loadProjects(container)
}

async function loadProjects(container: HTMLElement): Promise<void> {
  const content = container.querySelector('#projects-content') as HTMLDivElement

  try {
    const projects = await getProjects()
    renderProjectGrid(content, projects)
  } catch {
    content.innerHTML = `<div style="color:var(--text-3);">Erro ao carregar projetos.</div>`
  }
}

function renderProjectGrid(content: HTMLElement, projects: Project[]): void {
  const categories: Array<{ key: 'Livros' | 'Acadêmico' | 'Outros'; label: string; enabled: boolean }> = [
    { key: 'Livros',    label: 'Livros',    enabled: true },
    { key: 'Acadêmico', label: 'Acadêmico', enabled: false },
    { key: 'Outros',    label: 'Outros',    enabled: false },
  ]

  content.innerHTML = categories.map(cat => {
    const items = projects.filter(p => p.category === cat.key)
    const icon  = PROJECT_CATEGORY_ICONS[cat.key]

    return `
      <div class="projects-section" style="margin-bottom:36px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div style="font-size:15px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px;">
            ${icon} ${cat.label}
            ${!cat.enabled ? '<span class="tag" style="font-size:10px;">Em breve</span>' : ''}
          </div>
        </div>
        <div class="projects-grid">
          ${items.map(p => renderProjectCard(p)).join('')}
          ${cat.enabled ? renderNewProjectCard(cat.key) : ''}
          ${items.length === 0 && !cat.enabled ? `
            <div class="card" style="grid-column:span 3;text-align:center;padding:32px;border-style:dashed;">
              <div style="font-size:24px;margin-bottom:8px;">${icon}</div>
              <div style="font-size:13px;color:var(--text-3);">Nenhum projeto ${cat.label.toLowerCase()} ainda</div>
            </div>
          ` : ''}
        </div>
      </div>
    `
  }).join('')

  // Bind click handlers
  content.querySelectorAll('.project-card[data-id]').forEach(card => {
    card.addEventListener('click', async () => {
      const id = (card as HTMLElement).dataset.id!
      const project = projects.find(p => p.id === id)
      if (project) openProject(project)
    })
  })

  content.querySelectorAll('.new-project-card[data-category]').forEach(card => {
    card.addEventListener('click', () => {
      const cat = (card as HTMLElement).dataset.category!
      showNewProjectWizard(content.closest('.projects-home')!.parentElement!, cat)
    })
  })
}

function renderProjectCard(p: Project): string {
  const words = ((p.target_word_count ?? 0) / 1000).toFixed(0)
  return `
    <div class="project-card card" data-id="${p.id}" style="cursor:pointer;padding:0;overflow:hidden;">
      <div class="project-card-header" style="background:${p.cover_gradient};height:72px;display:flex;align-items:center;justify-content:center;font-size:32px;">
        ${p.cover_image_url
          ? `<img src="${p.cover_image_url}" style="height:100%;width:100%;object-fit:cover;" />`
          : p.cover_emoji
        }
      </div>
      <div style="padding:14px 16px;">
        <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${p.title}
        </div>
        ${p.subtitle ? `<div style="font-size:11px;color:var(--text-3);margin-bottom:6px;">${p.subtitle}</div>` : ''}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
          ${p.genre ? `<span class="tag accent-tag">${p.genre}</span>` : ''}
          <span class="tag">${p.language}</span>
        </div>
        <div style="display:flex;gap:14px;">
          ${p.total_chapters_planned ? `<div style="font-size:11px;color:var(--text-3);">📚 ${p.total_chapters_planned} caps.</div>` : ''}
          ${p.target_word_count ? `<div style="font-size:11px;color:var(--text-3);">📝 ${words}k palavras</div>` : ''}
        </div>
      </div>
    </div>
  `
}

function renderNewProjectCard(category: string): string {
  return `
    <div class="new-project-card card" data-category="${category}"
         style="cursor:pointer;border-style:dashed;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:140px;transition:all 0.15s;">
      <div style="font-size:24px;color:var(--text-3);">+</div>
      <div style="font-size:13px;color:var(--text-3);">Novo projeto</div>
    </div>
  `
}

function openProject(project: Project): void {
  appStore.setCurrentProject(project)
  // Dispatch custom event — main.ts handles the routing
  document.dispatchEvent(new CustomEvent('story-os:open-project', { detail: { project } }))
}

// ─── New Project Wizard ───────────────────────────────────────────────────────

function showNewProjectWizard(container: HTMLElement, category = 'Livros'): void {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:520px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div style="font-size:16px;font-weight:700;color:var(--text);">Novo Projeto</div>
        <button class="btn modal-close" style="padding:4px 10px;font-size:14px;">✕</button>
      </div>

      <!-- Steps -->
      <div class="wizard-steps" style="display:flex;gap:6px;margin-bottom:24px;">
        <div class="wizard-step active" data-step="1" style="flex:1;height:3px;background:var(--accent);border-radius:3px;"></div>
        <div class="wizard-step" data-step="2" style="flex:1;height:3px;background:var(--surface-2);border-radius:3px;transition:background 0.2s;"></div>
      </div>

      <!-- Step 1 -->
      <div id="wizard-step-1">
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div>
            <div class="wizard-label">Título</div>
            <input id="proj-title" class="wizard-input" placeholder="Ex: A Coroa Despedaçada" />
          </div>
          <div>
            <div class="wizard-label">Subtítulo (opcional)</div>
            <input id="proj-subtitle" class="wizard-input" placeholder="Ex: A saga das três linhagens" />
          </div>
          <div>
            <div class="wizard-label">Categoria</div>
            <div style="display:flex;gap:8px;">
              ${['Livros','Acadêmico','Outros'].map(cat => `
                <label style="flex:1;cursor:pointer;">
                  <input type="radio" name="proj-category" value="${cat}" ${cat === category ? 'checked' : ''}
                    style="display:none;" />
                  <div class="wizard-radio ${cat === category ? 'selected' : ''}" data-value="${cat}">
                    ${PROJECT_CATEGORY_ICONS[cat]} ${cat}
                  </div>
                </label>
              `).join('')}
            </div>
          </div>
          <div>
            <div class="wizard-label">Gênero</div>
            <select id="proj-genre" class="wizard-input">
              <option value="">Selecionar...</option>
              ${GENRES.map(g => `<option value="${g}">${g}</option>`).join('')}
            </select>
          </div>
          <div>
            <div class="wizard-label">Descrição (opcional)</div>
            <textarea id="proj-desc" class="wizard-input" rows="3" placeholder="Sinopse ou ideia principal..."></textarea>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:20px;">
          <button class="btn btn-primary" id="wizard-next">Próximo →</button>
        </div>
      </div>

      <!-- Step 2 -->
      <div id="wizard-step-2" style="display:none;">
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div>
            <div class="wizard-label">Idioma</div>
            <select id="proj-lang" class="wizard-input">
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
              <option value="es">Español</option>
            </select>
          </div>
          <div>
            <div class="wizard-label">Meta de palavras</div>
            <input id="proj-words" type="number" class="wizard-input" placeholder="Ex: 80000" min="1000" />
          </div>
          <div>
            <div class="wizard-label">Número de capítulos planejados</div>
            <input id="proj-chapters" type="number" class="wizard-input" placeholder="Ex: 30" min="1" />
          </div>
          <div>
            <div class="wizard-label">Emoji de capa</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${['📖','👑','🗡️','🔮','🌍','⚡','🏰','🌊','🦋','🌙','🔥','⭐'].map(e => `
                <button class="emoji-picker-btn ${e === '📖' ? 'selected' : ''}" data-emoji="${e}"
                  style="font-size:22px;padding:6px;border:2px solid var(--border);border-radius:8px;background:transparent;cursor:pointer;transition:all 0.12s;">
                  ${e}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:20px;">
          <button class="btn" id="wizard-back">← Voltar</button>
          <button class="btn btn-primary" id="wizard-create">Criar Projeto ✓</button>
        </div>
      </div>

      <div id="wizard-error" style="color:#C62828;font-size:12px;margin-top:10px;display:none;"></div>
    </div>
  `

  document.body.appendChild(overlay)

  let selectedEmoji = '📖'

  // Radio buttons for category
  overlay.querySelectorAll('.wizard-radio').forEach(el => {
    el.addEventListener('click', () => {
      overlay.querySelectorAll('.wizard-radio').forEach(r => r.classList.remove('selected'))
      el.classList.add('selected')
      const input = el.closest('label')!.querySelector('input[type="radio"]') as HTMLInputElement
      input.checked = true
    })
  })

  // Emoji picker
  overlay.querySelectorAll('.emoji-picker-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.emoji-picker-btn').forEach(b => {
        b.classList.remove('selected');
        (b as HTMLElement).style.borderColor = 'var(--border)'
      })
      btn.classList.add('selected');
      (btn as HTMLElement).style.borderColor = 'var(--accent)'
      selectedEmoji = (btn as HTMLElement).dataset.emoji ?? '📖'
    })
  })
  // Init first emoji button
  const firstEmoji = overlay.querySelector('.emoji-picker-btn.selected') as HTMLElement
  if (firstEmoji) firstEmoji.style.borderColor = 'var(--accent)'

  // Close
  overlay.querySelector('.modal-close')!.addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })

  // Step navigation
  overlay.querySelector('#wizard-next')!.addEventListener('click', () => {
    const title = (overlay.querySelector('#proj-title') as HTMLInputElement).value.trim()
    if (!title) {
      const err = overlay.querySelector('#wizard-error') as HTMLElement
      err.textContent = 'O título é obrigatório.'
      err.style.display = 'block'
      return
    }
    overlay.querySelector('#wizard-error')!.setAttribute('style', 'display:none')
    overlay.querySelector('#wizard-step-1')!.setAttribute('style', 'display:none')
    overlay.querySelector('#wizard-step-2')!.removeAttribute('style')
    overlay.querySelectorAll('.wizard-step')[1].setAttribute('style',
      'flex:1;height:3px;background:var(--accent);border-radius:3px;')
  })

  overlay.querySelector('#wizard-back')!.addEventListener('click', () => {
    overlay.querySelector('#wizard-step-2')!.setAttribute('style', 'display:none')
    overlay.querySelector('#wizard-step-1')!.removeAttribute('style')
    overlay.querySelectorAll('.wizard-step')[1].setAttribute('style',
      'flex:1;height:3px;background:var(--surface-2);border-radius:3px;transition:background 0.2s;')
  })

  overlay.querySelector('#wizard-create')!.addEventListener('click', async () => {
    const btn = overlay.querySelector('#wizard-create') as HTMLButtonElement
    btn.textContent = 'Criando...'
    btn.disabled = true

    const title    = (overlay.querySelector('#proj-title') as HTMLInputElement).value.trim()
    const subtitle = (overlay.querySelector('#proj-subtitle') as HTMLInputElement).value.trim()
    const category = (overlay.querySelector('input[name="proj-category"]:checked') as HTMLInputElement).value as 'Livros' | 'Acadêmico' | 'Outros'
    const genre    = (overlay.querySelector('#proj-genre') as HTMLSelectElement).value
    const desc     = (overlay.querySelector('#proj-desc') as HTMLTextAreaElement).value.trim()
    const lang     = (overlay.querySelector('#proj-lang') as HTMLSelectElement).value
    const wordGoal = parseInt((overlay.querySelector('#proj-words') as HTMLInputElement).value) || undefined
    const chapGoal = parseInt((overlay.querySelector('#proj-chapters') as HTMLInputElement).value) || undefined

    try {
      const project = await createProject({
        title,
        subtitle:               subtitle || null,
        description:            desc || null,
        category,
        project_type:           category === 'Livros' ? 'book' : category === 'Acadêmico' ? 'academic' : 'other',
        cover_emoji:            selectedEmoji,
        cover_gradient:         'linear-gradient(135deg,#6B5FE4,#9B8FF8)',
        cover_image_url:        null,
        genre:                  genre || null,
        subgenres:              null,
        language:               lang,
        status:                 'active',
        target_word_count:      wordGoal ?? null,
        total_chapters_planned: chapGoal ?? null,
        sort_order:             0,
        metadata:               {},
      })

      overlay.remove()
      openProject(project)
    } catch (err) {
      const errEl = overlay.querySelector('#wizard-error') as HTMLElement
      errEl.textContent = 'Erro ao criar projeto. Tente novamente.'
      errEl.style.display = 'block'
      btn.textContent = 'Criar Projeto ✓'
      btn.disabled = false
    }
  })
}
