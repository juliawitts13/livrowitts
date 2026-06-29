import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database.types'

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data ?? null
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<void> {
  await supabase.from('profiles').update(updates).eq('id', userId)
}

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUp(email: string, password: string, displayName: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export function onAuthChange(callback: (userId: string | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user?.id ?? null)
  })
  return () => subscription.unsubscribe()
}

export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}
