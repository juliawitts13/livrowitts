import { supabase } from '../lib/supabase'
import type { TimelineEvent } from '../types/database.types'

export interface TimelineEventWithChars extends TimelineEvent {
  characterIds: string[]
}

export async function getTimelineEvents(projectId: string): Promise<TimelineEventWithChars[]> {
  const { data: events, error } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')

  if (error) throw error

  const { data: junctions } = await supabase
    .from('timeline_event_characters')
    .select('event_id, character_id')
    .in('event_id', (events ?? []).map(e => e.id))

  return (events ?? []).map(ev => ({
    ...ev,
    characterIds: (junctions ?? [])
      .filter(j => j.event_id === ev.id)
      .map(j => j.character_id),
  }))
}

export async function upsertTimelineEvent(event: Partial<TimelineEvent> & { project_id: string }): Promise<TimelineEvent> {
  const { data, error } = event.id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await supabase.from('timeline_events').update(event as any).eq('id', event.id).select().single()
    : await supabase.from('timeline_events').insert(event as any).select().single()

  if (error) throw error
  return data
}

export async function deleteTimelineEvent(id: string): Promise<void> {
  const { error } = await supabase.from('timeline_events').delete().eq('id', id)
  if (error) throw error
}
