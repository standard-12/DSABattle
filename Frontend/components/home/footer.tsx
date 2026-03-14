import Link from "next/link"
import { Swords } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-10 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <Swords className="size-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            DSA <span className="text-primary">Battle</span>
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="#features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            How It Works
          </Link>
          <Link
            href="/auth/login"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Log In
          </Link>
        </div>

        <p className="text-sm text-muted-foreground">
          {"Built for competitive coders."}
        </p>
      </div>
    </footer>
  )
}
