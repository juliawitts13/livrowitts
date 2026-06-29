import { supabase } from '../lib/supabase'
import type { Chapter, Act } from '../types/database.types'
import { countWords } from '../utils/wordCount'

export async function getChapters(projectId: string): Promise<Chapter[]> {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getChapter(id: string): Promise<Chapter | null> {
  const { data } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', id)
    .single()
  return data ?? null
}

export async function upsertChapter(chapter: Partial<Chapter> & { id: string }): Promise<Chapter> {
  if (chapter.content !== undefined) {
    chapter.word_count = countWords(chapter.content)
    chapter.last_edited_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('chapters')
    .update(chapter)
    .eq('id', chapter.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createChapter(
  projectId: string,
  actId: string | null,
  chapterNumber: number,
  title = 'Novo Capítulo',
): Promise<Chapter> {
  const { data, error } = await supabase
    .from('chapters')
    .insert({
      project_id: projectId,
      act_id: actId,
      chapter_number: chapterNumber,
      title,
      content: '',
      word_count: 0,
      status: 'draft' as const,
      sort_order: chapterNumber - 1,
      pov_character_id: null,
      location_id: null,
      synopsis: null,
      notes: null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteChapter(id: string): Promise<void> {
  const { error } = await supabase.from('chapters').delete().eq('id', id)
  if (error) throw error
}

export async function getActs(projectId: string): Promise<Act[]> {
  const { data, error } = await supabase
    .from('acts')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function getRecentChapters(projectId: string, limit = 4): Promise<Chapter[]> {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('project_id', projectId)
    .order('last_edited_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}
