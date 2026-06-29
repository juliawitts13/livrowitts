import { supabase } from '../lib/supabase'
import type { WritingSession } from '../types/database.types'

export async function getWritingActivity(
  projectId: string,
  days = 30,
): Promise<{ date: string; words: number }[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('writing_sessions')
    .select('session_date, words_written')
    .eq('project_id', projectId)
    .gte('session_date', since.toISOString().split('T')[0])
    .order('session_date')

  if (error) throw error

  // Group by date
  const map: Record<string, number> = {}
  for (const row of data ?? []) {
    map[row.session_date] = (map[row.session_date] ?? 0) + row.words_written
  }

  const result: { date: string; words: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    result.push({ date: key, words: map[key] ?? 0 })
  }
  return result
}

export async function startWritingSession(
  projectId: string,
  userId: string,
  chapterId: string | null,
): Promise<WritingSession> {
  const { data, error } = await supabase
    .from('writing_sessions')
    .insert({
      project_id: projectId,
      user_id: userId,
      chapter_id: chapterId,
      words_written: 0,
      session_date: new Date().toISOString().split('T')[0],
      started_at: new Date().toISOString(),
      ended_at: null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function endWritingSession(
  sessionId: string,
  wordsWritten: number,
): Promise<void> {
  await supabase
    .from('writing_sessions')
    .update({
      words_written: wordsWritten,
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
}
