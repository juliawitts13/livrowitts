import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Story OS] Variáveis de ambiente não configuradas.\n' +
    'Copie .env.example para .env e preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient<Database>(supabaseUrl ?? '', supabaseAnonKey ?? '')
