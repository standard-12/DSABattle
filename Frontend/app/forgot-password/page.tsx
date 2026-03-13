import type { Metadata } from "next"
import { ForgotPasswordForm } from "@/components/forgot-password-form"

export const metadata: Metadata = {
  title: "Forgot Password | DSA Battle",
  description: "Reset your DSA Battle account password.",
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
