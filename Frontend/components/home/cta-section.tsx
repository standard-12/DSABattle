import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Swords, ArrowRight } from "lucide-react"

export function CTASection() {
  return (
    <section className="relative border-t border-border/50 py-24 lg:py-32">
      {/* Background glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/8 blur-[100px]" />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-5xl">
          Ready to prove your skills?
        </h2>
        <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">
          Stop practicing alone. Join thousands of coders who are sharpening
          their DSA skills through real competition. Your next battle awaits.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            asChild
            className="gap-2 px-8 text-base font-semibold"
          >
            <Link href="/auth/signup">
              <Swords className="size-5" />
              Start Your First Battle
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="gap-2 px-8 text-base font-semibold"
          >
            <Link href="#features">
              Learn More
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
