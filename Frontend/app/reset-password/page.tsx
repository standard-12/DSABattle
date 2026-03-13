import type { Metadata } from "next"
import { ResetPasswordForm } from "@/components/reset-password-form"

export const metadata: Metadata = {
  title: "Reset Password | DSA Battle",
  description: "Set a new password for your DSA Battle account.",
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
