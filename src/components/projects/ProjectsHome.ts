import { getProjects, createProject, deleteProject } from '../../services/projects.service'
import { appStore } from '../../store/app.store'
import { PROJECT_CATEGORY_ICONS, GENRES } from '../../lib/constants'
import type { Project } from '../../types/database.types'

export async function renderProjectsHome(container: HTMLElement): Promise<void> {
  const user = appStore.getState().currentUser
  const firstName = user?.display_name?.split(' ')[0] ?? 'Escritor'
  const initials  = user?.display_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  const avatarColor = user?.avatar_color ?? '#7C5FE8'

  container.innerHTML = `
    <div class="ph-root">

      <!-- Header -->
      <header class="ph-header">
        <div class="ph-brand">
          <div class="ph-logo-mark">S</div>
          <span class="ph-brand-name">Story OS</span>
        </div>
        <div class="ph-header-right">
          <div class="ph-user-chip">
            <div class="ph-user-avatar" style="background:${avatarColor};">${initials}</div>
            <span class="ph-user-name">${user?.display_name ?? ''}</span>
          </div>
          <button class="ph-btn-ghost" onclick="signOut()" title="Sair">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sair
          </button>
        </div>
      </header>

      <!-- Hero greeting -->
      <div class="ph-greeting">
        <h1 class="ph-greeting-title">Olá, ${firstName} 👋</h1>
        <p class="ph-greeting-sub">O que você vai escrever hoje?</p>
      </div>

      <!-- Content -->
      <div class="ph-content" id="projects-content">
        <div class="ph-loading">Carregando projetos…</div>
      </div>
    </div>
  `

  await loadProjects(container)
}

async function loadProjects(container: HTMLElement): Promise<void> {
  const content = container.querySelector('#projects-content') as HTMLDivElement
  try {
    const projects = await getProjects()
    renderProjectGrid(content, projects)
  } catch {
    content.innerHTML = `<div class="ph-empty-state">Não foi possível carregar seus projetos. Verifique sua conexão.</div>`
  }
}

function renderProjectGrid(content: HTMLElement, projects: Project[]): void {
  const categories: Array<{ key: 'Livros' | 'Acadêmico' | 'Outros'; label: string; enabled: boolean }> = [
    { key: 'Livros',    label: 'Livros',    enabled: true  },
    { key: 'Acadêmico', label: 'Acadêmico', enabled: false },
    { key: 'Outros',    label: 'Outros',    enabled: false },
  ]

  const totalProjects = projects.length

  content.innerHTML = `
    ${totalProjects === 0 ? `
      <div class="ph-welcome-banner">
        <div class="ph-welcome-icon">✍️</div>
        <div>
          <div class="ph-welcome-title">Bem-vindo ao Story OS!</div>
          <div class="ph-welcome-sub">Crie seu primeiro projeto e comece a escrever sua história.</div>
        </div>
      </div>
    ` : ''}

    ${categories.map(cat => {
      const items = projects.filter(p => p.category === cat.key)
      const icon  = PROJECT_CATEGORY_ICONS[cat.key]

      return `
        <section class="ph-section">
          <div class="ph-section-header">
            <div class="ph-section-title">
              <span class="ph-section-icon">${icon}</span>
              ${cat.label}
              ${!cat.enabled ? '<span class="ph-badge-soon">Em breve</span>' : ''}
            </div>
            ${cat.enabled ? `
              <button class="ph-btn-new" data-category="${cat.key}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Novo projeto
              </button>
            ` : ''}
          </div>

          <div class="ph-grid">
            ${items.map(p => renderProjectCard(p)).join('')}
            ${items.length === 0 && cat.enabled ? renderEmptyCard(cat.key) : ''}
            ${items.length === 0 && !cat.enabled ? renderComingSoonCard(cat.label, icon) : ''}
          </div>
        </section>
      `
    }).join('')}
  `

  // Bind project cards
  content.querySelectorAll('.ph-project-card[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = (card as HTMLElement).dataset.id!
      const project = projects.find(p => p.id === id)
      if (project) openProject(project)
    })
  })

  // Bind delete buttons
  content.querySelectorAll('.ph-card-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      const id = (btn as HTMLElement).dataset.id!
      if (!confirm('Excluir este projeto permanentemente? Esta ação não pode ser desfeita.')) return
      try {
        await deleteProject(id)
        await loadProjects(content.closest('.ph-root')!.parentElement as HTMLElement)
      } catch {
        alert('Erro ao excluir projeto. Tente novamente.')
      }
    })
  })

  // Bind new project buttons
  content.querySelectorAll('.ph-btn-new[data-category], .ph-empty-card[data-category]').forEach(el => {
    el.addEventListener('click', () => {
      const cat = (el as HTMLElement).dataset.category!
      showNewProjectWizard(content.closest('.ph-root')!.parentElement!, cat)
    })
  })
}

function wordProgress(p: Project): string {
  if (!p.target_word_count) return ''
  const pct = Math.min(100, Math.round((((p as Record<string, unknown>)['total_words'] as number | undefined ?? 0) / p.target_word_count) * 100))
  return `
    <div class="ph-card-progress">
      <div class="ph-progress-bar">
        <div class="ph-progress-fill" style="width:${pct}%;"></div>
      </div>
      <span class="ph-progress-label">${pct}% · ${(((p as Record<string, unknown>)['total_words'] as number | undefined ?? 0)/1000).toFixed(1)}k / ${(p.target_word_count/1000).toFixed(0)}k palavras</span>
    </div>
  `
}

function renderProjectCard(p: Project): string {
  return `
    <article class="ph-project-card" data-id="${p.id}" tabindex="0" role="button" aria-label="Abrir ${p.title}">
      <button class="ph-card-delete" data-id="${p.id}" title="Excluir projeto" aria-label="Excluir ${p.title}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
      <div class="ph-card-cover" style="background:${p.cover_gradient ?? 'linear-gradient(135deg,#6B5FE4,#9B8FF8)'};">
        ${p.cover_image_url
          ? `<img src="${p.cover_image_url}" alt="${p.title}" class="ph-card-cover-img"/>`
          : `<span class="ph-card-emoji">${p.cover_emoji ?? '📖'}</span>`}
      </div>
      <div class="ph-card-body">
        <div class="ph-card-title">${p.title}</div>
        ${p.subtitle ? `<div class="ph-card-subtitle">${p.subtitle}</div>` : ''}
        <div class="ph-card-tags">
          ${p.genre ? `<span class="ph-tag ph-tag-accent">${p.genre}</span>` : ''}
          <span class="ph-tag">${p.language}</span>
        </div>
        ${wordProgress(p)}
      </div>
    </article>
  `
}

function renderEmptyCard(category: string): string {
  return `
    <div class="ph-empty-card" data-category="${category}" role="button" tabindex="0">
      <div class="ph-empty-icon">+</div>
      <div class="ph-empty-label">Novo projeto</div>
    </div>
  `
}

function renderComingSoonCard(label: string, icon: string): string {
  return `
    <div class="ph-coming-card">
      <div style="font-size:28px;margin-bottom:8px;">${icon}</div>
      <div class="ph-coming-label">${label} chegando em breve</div>
    </div>
  `
}

function openProject(project: Project): void {
  appStore.setCurrentProject(project)
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

      <div class="wizard-steps" style="display:flex;gap:6px;margin-bottom:24px;">
        <div class="wizard-step active" data-step="1" style="flex:1;height:3px;background:var(--accent);border-radius:3px;"></div>
        <div class="wizard-step" data-step="2" style="flex:1;height:3px;background:var(--surface-2);border-radius:3px;transition:background 0.2s;"></div>
      </div>

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
                  <input type="radio" name="proj-category" value="${cat}" ${cat === category ? 'checked' : ''} style="display:none;" />
                  <div class="wizard-radio ${cat === category ? 'selected' : ''}" data-value="${cat}">
                    ${PROJECT_CATEGORY_ICONS[cat as keyof typeof PROJECT_CATEGORY_ICONS] ?? ''} ${cat}
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
              ${['📖','👑','🗡️','🔮','🌍','⚡','🏰','🌊','🦋','🌙','🔥','⭐'].map((e,i) => `
                <button class="emoji-picker-btn ${i===0?'selected':''}" data-emoji="${e}"
                  style="font-size:22px;padding:6px;border:2px solid ${i===0?'var(--accent)':'var(--border)'};border-radius:8px;background:transparent;cursor:pointer;transition:all 0.12s;">
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

  overlay.querySelectorAll('.wizard-radio').forEach(el => {
    el.addEventListener('click', () => {
      overlay.querySelectorAll('.wizard-radio').forEach(r => r.classList.remove('selected'))
      el.classList.add('selected')
      ;(el.closest('label')!.querySelector('input[type="radio"]') as HTMLInputElement).checked = true
    })
  })

  overlay.querySelectorAll('.emoji-picker-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.emoji-picker-btn').forEach(b => {
        b.classList.remove('selected');(b as HTMLElement).style.borderColor = 'var(--border)'
      })
      btn.classList.add('selected');(btn as HTMLElement).style.borderColor = 'var(--accent)'
      selectedEmoji = (btn as HTMLElement).dataset.emoji ?? '📖'
    })
  })

  overlay.querySelector('.modal-close')!.addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })

  overlay.querySelector('#wizard-next')!.addEventListener('click', () => {
    const title = (overlay.querySelector('#proj-title') as HTMLInputElement).value.trim()
    if (!title) {
      const err = overlay.querySelector('#wizard-error') as HTMLElement
      err.textContent = 'O título é obrigatório.'; err.style.display = 'block'; return
    }
    overlay.querySelector('#wizard-error')!.setAttribute('style','display:none')
    overlay.querySelector('#wizard-step-1')!.setAttribute('style','display:none')
    overlay.querySelector('#wizard-step-2')!.removeAttribute('style')
    overlay.querySelectorAll('.wizard-step')[1].setAttribute('style','flex:1;height:3px;background:var(--accent);border-radius:3px;')
  })

  overlay.querySelector('#wizard-back')!.addEventListener('click', () => {
    overlay.querySelector('#wizard-step-2')!.setAttribute('style','display:none')
    overlay.querySelector('#wizard-step-1')!.removeAttribute('style')
    overlay.querySelectorAll('.wizard-step')[1].setAttribute('style','flex:1;height:3px;background:var(--surface-2);border-radius:3px;transition:background 0.2s;')
  })

  overlay.querySelector('#wizard-create')!.addEventListener('click', async () => {
    const btn = overlay.querySelector('#wizard-create') as HTMLButtonElement
    btn.textContent = 'Criando…'; btn.disabled = true

    const title    = (overlay.querySelector('#proj-title')    as HTMLInputElement).value.trim()
    const subtitle = (overlay.querySelector('#proj-subtitle') as HTMLInputElement).value.trim()
    const category = (overlay.querySelector('input[name="proj-category"]:checked') as HTMLInputElement).value as 'Livros' | 'Acadêmico' | 'Outros'
    const genre    = (overlay.querySelector('#proj-genre')    as HTMLSelectElement).value
    const desc     = (overlay.querySelector('#proj-desc')     as HTMLTextAreaElement).value.trim()
    const lang     = (overlay.querySelector('#proj-lang')     as HTMLSelectElement).value
    const wordGoal = parseInt((overlay.querySelector('#proj-words')    as HTMLInputElement).value) || undefined
    const chapGoal = parseInt((overlay.querySelector('#proj-chapters') as HTMLInputElement).value) || undefined

    try {
      const project = await createProject({
        title, subtitle: subtitle || null, description: desc || null, category,
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
    } catch {
      const errEl = overlay.querySelector('#wizard-error') as HTMLElement
      errEl.textContent = 'Erro ao criar projeto. Tente novamente.'; errEl.style.display = 'block'
      btn.textContent = 'Criar Projeto ✓'; btn.disabled = false
    }
  })
}
