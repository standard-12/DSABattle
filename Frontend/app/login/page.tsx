import type { Metadata } from "next"
import { LoginForm } from "@/components/login-form"

export const metadata: Metadata = {
  title: "Log In - DSA Battle",
  description:
    "Log in or create an account to start competing in real-time DSA battles.",
}

export default function LoginPage() {
  return <LoginForm />
}
