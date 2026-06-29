export const IDEA_EMOJIS = ['💡', '🎭', '🌍', '✨', '🔗', '⚡', '🎨', '🔮', '🗝️', '📖']

export const IDEA_CATEGORIES = [
  'Trama', 'Personagem', 'Worldbuilding', 'Cena',
  'Diálogo', 'Presságio', 'Tema', 'Reviravolta na trama',
]

export const CHAPTER_STATUSES = {
  draft:   { label: 'Rascunho',  css: 'status-draft' },
  review:  { label: 'Revisão',   css: 'status-review' },
  done:    { label: 'Finalizado',css: 'status-done' },
  outline: { label: 'Esboço',    css: 'status-draft' },
} as const

export const PROJECT_CATEGORIES = ['Livros', 'Acadêmico', 'Outros'] as const

export const PROJECT_CATEGORY_ICONS: Record<string, string> = {
  'Livros':    '📖',
  'Acadêmico': '🎓',
  'Outros':    '✍️',
}

export const GENRES = [
  'Fantasia', 'Fantasia Científica', 'Ficção Científica',
  'Romance', 'Thriller', 'Terror', 'Mistério',
  'Histórico', 'Aventura', 'Distopia', 'Outro',
]

export const LANGUAGES = [
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'es',    label: 'Español' },
]

export const VIEW_NAMES = [
  'dashboard', 'personagens', 'capitulos', 'timeline',
  'locais', 'relacoes', 'ideias', 'pesquisas',
  'universo', 'estatisticas', 'configuracoes',
] as const

export type ViewName = typeof VIEW_NAMES[number]

export const AUTOSAVE_DEBOUNCE_MS = 800
