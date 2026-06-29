import { supabase } from '../lib/supabase'
import type { Idea } from '../types/database.types'

export async function getIdeas(projectId: string): Promise<Idea[]> {
  const { data, error } = await supabase
    .from('ideas')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function addIdea(
  projectId: string,
  content: string,
  emoji: string,
  category: string,
): Promise<Idea> {
  const { data, error } = await supabase
    .from('ideas')
    .insert({ project_id: projectId, content, emoji, category, is_archived: false, sort_order: 0 })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function archiveIdea(id: string): Promise<void> {
  await supabase.from('ideas').update({ is_archived: true }).eq('id', id)
}

export async function deleteIdea(id: string): Promise<void> {
  const { error } = await supabase.from('ideas').delete().eq('id', id)
  if (error) throw error
}
