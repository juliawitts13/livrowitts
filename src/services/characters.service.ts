import { supabase } from '../lib/supabase'
import type { Character, CharacterArcStage, CharacterRelationship } from '../types/database.types'

export async function getCharacters(projectId: string): Promise<Character[]> {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function getCharacter(id: string): Promise<Character | null> {
  const { data } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single()
  return data ?? null
}

export async function upsertCharacter(character: Partial<Character> & { id?: string; project_id: string }): Promise<Character> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = character.id
    ? await supabase.from('characters').update(character as any).eq('id', character.id).select().single()
    : await supabase.from('characters').insert(character as any).select().single()

  if (error) throw error
  return data
}

export async function deleteCharacter(id: string): Promise<void> {
  const { error } = await supabase.from('characters').delete().eq('id', id)
  if (error) throw error
}

export async function getArcStages(characterId: string): Promise<CharacterArcStage[]> {
  const { data, error } = await supabase
    .from('character_arc_stages')
    .select('*')
    .eq('character_id', characterId)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function getRelationships(projectId: string): Promise<CharacterRelationship[]> {
  const { data, error } = await supabase
    .from('character_relationships')
    .select('*')
    .eq('project_id', projectId)

  if (error) throw error
  return data ?? []
}

export async function getCharacterRelationships(characterId: string): Promise<CharacterRelationship[]> {
  const { data, error } = await supabase
    .from('character_relationships')
    .select('*')
    .or(`character_a_id.eq.${characterId},character_b_id.eq.${characterId}`)

  if (error) throw error
  return data ?? []
}

export async function upsertRelationship(rel: Partial<CharacterRelationship> & { project_id: string }): Promise<CharacterRelationship> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = rel.id
    ? await supabase.from('character_relationships').update(rel as any).eq('id', rel.id).select().single()
    : await supabase.from('character_relationships').insert(rel as any).select().single()

  if (error) throw error
  return data
}

export async function getCharacterChapterCount(characterId: string): Promise<number> {
  const { count } = await supabase
    .from('chapter_characters')
    .select('*', { count: 'exact', head: true })
    .eq('character_id', characterId)
  return count ?? 0
}
