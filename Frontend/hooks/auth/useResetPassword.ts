"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

export function useResetPassword() {
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const router = useRouter()

  const resetPassword = useCallback(
    async (newPassword: string) => {
      setLoading(true)
      setSuccessMessage("")
      setErrorMessage("")

      const supabase = createClient()

      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        })

        if (error) {
          setErrorMessage(error.message)
          return
        }

        const { error: signOutError } = await supabase.auth.signOut()

        if (signOutError) {
          setErrorMessage(signOutError.message)
          return
        }

        setSuccessMessage("Password updated successfully. Redirecting to login…")
        router.replace("/auth/login")
      } catch {
        setErrorMessage("Unable to update password. Please try again.")
      } finally {
        setLoading(false)
      }
    },
    [router]
  )

  return {
    resetPassword,
    loading,
    successMessage,
    errorMessage,
  }
}
