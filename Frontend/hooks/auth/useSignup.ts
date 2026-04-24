"use client"

import { useState, useCallback } from "react"
import {
  signup as authSignup,
  signInWithGoogle as googleSignup,
  signInWithGithub as githubSignup,
} from "@/services/auth.service"

export function useSignup() {
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const signup = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setSuccessMessage("")
    setErrorMessage("")

    try {
      const { error } = await authSignup(email, password)

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

  const handleGoogleSignup = useCallback(async () => {
    setLoading(true)
    setErrorMessage("")
    try {
      const { error } = await googleSignup()
      if (error) setErrorMessage(error.message)
    } catch {
      setErrorMessage("Could not connect to Google. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleGithubSignup = useCallback(async () => {
    setLoading(true)
    setErrorMessage("")
    try {
      const { error } = await githubSignup()
      if (error) setErrorMessage(error.message)
    } catch {
      setErrorMessage("Could not connect to GitHub. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    signup,
    handleGoogleSignup,
    handleGithubSignup,
    loading,
    successMessage,
    errorMessage,
    setSuccessMessage,
    setErrorMessage,
  }
}
