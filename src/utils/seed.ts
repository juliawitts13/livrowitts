import { supabase } from '../lib/supabase'

export async function seedDemoIfNeeded(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)

  if (error || (data && data.length > 0)) return

  await supabase.rpc('seed_demo_project', { p_user_id: userId })
}
