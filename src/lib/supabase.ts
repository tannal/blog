import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars not set. Comments will not be persisted.')
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')

export interface DbComment {
  id: string
  post_id: string
  author: string
  avatar_url: string
  content: string
  likes: number
  created_at: string
}
