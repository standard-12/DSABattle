import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Swords, Zap, ArrowRight } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:80px_80px] opacity-20" />
      {/* Radial glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-6 pb-24 pt-20 text-center lg:pb-32 lg:pt-28">
        {/* Badge */}
        <div className="mb-8 flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
          <Zap className="size-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            Real-time 1v1 DSA Battles
          </span>
        </div>

        {/* Headline */}
        <h1 className="max-w-4xl text-balance text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
          Learn DSA by{" "}
          <span className="text-primary">Competing.</span>
          <br />
          Not Just Practicing.
        </h1>

        {/* Subheading */}
        <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
          Challenge another coder in real-time, track your growth, revisit weak
          areas, and build structured notes — all in one place.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Button size="lg" asChild className="gap-2 px-8 text-base font-semibold">
            <Link href="/auth/signup">
              <Swords className="size-5" />
              Start Battle
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="gap-2 px-8 text-base font-semibold"
          >
            <Link href="#leaderboard">
              View Leaderboard
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {/* Stats bar */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 rounded-2xl border border-border/50 bg-card/50 px-8 py-6 backdrop-blur-sm lg:gap-16">
          <StatItem label="Active Battles" value="1,200+" />
          <div className="hidden h-8 w-px bg-border/50 sm:block" />
          <StatItem label="Problems Solved" value="50,000+" />
          <div className="hidden h-8 w-px bg-border/50 sm:block" />
          <StatItem label="Registered Coders" value="10,000+" />
        </div>
      </div>
    </section>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-2xl font-bold text-foreground lg:text-3xl">
        {value}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}
