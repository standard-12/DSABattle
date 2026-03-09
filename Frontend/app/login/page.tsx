import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { LoginForm } from "@/components/login-form"

export const metadata: Metadata = {
  title: "Log In - DSA Battle",
  description:
    "Log in or create an account to start competing in real-time DSA battles.",
}

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return <LoginForm />
}
