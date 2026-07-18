import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// ================================================================
// proxy.ts — Supabase Session Refresh (Next.js 16 convention)
// Di Next.js 16, "middleware.ts" diganti dengan "proxy.ts".
// Export function harus bernama "proxy" atau default.
// ================================================================
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          // Set cookies ke request agar Server Components bisa membacanya
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Buat response baru dengan cookies yang sudah diupdate
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          // Set header cache-control agar session tidak di-cache CDN
          if (headers) {
            Object.entries(headers).forEach(([key, value]) => {
              supabaseResponse.headers.set(key, value)
            })
          }
        },
      },
    }
  )

  // PENTING: Jangan hapus baris ini!
  // Merefresh session — harus selalu dipanggil di middleware
  await supabase.auth.getUser()

  return supabaseResponse
}

// Konfigurasi path yang diproses middleware
// Exclude static files, images, dan favicon
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
