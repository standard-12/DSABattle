import type { Metadata } from "next"
import { SignupForm } from "@/components/auth/signup-form"

export const metadata: Metadata = {
  title: "Sign Up - DSA Battle",
  description:
    "Create your DSA Battle account and start competing in real-time coding challenges.",
}

export default function SignupPage() {
  return <SignupForm />
}
