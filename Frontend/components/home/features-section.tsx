import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Swords, Clock, Trophy, FileText } from "lucide-react"

const features = [
  {
    icon: Swords,
    title: "1v1 DSA Battle",
    description:
      "Compete against another player in real-time. Both players receive the same problem — solve within the given time. Submissions are evaluated instantly and performance determines the winner.",
    highlights: [
      "Same problem, same timer",
      "Instant evaluation",
      "Builds speed and accuracy",
    ],
  },
  {
    icon: Clock,
    title: "Problem Reminders",
    description:
      "Some problems stay in your head because they exposed a weakness. Mark difficult problems and get reminders to revisit them later.",
    highlights: [
      "Identify weak topics",
      "Reattempt when ready",
      "Turn weaknesses into strengths",
    ],
  },
  {
    icon: Trophy,
    title: "Leaderboard",
    description:
      "Track where you stand among other coders. Rankings reflect real battle performance so you can see how you compare and stay motivated.",
    highlights: [
      "Performance-based rankings",
      "Compare with peers",
      "Measurable improvement",
    ],
  },
  {
    icon: FileText,
    title: "Notes Storage",
    description:
      "Every serious learner maintains notes. Store your own explanations, patterns, and approaches for problems you solve.",
    highlights: [
      "Save personal insights",
      "Record optimized approaches",
      "Build your DSA knowledge base",
    ],
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Everything you need to master DSA
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Instead of solving problems alone, you compete head-to-head. Same
            problem. Same timer. Pure skill.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-card"
            >
              <CardHeader>
                <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <feature.icon className="size-6 text-primary" />
                </div>
                <CardTitle className="text-xl text-card-foreground">{feature.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {feature.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                    >
                      <div className="size-1.5 shrink-0 rounded-full bg-primary" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
