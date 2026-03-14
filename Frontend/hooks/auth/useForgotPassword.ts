"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"

export function useForgotPassword() {
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const sendResetEmail = useCallback(async (email: string) => {
    setLoading(true)
    setSuccessMessage("")
    setErrorMessage("")

    const supabase = createClient()

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        setErrorMessage(error.message)
        return
      }

      setSuccessMessage(
        "If an account exists for this email, a password reset link has been sent."
      )
    } catch {
      setErrorMessage("Unable to send reset email. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    sendResetEmail,
    loading,
    successMessage,
    errorMessage,
  }
}
