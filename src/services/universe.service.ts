import { supabase } from '../lib/supabase'
import type { UniverseCategory, UniverseEntry, GlossaryEntry } from '../types/database.types'

export async function getUniverseCategories(projectId: string): Promise<UniverseCategory[]> {
  const { data, error } = await supabase
    .from('universe_categories')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function getUniverseEntries(categoryId: string): Promise<UniverseEntry[]> {
  const { data, error } = await supabase
    .from('universe_entries')
    .select('*')
    .eq('category_id', categoryId)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function getEntriesCounts(projectId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('universe_entries')
    .select('category_id')
    .eq('project_id', projectId)

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.category_id) {
      counts[row.category_id] = (counts[row.category_id] ?? 0) + 1
    }
  }
  return counts
}

export async function upsertUniverseEntry(entry: Partial<UniverseEntry> & { project_id: string }): Promise<UniverseEntry> {
  const { data, error } = entry.id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await supabase.from('universe_entries').update(entry as any).eq('id', entry.id).select().single()
    : await supabase.from('universe_entries').insert(entry as any).select().single()

  if (error) throw error
  return data
}

export async function deleteUniverseEntry(id: string): Promise<void> {
  const { error } = await supabase.from('universe_entries').delete().eq('id', id)
  if (error) throw error
}

export async function getGlossary(projectId: string): Promise<GlossaryEntry[]> {
  const { data, error } = await supabase
    .from('glossary')
    .select('*')
    .eq('project_id', projectId)
    .order('term')

  if (error) throw error
  return data ?? []
}

export async function upsertGlossaryTerm(entry: Partial<GlossaryEntry> & { project_id: string }): Promise<GlossaryEntry> {
  const { data, error } = entry.id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await supabase.from('glossary').update(entry as any).eq('id', entry.id).select().single()
    : await supabase.from('glossary').insert(entry as any).select().single()

  if (error) throw error
  return data
}
