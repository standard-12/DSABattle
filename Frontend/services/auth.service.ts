import { createClient } from "@/utils/supabase/client"

const supabase = createClient()

export async function signup(email: string, password: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/confirm`,
    },
  })
}
