import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/server"

type OnboardingPageProps = {
  searchParams?: Promise<{
    error?: string
  }>
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = searchParams ? await searchParams : undefined
  const errorMessage =
    params?.error === "username_exists"
      ? "That username is already taken."
      : params?.error === "invalid_username"
        ? "Please enter a valid username."
        : params?.error === "profile_create_failed"
          ? "Unable to create your profile. Please try again."
          : undefined

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  async function createProfile(formData: FormData) {
    "use server"

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect("/login")
    }

    const username = String(formData.get("username") ?? "").trim()

    if (!username) {
      redirect("/onboarding?error=invalid_username")
    }

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        username,
        rating: 1000,
      },
      {
        onConflict: "id",
      }
    )

    if (error) {
      if (error.code === "23505") {
        redirect("/onboarding?error=username_exists")
      }

      redirect("/onboarding?error=profile_create_failed")
    }

    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Create your profile</h1>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form action={createProfile} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-foreground">
              Username
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="Choose a username"
              autoComplete="username"
              required
            />
          </div>

          <Button type="submit" className="w-full">
            Create Profile
          </Button>
        </form>
      </div>
    </div>
  )
}
