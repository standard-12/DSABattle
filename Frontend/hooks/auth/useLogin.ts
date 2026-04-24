"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  login as authLogin,
  signInWithGoogle as googleLogin,
  signInWithGithub as githubLogin,
} from "@/services/auth.service"
import { createClient } from "@/utils/supabase/client"

export function useLogin() {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const router = useRouter()

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setErrorMessage("")

    try {
      // signInWithPassword already returns the user — no need for a
      // separate getUser() call which would race for the same Web Lock.
      const { data, error } = await authLogin(email, password)

      if (error) {
        setErrorMessage(error.message)
      } else {
        const user = data.user

        if (!user) {
          setErrorMessage("Unable to load your account.")
          return
        }

        const supabase = createClient()
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single()

        if (profile) {
          router.push("/dashboard")
          return
        }

        if (profileError && profileError.code !== "PGRST116") {
          setErrorMessage(profileError.message)
          return
        }

        router.push("/onboarding")
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [router])

  const handleGoogleLogin = useCallback(async () => {
    setLoading(true)
    setErrorMessage("")
    try {
      const { error } = await googleLogin()
      if (error) setErrorMessage(error.message)
    } catch {
      setErrorMessage("Could not connect to Google. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleGithubLogin = useCallback(async () => {
    setLoading(true)
    setErrorMessage("")
    try {
      const { error } = await githubLogin()
      if (error) setErrorMessage(error.message)
    } catch {
      setErrorMessage("Could not connect to GitHub. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    login,
    handleGoogleLogin,
    handleGithubLogin,
    loading,
    errorMessage,
    setErrorMessage,
  }
}
