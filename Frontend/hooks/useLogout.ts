"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { logout as authLogout } from "@/services/auth.service"

export function useLogout() {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const logout = useCallback(async () => {
        setLoading(true)

        try {
            const { error } = await authLogout()

            if (error) {
                console.error("Logout failed:", error.message)
            }

            // Always redirect to login — even on error the local session
            // state is likely stale, so sending the user back is safest.
            router.push("/login")
        } catch {
            console.error("An unexpected error occurred during logout.")
            router.push("/login")
        } finally {
            setLoading(false)
        }
    }, [router])

    return {
        logout,
        loading,
    }
}
