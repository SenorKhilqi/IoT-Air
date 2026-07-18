import { createBrowserClient } from '@supabase/ssr'

// ================================================================
// lib/supabase/client.ts — Browser-side Supabase Client
// Gunakan ini di Client Components ('use client')
// ================================================================
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
