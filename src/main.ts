import { supabase } from './lib/supabase'
import { appStore } from './store/app.store'
import { editorStore } from './store/editor.store'
import { getProfile } from './services/auth.service'
import { seedDemoIfNeeded } from './utils/seed'
import { renderLoginScreen } from './components/auth/LoginScreen'
import { renderProjectsHome } from './components/projects/ProjectsHome'
import {
  getProjectStats, getWritingStreak,
} from './services/projects.service'
import {
  getChapters, getRecentChapters, getActs,
} from './services/chapters.service'
import { getCharacters } from './services/characters.service'
import { getLocations, getLocationCharacterCount, getLocationChapterCount } from './services/locations.service'
import { getTimelineEvents } from './services/timeline.service'
import { getIdeas, addIdea as addIdeaService, deleteIdea } from './services/ideas.service'
import { getResearch } from './services/research.service'
import { getUniverseCategories, getEntriesCounts } from './services/universe.service'
import { getWritingActivity } from './services/stats.service'
import { scheduleAutosave, flushSave, setSaveInfoUpdater } from './services/autosave.service'
import { countWords, formatWordCount } from './utils/wordCount'
import { escapeHtml } from './utils/escapeHtml'
import { relativeTime, formatDate } from './utils/date'
import { IDEA_EMOJIS, IDEA_CATEGORIES, CHAPTER_STATUSES } from './lib/constants'
import type { Chapter, Character, Location } from './types/database.types'
import { showImportWordModal } from './components/shared/ImportWordModal'

// ─── Auth Gate ────────────────────────────────────────────────────────────────
const authContainer = document.getElementById('auth-container') as HTMLDivElement
const appShell      = document.getElementById('app-shell') as HTMLElement
const projectsLayer = document.getElementById('projects-layer') as HTMLDivElement

let unsubscribeAuth: (() => void) | null = null

// Boot
;(async () => {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    showLogin()
  } else {
    await onUserSignedIn(session.user.id)
  }

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, sess) => {
    if (sess) {
      await onUserSignedIn(sess.user.id)
    } else {
      onUserSignedOut()
    }
  })
  unsubscribeAuth = () => subscription.unsubscribe()
})()

function showLogin() {
  authContainer.style.display = 'flex'
  appShell.style.display = 'none'
  projectsLayer.style.display = 'none'
  renderLoginScreen(authContainer)
  appStore.setLoading(false)
}

async function onUserSignedIn(userId: string) {
  authContainer.style.display = 'none'

  // Load profile
  const profile = await getProfile(userId)
  if (profile) {
    appStore.setCurrentUser(profile)
    // Restore theme preference
    if (profile.theme === 'dark') {
      document.body.setAttribute('data-dark', '')
      updateThemeButtons(true)
    }
  }

  // Seed demo data if first login
  await seedDemoIfNeeded(userId)

  // Show project selection
  showProjectsHome()
}

function onUserSignedOut() {
  appStore.setCurrentUser(null)
  appStore.setCurrentProject(null)
  showLogin()
}

// ─── Projects Home ────────────────────────────────────────────────────────────
async function showProjectsHome() {
  appShell.style.display = 'none'
  projectsLayer.style.display = 'flex'
  await renderProjectsHome(projectsLayer)
}

// Event fired when a project is selected
document.addEventListener('story-os:open-project', async (e) => {
  const project = (e as CustomEvent).detail.project
  appStore.setCurrentProject(project)
  await openWorkspace()
})

async function openWorkspace() {
  const project = appStore.getState().currentProject
  if (!project) return

  projectsLayer.style.display = 'none'
  appShell.style.display = 'flex'

  // Update sidebar project info
  const bookName     = document.getElementById('current-book-name')
  const bookChapters = document.querySelector('.book-chapters')
  if (bookName) bookName.textContent = project.title
  if (bookChapters) bookChapters.textContent = `${project.genre ?? ''} · ${project.language}`

  // Update user info in sidebar
  const profile = appStore.getState().currentUser
  if (profile) {
    const avatarEl  = document.querySelector('.sidebar-bottom .avatar') as HTMLElement
    const nameEl    = document.querySelector('.sidebar-bottom .user-name') as HTMLElement
    const planEl    = document.querySelector('.sidebar-bottom .user-plan') as HTMLElement
    const initials  = profile.display_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    if (avatarEl) {
      avatarEl.textContent = initials
      avatarEl.style.background = profile.avatar_color
    }
    if (nameEl) nameEl.textContent = profile.display_name
    if (planEl) planEl.textContent = profile.plan === 'pro' ? 'Pro Writer' : 'Writer'
  }

  // Load dashboard data
  await loadDashboard()
}

// ─── Navigation ───────────────────────────────────────────────────────────────
;(window as unknown as Record<string, unknown>)['showView'] = showView

function showView(name: string, navEl?: HTMLElement) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  const target = document.getElementById('view-' + name)
  if (target) target.classList.add('active')

  if (navEl) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'))
    navEl.classList.add('active')
  }
  closeSidebar()

  const project = appStore.getState().currentProject
  if (!project) return

  // Lazy-load each view when first shown
  switch (name) {
    case 'dashboard':     loadDashboard(); break
    case 'capitulos':     loadChapters();  break
    case 'personagens':   loadCharacters(); break
    case 'timeline':      loadTimeline();  break
    case 'locais':        loadLocations(); break
    case 'ideias':        loadIdeas();     break
    case 'pesquisas':     loadResearch();  break
    case 'universo':      loadUniverse();  break
    case 'estatisticas':  loadStats();     break
  }
}

// Book selector → back to projects
;(window as unknown as Record<string, unknown>)['openBookPicker'] = () => {
  appStore.setCurrentProject(null)
  showProjectsHome()
}

// ─── Import from Word ─────────────────────────────────────────────────────────
;(window as unknown as Record<string, unknown>)['openImportWord'] = () => showImportWordModal()

document.addEventListener('story-os:import-complete', () => {
  // Reload active view after import
  const activeView = document.querySelector('.view.active')?.id?.replace('view-', '')
  if (activeView) showView(activeView)
})

// ─── Sign out ─────────────────────────────────────────────────────────────────
;(window as unknown as Record<string, unknown>)['signOut'] = async () => {
  await supabase.auth.signOut()
}

// ─── Dark Mode ────────────────────────────────────────────────────────────────
let isDark = document.body.hasAttribute('data-dark')

;(window as unknown as Record<string, unknown>)['toggleDark'] = toggleDark

function toggleDark() {
  isDark = !isDark
  isDark ? document.body.setAttribute('data-dark', '') : document.body.removeAttribute('data-dark')
  updateThemeButtons(isDark)
  localStorage.setItem('story-os-dark', isDark ? '1' : '0')

  const profile = appStore.getState().currentUser
  if (profile) {
    import('./services/auth.service').then(m =>
      m.updateProfile(profile.id, { theme: isDark ? 'dark' : 'light' })
    )
  }
}

function updateThemeButtons(dark: boolean) {
  document.querySelectorAll('.theme-toggle, #theme-btn').forEach(btn => {
    (btn as HTMLElement).textContent = dark ? '☀️' : '🌙'
  })
  const dtBtn = document.getElementById('dark-toggle-btn')
  if (dtBtn) dtBtn.textContent = dark ? 'Desativar' : 'Ativar'
}

// Restore theme from localStorage (fast, before Supabase loads)
if (localStorage.getItem('story-os-dark') === '1') {
  document.body.setAttribute('data-dark', '')
  isDark = true
  updateThemeButtons(true)
}

// ─── Mobile Sidebar ───────────────────────────────────────────────────────────
;(window as unknown as Record<string, unknown>)['openSidebar'] = openSidebar
;(window as unknown as Record<string, unknown>)['closeSidebar'] = closeSidebar

function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open')
  document.getElementById('overlay')?.classList.add('show')
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open')
  document.getElementById('overlay')?.classList.remove('show')
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  const project = appStore.getState().currentProject
  if (!project) return

  try {
    const [stats, streak, recentChapters, characters] = await Promise.all([
      getProjectStats(project.id),
      getWritingStreak(project.id),
      getRecentChapters(project.id, 4),
      getCharacters(project.id),
    ])

    // Today's date subtitle
    const pageSub = document.querySelector('#view-dashboard .page-sub') as HTMLElement
    if (pageSub) pageSub.textContent = formatDate(new Date().toISOString())

    if (stats) {
      setStatCard(0, formatWordCount(stats.total_words), `+${formatWordCount(0)} esta semana`)
      setStatCard(1,
        `${stats.total_chapters} <span style="font-size:14px;color:var(--text-3)">/ ${stats.total_chapters_planned ?? '?'}</span>`,
        `${stats.completion_pct ?? 0}% concluídos`
      )
      setStatCard(2, String(stats.total_characters),
        `${stats.pov_characters} POV, ${stats.total_characters - stats.pov_characters} secundários`
      )
    } else {
      setStatCard(0, '0', '+0 esta semana')
      setStatCard(1, '0', '0% concluídos')
      setStatCard(2, '0', '0 POV, 0 secundários')
    }
    setStatCard(3, `${streak} <span style="font-size:14px;color:var(--text-3)">dias</span>`, 'Sequência de escrita')

    // Recent chapters
    renderDashboardChapters(recentChapters)

    // Active characters
    renderDashboardCharacters(characters.slice(0, 3))

  } catch (err) {
    console.error('[Dashboard] Error loading:', err)
  }
}

function setStatCard(index: number, value: string, sub: string) {
  const cards = document.querySelectorAll('#view-dashboard .stat-card')
  const card  = cards[index]
  if (!card) return
  const valEl = card.querySelector('.stat-value') as HTMLElement
  const subEl = card.querySelector('.stat-sub') as HTMLElement
  if (valEl) valEl.innerHTML = value
  if (subEl) subEl.textContent = sub
}

function renderDashboardChapters(chapters: Chapter[]) {
  const list = document.querySelector('#view-dashboard .chapter-list') as HTMLElement
  if (!list) return

  if (chapters.length === 0) {
    list.innerHTML = '<div style="font-size:13px;color:var(--text-3);padding:10px 0;">Nenhum capítulo ainda.</div>'
    return
  }

  list.innerHTML = chapters.map(ch => {
    const st = CHAPTER_STATUSES[ch.status] ?? CHAPTER_STATUSES.draft
    return `
      <div class="chapter-item" onclick="showView('capitulos', document.querySelectorAll('.nav-item')[2])">
        <div class="ch-num">${ch.chapter_number}</div>
        <div class="ch-info">
          <div class="ch-title">${escapeHtml(ch.title)}</div>
          <div class="ch-meta">${formatWordCount(ch.word_count)} palavras · ${relativeTime(ch.last_edited_at)}</div>
        </div>
        <div class="ch-status ${st.css}">${st.label}</div>
      </div>
    `
  }).join('')
}

function renderDashboardCharacters(characters: Character[]) {
  const grid = document.querySelector('#view-dashboard .char-card-mini')?.parentElement
    ?? document.querySelector('#view-dashboard .char-mini-grid')
  if (!grid) return

  if (characters.length === 0) {
    grid.innerHTML = '<div style="font-size:13px;color:var(--text-3);padding:10px 0;">Nenhum personagem ainda.</div>'
    return
  }

  grid.innerHTML = characters.map(c => `
    <div class="char-card-mini" onclick="showView('personagens', document.querySelectorAll('.nav-item')[1])">
      <div class="char-avatar" style="background:${c.avatar_color};">${c.initials ?? c.name[0]}</div>
      <div class="char-name-s">${escapeHtml(c.short_name ?? c.name)}</div>
      <div class="char-role-s">${escapeHtml(c.role ?? '')}</div>
    </div>
  `).join('')
}

// ─── Chapters ─────────────────────────────────────────────────────────────────
let currentChapterData: Chapter[] = []

async function loadChapters() {
  const project = appStore.getState().currentProject
  if (!project) return

  try {
    const chapters = await getChapters(project.id)
    currentChapterData = chapters
    renderChapterList(chapters)

    // Update topbar subtitle
    const sub = document.querySelector('#view-capitulos .page-sub') as HTMLElement
    const totalWords = chapters.reduce((s, c) => s + c.word_count, 0)
    if (sub) sub.textContent = `${chapters.length} capítulos · ${formatWordCount(totalWords)} palavras`

    // Update list header count
    const header = document.querySelector('.ch-list-header') as HTMLElement
    if (header) {
      header.innerHTML = `Todos os capítulos <span style="color:var(--text-3);font-weight:400;font-size:11px;">${chapters.length}</span>`
    }

    // Auto-select first chapter
    if (chapters.length > 0) {
      const firstItem = document.querySelector('.ch-list-item') as HTMLElement
      if (firstItem) selectChapterUI(firstItem, chapters[0])
    } else {
      const content = document.getElementById('editor-content') as HTMLElement
      const titleEl = document.getElementById('editor-title') as HTMLInputElement
      const numEl   = document.getElementById('editor-num') as HTMLElement
      const wordsEl = document.getElementById('editor-words') as HTMLElement
      if (content)  content.innerHTML = ''
      if (titleEl)  titleEl.value = ''
      if (numEl)    numEl.textContent = ''
      if (wordsEl)  wordsEl.textContent = '0 palavras'
    }
  } catch (err) {
    console.error('[Chapters] Error loading:', err)
  }
}

function renderChapterList(chapters: Chapter[]) {
  const list = document.getElementById('ch-list') as HTMLElement
  if (!list) return

  list.innerHTML = chapters.map((ch, i) => {
    const st = CHAPTER_STATUSES[ch.status] ?? CHAPTER_STATUSES.draft
    return `
      <div class="ch-list-item ${i === 0 ? 'active' : ''}"
           data-id="${ch.id}"
           onclick="selectChapterById('${ch.id}', this)">
        <div class="ch-list-num">Capítulo ${ch.chapter_number}</div>
        <div class="ch-list-title">${escapeHtml(ch.title)}</div>
        <div class="ch-list-meta">
          <span class="ch-list-words">${formatWordCount(ch.word_count)} palavras</span>
          <span class="ch-status ${st.css}" style="font-size:9px;padding:1px 6px;">${st.label}</span>
        </div>
      </div>
    `
  }).join('')
}

;(window as unknown as Record<string, unknown>)['selectChapterById'] = (id: string, el: HTMLElement) => {
  const chapter = currentChapterData.find(c => c.id === id)
  if (!chapter) return
  document.querySelectorAll('.ch-list-item').forEach(i => i.classList.remove('active'))
  el.classList.add('active')
  selectChapterUI(el, chapter)
}

// Legacy compatibility — still called from old onclick attributes
;(window as unknown as Record<string, unknown>)['selectChapter'] = (
  el: HTMLElement, num: number, title: string, words: string, status: string, statusClass: string
) => {
  document.querySelectorAll('.ch-list-item').forEach(i => i.classList.remove('active'))
  el.classList.add('active')
  const ch = currentChapterData.find(c => c.chapter_number === num)
  if (ch) selectChapterUI(el, ch)
  else {
    // Fallback to original static behaviour
    const titleEl  = document.getElementById('editor-title') as HTMLInputElement
    const numEl    = document.getElementById('editor-num') as HTMLElement
    const wordsEl  = document.getElementById('editor-words') as HTMLElement
    const statusEl = document.getElementById('editor-status') as HTMLElement
    if (titleEl)  titleEl.value           = title
    if (numEl)    numEl.textContent        = String(num)
    if (wordsEl)  wordsEl.textContent      = words
    if (statusEl) { statusEl.textContent   = status; statusEl.className = 'ch-status ' + statusClass }
  }
}

function selectChapterUI(el: HTMLElement, chapter: Chapter) {
  editorStore.setChapter(chapter)

  const titleEl  = document.getElementById('editor-title') as HTMLInputElement
  const numEl    = document.getElementById('editor-num') as HTMLElement
  const wordsEl  = document.getElementById('editor-words') as HTMLElement
  const statusEl = document.getElementById('editor-status') as HTMLElement
  const content  = document.getElementById('editor-content') as HTMLElement
  const saveInfo = document.getElementById('editor-save-info') as HTMLElement

  const st = CHAPTER_STATUSES[chapter.status] ?? CHAPTER_STATUSES.draft

  if (titleEl)  titleEl.value = chapter.title
  if (numEl)    numEl.textContent = String(chapter.chapter_number)
  if (wordsEl)  wordsEl.textContent = formatWordCount(chapter.word_count)
  if (statusEl) { statusEl.textContent = st.label; statusEl.className = 'ch-status ' + st.css }
  if (content)  content.innerHTML = chapter.content || ''
  if (saveInfo) saveInfo.textContent = 'Salvo'

  updateWordCounter()
}

// ─── Editor ───────────────────────────────────────────────────────────────────
;(window as unknown as Record<string, unknown>)['execCmd'] = (cmd: string, value?: string) => {
  document.getElementById('editor-content')?.focus()
  document.execCommand(cmd, false, value ?? undefined)
}

;(window as unknown as Record<string, unknown>)['insertQuote'] = () => {
  document.execCommand('formatBlock', false, 'blockquote')
}

setSaveInfoUpdater((text) => {
  const el = document.getElementById('editor-save-info')
  if (el) el.textContent = text
})

function updateWordCounter() {
  const content = document.getElementById('editor-content')
  if (!content) return
  const words = countWords(content.innerHTML)
  const counter = document.getElementById('word-counter')
  if (counter) counter.textContent = formatWordCount(words) + ' palavras'
  return words
}

;(window as unknown as Record<string, unknown>)['countWords'] = () => {
  const words = updateWordCounter()
  const saveInfo = document.getElementById('editor-save-info')
  if (saveInfo) saveInfo.textContent = 'Editando...'

  const content = document.getElementById('editor-content')
  if (content) scheduleAutosave(content.innerHTML)
}

;(window as unknown as Record<string, unknown>)['saveChapter'] = async () => {
  const content = document.getElementById('editor-content')
  if (content) await flushSave(content.innerHTML)
}

let focusMode = false
;(window as unknown as Record<string, unknown>)['toggleFocusMode'] = () => {
  focusMode = !focusMode
  document.body.classList.toggle('focus-mode', focusMode)
  if (focusMode) document.addEventListener('keydown', exitFocusOnEsc)
  else           document.removeEventListener('keydown', exitFocusOnEsc)
}

function exitFocusOnEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') ((window as unknown as Record<string, unknown>)['toggleFocusMode'] as () => void)()
}

// ─── Characters ───────────────────────────────────────────────────────────────
let currentCharacters: Character[] = []

async function loadCharacters() {
  const project = appStore.getState().currentProject
  if (!project) return

  try {
    currentCharacters = await getCharacters(project.id)
    renderCharacterList()

    const sub = document.querySelector('#view-personagens .page-sub') as HTMLElement
    if (sub) sub.textContent = `${currentCharacters.length} personagens neste projeto`

    if (currentCharacters.length > 0) {
      renderCharacterDetail(currentCharacters[0])
    } else {
      const sidebar = document.querySelector('.char-sidebar-card') as HTMLElement
      if (sidebar) sidebar.innerHTML = '<div style="color:var(--text-3);font-size:13px;padding:20px;text-align:center;">Nenhum personagem ainda.</div>'
    }
  } catch (err) {
    console.error('[Characters] Error loading:', err)
  }
}

function renderCharacterList() {
  const listContainer = document.querySelector('#view-personagens .char-detail-layout > div:first-child > div:last-child > div') as HTMLElement
  if (!listContainer) return

  listContainer.innerHTML = currentCharacters.map(c => {
    const statusLabel = { alive:'Vivo/a', dead:'Morto/a', unknown:'Incerto', missing:'Desaparecido' }[c.status] ?? c.status
    const statusClass = c.status === 'alive' ? 'status-done' : c.status === 'dead' ? 'status-draft' : 'status-review'
    return `
      <div class="chapter-item" style="border-left:3px solid transparent;" onclick="selectCharacter('${c.id}')">
        <div class="char-avatar" style="background:${c.avatar_color};width:32px;height:32px;font-size:11px;flex-shrink:0;">
          ${escapeHtml(c.initials ?? c.name[0])}
        </div>
        <div class="ch-info">
          <div class="ch-title">${escapeHtml(c.name)}</div>
          <div class="ch-meta">${escapeHtml(c.role ?? '')}</div>
        </div>
        <div class="ch-status ${statusClass}" style="font-size:9px;">${statusLabel}</div>
      </div>
    `
  }).join('')
}

;(window as unknown as Record<string, unknown>)['selectCharacter'] = (id: string) => {
  const char = currentCharacters.find(c => c.id === id)
  if (char) renderCharacterDetail(char)
}

function renderCharacterDetail(char: Character) {
  const sidebar = document.querySelector('.char-sidebar-card') as HTMLElement
  if (!sidebar) return

  const statusLabel = { alive:'Viva', dead:'Morta', unknown:'Incerto', missing:'Desaparecido' }[char.status] ?? char.status
  const statusClass = char.status === 'alive' ? 'accent-tag' : ''

  sidebar.innerHTML = `
    <div class="char-avatar-lg" style="background:${char.avatar_color};">
      ${escapeHtml(char.initials ?? char.name[0])}
    </div>
    <div class="char-name-lg">${escapeHtml(char.name)}</div>
    <div class="char-role-lg">${escapeHtml(char.role ?? '')}${char.is_pov ? ' · Personagem POV' : ''}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:14px;">
      <span class="tag ${statusClass}">${statusLabel}</span>
      ${char.age ? `<span class="tag">${char.age} anos</span>` : ''}
      ${char.occupation ? `<span class="tag">${escapeHtml(char.occupation)}</span>` : ''}
    </div>
    <div style="border-top:1px solid var(--border);padding-top:14px;width:100%;">
      ${char.nationality ? `<div class="char-attr"><div class="char-attr-label">Nacionalidade</div><div class="char-attr-val">${escapeHtml(char.nationality)}</div></div>` : ''}
      ${char.occupation  ? `<div class="char-attr"><div class="char-attr-label">Profissão</div><div class="char-attr-val">${escapeHtml(char.occupation)}</div></div>` : ''}
      ${char.languages?.length ? `<div class="char-attr"><div class="char-attr-label">Idiomas</div><div class="char-attr-val">${char.languages.join(', ')}</div></div>` : ''}
    </div>
  `

  // Update profile tab
  const perfil = document.getElementById('char-tab-perfil')
  if (perfil) {
    const descCard = perfil.querySelector('.card') as HTMLElement
    if (descCard) {
      descCard.innerHTML = `
        ${char.description ? `<div class="char-section"><div class="char-section-title">Descrição</div><div class="char-text">${escapeHtml(char.description)}</div></div>` : ''}
        ${char.personality ? `<div class="char-section"><div class="char-section-title">Personalidade</div><div class="char-text">${escapeHtml(char.personality)}</div></div>` : ''}
        ${char.physical_desc ? `<div class="char-section"><div class="char-section-title">Aparência</div><div class="char-text">${escapeHtml(char.physical_desc)}</div></div>` : ''}
      `
    }
    const traitGrid = perfil.querySelector('.trait-grid') as HTMLElement
    if (traitGrid) {
      traitGrid.innerHTML = [
        { label: 'Objetivos', val: char.goals },
        { label: 'Medos',     val: char.fears },
        { label: 'Virtudes',  val: char.virtues },
        { label: 'Defeitos',  val: char.flaws },
      ].filter(t => t.val).map(t => `
        <div class="trait-item">
          <div class="trait-label">${t.label}</div>
          <div class="trait-val">${escapeHtml(t.val!)}</div>
        </div>
      `).join('')
    }
  }

  // Update notes tab
  const notesTab = document.getElementById('char-tab-notas-char')
  if (notesTab) {
    const editable = notesTab.querySelector('[contenteditable]') as HTMLElement
    if (editable) {
      editable.textContent = char.notes ?? ''
      // Autosave notes
      editable.oninput = debounceCharNotes(char.id)
    }
  }
}

function debounceCharNotes(charId: string) {
  let timer: ReturnType<typeof setTimeout>
  return () => {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      const el = document.querySelector('#char-tab-notas-char [contenteditable]') as HTMLElement
      if (!el) return
      const { upsertCharacter } = await import('./services/characters.service')
      await upsertCharacter({ id: charId, project_id: '', notes: el.textContent ?? '' })
    }, 1000)
  }
}

;(window as unknown as Record<string, unknown>)['switchCharTab'] = (el: HTMLElement, tabId: string) => {
  document.querySelectorAll('.ctab').forEach(t => t.classList.remove('active'))
  el.classList.add('active')
  const tabs = ['perfil','arco','relacoes-char','capitulos-char','notas-char']
  tabs.forEach(id => {
    const tabEl = document.getElementById('char-tab-' + id)
    if (tabEl) tabEl.style.display = id === tabId ? 'block' : 'none'
  })
}

// ─── Locations ────────────────────────────────────────────────────────────────
async function loadLocations() {
  const project = appStore.getState().currentProject
  if (!project) return

  try {
    const locs = await getLocations(project.id)
    const [charCounts, chapCounts] = await Promise.all([
      Promise.all(locs.map(l => getLocationCharacterCount(l.id))),
      Promise.all(locs.map(l => getLocationChapterCount(l.id))),
    ])

    const sub = document.querySelector('#view-locais .page-sub') as HTMLElement
    if (sub) sub.textContent = `${locs.length} lugares no seu mundo`

    const grid = document.querySelector('.loc-grid') as HTMLElement
    if (!grid) return

    grid.innerHTML = locs.map((loc, i) => `
      <div class="loc-card">
        <div class="loc-thumb" style="background:${loc.thumb_gradient};">${loc.thumb_emoji}</div>
        <div class="loc-body">
          <div class="loc-name">${escapeHtml(loc.name)}</div>
          <div class="loc-desc">${escapeHtml(loc.description ?? '')}</div>
          <div class="loc-meta">
            <div class="loc-meta-item">👥 ${charCounts[i]} perso.</div>
            <div class="loc-meta-item">📚 ${chapCounts[i]} caps.</div>
          </div>
        </div>
      </div>
    `).join('')
  } catch (err) {
    console.error('[Locations] Error loading:', err)
  }
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
async function loadTimeline() {
  const project = appStore.getState().currentProject
  if (!project) return

  try {
    const [events, characters] = await Promise.all([
      getTimelineEvents(project.id),
      getCharacters(project.id),
    ])

    const charMap: Record<string, Character> = {}
    characters.forEach(c => { charMap[c.id] = c })

    const content = document.querySelector('#view-timeline .content') as HTMLElement
    if (!content) return

    content.innerHTML = `
      <div style="display:grid;grid-template-columns:130px 1fr;gap:0;">
        <div></div>
        <div style="border-left:2px solid var(--accent);margin-left:20px;padding-left:28px;">
          <div style="font-size:10px;color:var(--text-3);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:0 0 16px;border-bottom:1px solid var(--border);margin-bottom:24px;">Eventos</div>
          <div style="display:flex;flex-direction:column;gap:0;">
            ${events.map(ev => {
              const chars = ev.characterIds.map(id => charMap[id]).filter(Boolean)
              const borderStyle = ev.is_highlight ? `border-color:var(--accent);` : ''
              const dotStyle = ev.is_highlight
                ? `background:var(--accent);border:3px solid var(--surface);box-shadow:0 0 0 2px var(--accent);`
                : `background:var(--surface);border:2px solid var(--border-strong);`
              return `
                <div style="display:flex;gap:20px;margin-bottom:28px;align-items:flex-start;">
                  <div style="min-width:115px;max-width:115px;text-align:right;font-size:11px;color:var(--text-3);padding-top:10px;margin-left:-155px;line-height:1.5;">
                    ${escapeHtml(ev.in_world_date ?? '')}
                  </div>
                  <div style="position:relative;flex:1;">
                    <div style="position:absolute;left:-36px;top:10px;width:14px;height:14px;border-radius:50%;${dotStyle}"></div>
                    <div class="card" style="${borderStyle}">
                      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                        <div style="font-size:14px;font-weight:600;color:var(--text);">${escapeHtml(ev.title)}</div>
                        ${ev.is_highlight ? '<span style="font-size:11px;font-weight:400;color:var(--text-3);">· Próximo evento</span>' : ''}
                      </div>
                      <div style="font-size:12px;color:var(--text-2);line-height:1.6;margin-bottom:10px;">${escapeHtml(ev.description ?? '')}</div>
                      <div class="tl-chars">
                        ${chars.map(c => `<span class="tl-char-tag">${escapeHtml(c.short_name ?? c.name)}</span>`).join('')}
                      </div>
                    </div>
                  </div>
                </div>
              `
            }).join('')}
          </div>
        </div>
      </div>
    `
  } catch (err) {
    console.error('[Timeline] Error loading:', err)
  }
}

// ─── Ideas ────────────────────────────────────────────────────────────────────
async function loadIdeas() {
  const project = appStore.getState().currentProject
  if (!project) return

  try {
    const ideas = await getIdeas(project.id)
    const list = document.getElementById('idea-list') as HTMLElement
    if (!list) return

    list.innerHTML = ideas.map(idea => `
      <div class="idea-item" data-id="${idea.id}">
        <div class="idea-dot">${idea.emoji}</div>
        <div>
          <div class="idea-text">${escapeHtml(idea.content)}</div>
          <div class="idea-meta">${relativeTime(idea.created_at)} · ${escapeHtml(idea.category ?? '')}</div>
        </div>
      </div>
    `).join('')
  } catch (err) {
    console.error('[Ideas] Error loading:', err)
  }
}

;(window as unknown as Record<string, unknown>)['addIdea'] = async () => {
  const input = document.getElementById('idea-input') as HTMLInputElement
  if (!input || !input.value.trim()) return

  const text     = input.value.trim()
  const emoji    = IDEA_EMOJIS[Math.floor(Math.random() * IDEA_EMOJIS.length)]
  const category = IDEA_CATEGORIES[Math.floor(Math.random() * IDEA_CATEGORIES.length)]

  const list = document.getElementById('idea-list') as HTMLElement
  const item = document.createElement('div')
  item.className = 'idea-item'
  item.innerHTML = `
    <div class="idea-dot">${emoji}</div>
    <div>
      <div class="idea-text">${escapeHtml(text)}</div>
      <div class="idea-meta">Agora · ${category}</div>
    </div>
  `
  item.style.opacity = '0'
  item.style.transform = 'translateY(-8px)'
  list.insertBefore(item, list.firstChild)

  requestAnimationFrame(() => {
    item.style.transition = 'all 0.25s ease'
    item.style.opacity = '1'
    item.style.transform = 'translateY(0)'
  })

  input.value = ''

  const project = appStore.getState().currentProject
  if (project) {
    try {
      const saved = await addIdeaService(project.id, text, emoji, category)
      item.dataset.id = saved.id
    } catch {
      /* offline fallback — item still shows in UI */
    }
  }
}

// ─── Research ─────────────────────────────────────────────────────────────────
async function loadResearch() {
  const project = appStore.getState().currentProject
  if (!project) return

  try {
    const items = await getResearch(project.id)
    const grid  = document.querySelector('#view-pesquisas .three-col') as HTMLElement
    if (!grid) return

    grid.innerHTML = items.map(r => `
      <div class="card">
        <div style="font-size:24px;margin-bottom:10px;">${r.emoji}</div>
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px;">${escapeHtml(r.title)}</div>
        <div style="font-size:12px;color:var(--text-3);">${r.source_type.charAt(0).toUpperCase() + r.source_type.slice(1)} · ${escapeHtml(r.source_label ?? '')}</div>
        ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener" style="font-size:11px;color:var(--accent);margin-top:6px;display:block;">Abrir link →</a>` : ''}
      </div>
    `).join('') + `
      <div class="card" style="border-style:dashed;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
        <div style="font-size:20px;">+</div>
        <div style="font-size:13px;color:var(--text-3);">Adicionar referência</div>
      </div>
    `
  } catch (err) {
    console.error('[Research] Error loading:', err)
  }
}

// ─── Universe ─────────────────────────────────────────────────────────────────
async function loadUniverse() {
  const project = appStore.getState().currentProject
  if (!project) return

  try {
    const [cats, counts] = await Promise.all([
      getUniverseCategories(project.id),
      getEntriesCounts(project.id),
    ])

    const sub = document.querySelector('#view-universo .page-sub') as HTMLElement
    if (sub) sub.textContent = `Wiki interna do mundo de ${project.title}`

    const grid = document.querySelector('#view-universo .three-col') as HTMLElement
    if (!grid) return

    grid.innerHTML = cats.map(cat => `
      <div class="card" style="cursor:pointer;">
        <div style="font-size:22px;margin-bottom:8px;">${cat.emoji}</div>
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:6px;">${escapeHtml(cat.name)}</div>
        <div style="font-size:12px;color:var(--text-2);line-height:1.6;">${escapeHtml(cat.description ?? '')}</div>
        <div style="font-size:11px;color:var(--text-3);margin-top:10px;">${counts[cat.id] ?? 0} entradas</div>
      </div>
    `).join('')
  } catch (err) {
    console.error('[Universe] Error loading:', err)
  }
}

// ─── Statistics ───────────────────────────────────────────────────────────────
async function loadStats() {
  const project = appStore.getState().currentProject
  if (!project) return

  try {
    const [stats, activity, chapters, characters] = await Promise.all([
      getProjectStats(project.id),
      getWritingActivity(project.id, 30),
      getChapters(project.id),
      getCharacters(project.id),
    ])

    if (stats) {
      const cards = document.querySelectorAll('#view-estatisticas .stat-card')
      const avg = stats.total_chapters > 0
        ? Math.round(stats.total_words / stats.total_chapters) : 0
      const maxCh = chapters.reduce((max, c) => c.word_count > max.word_count ? c : max, chapters[0])

      if (cards[0]) cards[0].querySelector('.stat-value')!.textContent = formatWordCount(stats.total_words)
      if (cards[1]) cards[1].querySelector('.stat-value')!.textContent = formatWordCount(avg)
      if (cards[2]) {
        cards[2].querySelector('.stat-value')!.textContent = formatWordCount(maxCh?.word_count ?? 0)
        const sub = cards[2].querySelector('.stat-sub') as HTMLElement
        if (sub && maxCh) sub.textContent = `Cap. ${maxCh.chapter_number} · ${escapeHtml(maxCh.title)}`
      }
    }

    // Chapter word count bar chart
    buildBarChart('bar-chart-caps', chapters.map(c => c.word_count), i => String(chapters[i]?.chapter_number ?? ''), true)

    // Activity chart
    buildBarChart('bar-chart-activity', activity.map(a => a.words), i => {
      const d = new Date(activity[i].date)
      return String(d.getDate())
    }, false)

    // Character appearances
    const charBars = document.querySelector('#view-estatisticas .two-col .card:last-child > div:last-child') as HTMLElement
    if (charBars && characters.length > 0) {
      const maxCount = characters[0] ? 18 : 1 // rough placeholder; ideally from DB
      charBars.innerHTML = characters.slice(0, 5).map(c => `
        <div>
          <div class="progress-meta">
            <span class="progress-name" style="display:flex;align-items:center;gap:6px;">
              <div style="width:10px;height:10px;border-radius:50%;background:${c.avatar_color.split(',')[0].replace('linear-gradient(135deg','').trim()};"></div>
              ${escapeHtml(c.short_name ?? c.name)}
            </span>
            <span class="progress-pct">—</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:50%;background:${c.avatar_color};"></div></div>
        </div>
      `).join('')
    }

  } catch (err) {
    console.error('[Stats] Error loading:', err)
  }
}

function buildBarChart(containerId: string, data: number[], labelFn: (i: number) => string, showAll: boolean) {
  const container = document.getElementById(containerId)
  if (!container) return
  container.innerHTML = ''

  const max = Math.max(...data, 1)
  const skip = data.length > 20 ? 5 : 1

  data.forEach((val, i) => {
    const col = document.createElement('div')
    col.className = 'bar-col'
    const heightPx = Math.round((val / max) * 88)
    col.innerHTML = `
      <div class="bar-fill" style="height:${heightPx}px;" title="${formatWordCount(val)} palavras"></div>
      <div class="bar-label">${(i + 1) % skip === 0 ? labelFn(i) : ''}</div>
    `
    container.appendChild(col)
  })
}

// ─── Misc stubs (placeholders for remaining actions) ──────────────────────────
;(window as unknown as Record<string, unknown>)['toggleChapterMenu'] = () => {
  alert('Menu do capítulo:\n• Exportar como TXT\n• Duplicar capítulo\n• Mover para outro ato\n• Excluir capítulo')
}

;(window as unknown as Record<string, unknown>)['focusSearch'] = () => {
  alert('Busca rápida (Cmd+K) — em breve')
}

;(window as unknown as Record<string, unknown>)['escapeHtml'] = escapeHtml

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    const content = document.getElementById('editor-content')
    if (content) flushSave(content.innerHTML)
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
    const active = document.getElementById('view-capitulos')
    if (active?.classList.contains('active')) {
      e.preventDefault()
      document.getElementById('editor-content')?.focus()
      document.execCommand('bold', false, undefined)
    }
  }
  if (e.key === 'Escape' && focusMode) {
    ((window as unknown as Record<string, unknown>)['toggleFocusMode'] as () => void)()
  }
})

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateWordCounter()
})
