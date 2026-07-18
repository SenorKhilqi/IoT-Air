// ================================================================
// lib/supabaseClient.ts — Backward-compatible singleton
// Dipakai oleh page.tsx & statistics/page.tsx yang sudah ada.
// Untuk komponen baru, gunakan:
//   Client Component → import { createClient } from '@/lib/supabase/client'
//   Server Component → import { createClient } from '@/lib/supabase/server'
// ================================================================
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Named export createClient juga tersedia
export { createClient } from './supabase/client'
