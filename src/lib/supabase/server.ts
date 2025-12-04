import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// TODO: Supabase CLI로 타입 재생성 후 Database 타입 복원
// npx supabase gen types typescript --project-id <project-id> > src/types/database.ts

export async function createClient() {
  const cookieStore = await cookies()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(
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
            // Server Component에서 호출시 무시
          }
        },
      },
    }
  )
}

