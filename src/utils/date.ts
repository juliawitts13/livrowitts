export function relativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diff < 60) return 'agora mesmo'
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} horas`
  if (diff < 172800) return 'ontem'
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`
  return date.toLocaleDateString('pt-BR')
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
