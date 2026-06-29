import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://casxbqfhqejmsoydnoph.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhc3hicWZocWVqbXNveWRub3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NTUyNTksImV4cCI6MjA5ODIzMTI1OX0.kTYP2Ei9sIARW2qyCMLkpeimvjbL_Rc-HBHVWVr0BOM'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
