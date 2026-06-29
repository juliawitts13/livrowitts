import { supabase } from '../lib/supabase'
import type { Project, ProjectStats } from '../types/database.types'

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'active')
    .order('sort_order')
    .order('created_at')

  if (error) throw error
  return data ?? []
}

export async function getProject(id: string): Promise<Project | null> {
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()
  return data ?? null
}

export async function createProject(
  payload: Omit<Project, 'id' | 'owner_id' | 'created_at' | 'updated_at'>
): Promise<Project> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('projects')
    .insert({ ...payload, owner_id: user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<void> {
  const { error } = await supabase.from('projects').update(updates).eq('id', id)
  if (error) throw error
}

export async function archiveProject(id: string): Promise<void> {
  await updateProject(id, { status: 'archived' })
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
}

export async function getProjectStats(projectId: string): Promise<ProjectStats | null> {
  const { data } = await supabase
    .from('project_stats')
    .select('*')
    .eq('project_id', projectId)
    .single()
  return data ?? null
}

export async function getWritingStreak(projectId?: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { data } = await supabase.rpc('get_writing_streak', {
    p_user_id: user.id,
    ...(projectId ? { p_project_id: projectId } : {}),
  })
  return (data as number) ?? 0
}
