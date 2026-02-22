import { UserPlus, Search, Swords, Trophy } from "lucide-react"

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create Your Account",
    description: "Sign up in seconds and set up your competitive profile.",
  },
  {
    icon: Search,
    step: "02",
    title: "Find an Opponent",
    description:
      "Get matched with another coder at your level or challenge a friend.",
  },
  {
    icon: Swords,
    step: "03",
    title: "Battle in Real-Time",
    description:
      "Both players receive the same problem. Solve it faster and better to win.",
  },
  {
    icon: Trophy,
    step: "04",
    title: "Climb the Ranks",
    description:
      "Earn points, track your progress, and rise through the leaderboard.",
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative border-t border-border/50 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            How DSA Battle Works
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            From sign-up to your first win in minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item, index) => (
            <div
              key={item.step}
              className="group relative flex flex-col items-center text-center"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-[calc(50%+40px)] top-10 hidden h-px w-[calc(100%-80px)] bg-border/50 lg:block" />
              )}

              <div className="mb-6 flex size-20 items-center justify-center rounded-2xl border border-border/50 bg-card/50 transition-all duration-300 group-hover:border-primary/30 group-hover:bg-primary/10">
                <item.icon className="size-8 text-primary" />
              </div>

              <span className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">
                Step {item.step}
              </span>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
