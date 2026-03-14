"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Swords, Eye, EyeOff, Lock } from "lucide-react"
import { useResetPassword } from "@/hooks/auth/useResetPassword"

export function ResetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [validationError, setValidationError] = useState("")
  const { resetPassword, loading, successMessage, errorMessage } = useResetPassword()

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setValidationError("")

    if (newPassword !== confirmPassword) {
      setValidationError("Passwords do not match.")
      return
    }

    await resetPassword(newPassword)
  }

  const displayError = validationError || errorMessage

  return (
    <div className="flex min-h-screen">
      {/* Left panel - Branding */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-card/50 p-12 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:60px_60px] opacity-15" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-primary/8 blur-[120px]" />

        <div className="relative">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary">
              <Swords className="size-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">
              DSA <span className="text-primary">Battle</span>
            </span>
          </Link>
        </div>

        <div className="relative">
          <blockquote className="max-w-md">
            <p className="text-2xl font-semibold leading-snug text-foreground">
              {'"A fresh start is just a new password away."'}
            </p>
            <footer className="mt-4 text-sm text-muted-foreground">
              — Set your new password and jump back in.
            </footer>
          </blockquote>
        </div>

        <div className="relative flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-foreground">10,000+</span>
            <span className="text-sm text-muted-foreground">Active Coders</span>
          </div>
          <div className="h-8 w-px bg-border/50" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-foreground">50,000+</span>
            <span className="text-sm text-muted-foreground">Battles Fought</span>
          </div>
          <div className="h-8 w-px bg-border/50" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-foreground">500+</span>
            <span className="text-sm text-muted-foreground">Problems</span>
          </div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary">
                <Swords className="size-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                DSA <span className="text-primary">Battle</span>
              </span>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Set new password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your new password below.
            </p>
          </div>

          {/* Success message */}
          {successMessage && (
            <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
              {successMessage}
            </div>
          )}

          {/* Error message */}
          {displayError && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {displayError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword" className="text-foreground">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-secondary/50 pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword" className="text-foreground">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-secondary/50 pl-10 pr-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="mt-2 font-semibold" disabled={loading || !!successMessage}>
              {loading ? "Updating..." : "Update password"}
            </Button>
          </form>

          {/* Back to login */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              href="/auth/login"
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
