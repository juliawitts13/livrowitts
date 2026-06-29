import { supabase } from '../lib/supabase'
import type { Location } from '../types/database.types'

export async function getLocations(projectId: string): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function upsertLocation(location: Partial<Location> & { project_id: string }): Promise<Location> {
  const { data, error } = location.id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await supabase.from('locations').update(location as any).eq('id', location.id).select().single()
    : await supabase.from('locations').insert(location as any).select().single()

  if (error) throw error
  return data
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabase.from('locations').delete().eq('id', id)
  if (error) throw error
}

export async function getLocationCharacterCount(locationId: string): Promise<number> {
  const { count } = await supabase
    .from('location_characters')
    .select('*', { count: 'exact', head: true })
    .eq('location_id', locationId)
  return count ?? 0
}

export async function getLocationChapterCount(locationId: string): Promise<number> {
  const { count } = await supabase
    .from('chapters')
    .select('*', { count: 'exact', head: true })
    .eq('location_id', locationId)
  return count ?? 0
}
