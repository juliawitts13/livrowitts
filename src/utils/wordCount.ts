export function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ').trim()
  if (!text) return 0
  return text.split(/\s+/).filter(w => w.length > 0).length
}

export function formatWordCount(n: number): string {
  return n.toLocaleString('pt-BR')
}
