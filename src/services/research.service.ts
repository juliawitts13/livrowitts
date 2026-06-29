import { supabase } from '../lib/supabase'
import type { Research } from '../types/database.types'

export async function getResearch(projectId: string): Promise<Research[]> {
  const { data, error } = await supabase
    .from('research')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_archived', false)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function addResearch(payload: Omit<Research, 'id' | 'created_at' | 'updated_at'>): Promise<Research> {
  const { data, error } = await supabase
    .from('research')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateResearch(id: string, updates: Partial<Research>): Promise<void> {
  await supabase.from('research').update(updates).eq('id', id)
}

export async function deleteResearch(id: string): Promise<void> {
  const { error } = await supabase.from('research').delete().eq('id', id)
  if (error) throw error
}
