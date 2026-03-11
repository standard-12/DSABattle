"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  login as authLogin,
  signInWithGoogle as googleLogin,
  signInWithGithub as githubLogin,
} from "@/services/auth.service"

export function useLogin() {
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const router = useRouter()

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setErrorMessage("")

    try {
      const { error } = await authLogin(email, password)

      if (error) {
        setErrorMessage(error.message)
      } else {
        router.push("/dashboard")
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
