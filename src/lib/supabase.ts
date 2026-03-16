import { createClient } from '@supabase/supabase-js'

// Mengambil data dari .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Inisialisasi koneksi ke Database Tumbuh-core
export const supabase = createClient(supabaseUrl, supabaseAnonKey)