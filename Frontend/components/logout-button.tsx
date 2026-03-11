"use client"

import { LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLogout } from "@/hooks/useLogout"

interface LogoutButtonProps {
    /** Use "ghost" for navbar placement, "outline" for standalone, etc. */
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    /** Show the text label next to the icon */
    showLabel?: boolean
    className?: string
}

export function LogoutButton({
    variant = "ghost",
    showLabel = true,
    className,
}: LogoutButtonProps) {
    const { logout, loading } = useLogout()

    return (
        <Button
            id="logout-button"
            variant={variant}
            onClick={logout}
            disabled={loading}
            className={className}
        >
            {loading ? (
                <Loader2 className="size-4 animate-spin" />
            ) : (
                <LogOut className="size-4" />
            )}
            {showLabel && (loading ? "Logging out…" : "Logout")}
        </Button>
    )
}
