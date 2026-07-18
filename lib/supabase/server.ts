import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ================================================================
// lib/supabase/server.ts — Server-side Supabase Client
// Gunakan ini di Server Components, Route Handlers, Server Actions
// ================================================================
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll dipanggil dari Server Component — bisa diabaikan
            // jika middleware sudah me-refresh session
          }
        },
      },
    }
  )
}
