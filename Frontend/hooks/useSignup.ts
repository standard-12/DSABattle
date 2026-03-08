"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"

export function useSignup() {
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const signup = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setSuccessMessage("")
    setErrorMessage("")

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      })

      if (error) {
        setErrorMessage(error.message)
      } else {
        setSuccessMessage("Check your email to verify your account.")
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    signup,
    loading,
    successMessage,
    errorMessage,
    setSuccessMessage,
    setErrorMessage,
  }
}
