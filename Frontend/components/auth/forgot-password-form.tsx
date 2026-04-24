"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Swords, Mail, ArrowLeft } from "lucide-react"
import { useForgotPassword } from "@/hooks/auth/useForgotPassword"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const { sendResetEmail, loading, successMessage, errorMessage } = useForgotPassword()

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    await sendResetEmail(email)
  }

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
              {'"Everyone forgets sometimes. What matters is getting back in the arena."'}
            </p>
            <footer className="mt-4 text-sm text-muted-foreground">
              — Reset and get back to competing.
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
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {"Enter the email address associated with your account and we'll send you a link to reset your password."}
            </p>
          </div>

          {/* Success message */}
          {successMessage && (
            <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
              {successMessage}
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary/50 pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="mt-2 font-semibold" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>

          {/* Back to login */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1 font-medium text-primary transition-colors hover:text-primary/80"
            >
              <ArrowLeft className="size-3" />
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
