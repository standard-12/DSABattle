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

export async function login(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  })
}

export async function logout() {
  return supabase.auth.signOut()
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/confirm`,
    },
  })
}

export async function signInWithGithub() {
  return supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${window.location.origin}/auth/confirm`,
    },
  })
}
