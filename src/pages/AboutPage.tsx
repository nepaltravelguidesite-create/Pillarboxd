import { Eye, Star, Compass, List, Users, BarChart3 } from "lucide-react";
import { SEOMeta } from "@/components/SEOMeta";
import { useUI } from "@/context/UIContext";

const FEATURES = [
  {
    icon: Eye,
    title: "Episode Tracking",
    body: "Mark episodes as watched, season by season. Know exactly where you left off.",
  },
  {
    icon: Star,
    title: "Ratings & Reviews",
    body: "Rate shows on a 5-star scale. Write reviews. Mark spoilers.",
  },
  {
    icon: Compass,
    title: "Discover",
    body: "Trending, popular, top-rated, and personalized recommendations based on what you've loved.",
  },
  {
    icon: List,
    title: "Lists",
    body: "Build curated lists. Share them. Let people like them.",
  },
  {
    icon: Users,
    title: "Social",
    body: "Follow friends, see their activity, comment on reviews.",
  },
  {
    icon: BarChart3,
    title: "Stats",
    body: "See your year in review: episodes watched, hours spent, favorite genres.",
  },
];

export default function AboutPage() {
  const { openAuthModal } = useUI();

  return (
    <div className="bg-background text-foreground">
      <SEOMeta
        title="About — Aftershow"
        description="Aftershow is a TV tracker for people who care about what they watch. Log episodes, rate shows, discover what's next."
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Hero */}
        <section className="text-center">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-tight">
            Track every show you watch.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Aftershow is a TV tracker for people who care about what they watch.
            Log episodes, rate shows, discover what's next.
          </p>
        </section>

        {/* What makes it different */}
        <section className="mt-16 sm:mt-20">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            What makes it different
          </h2>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Film trackers treat a movie as a single event — you saw it, or you
            didn't. Television doesn't work that way. A season is a commitment.
            An episode is a unit of attention. Aftershow is built around
            episode-level tracking, not just a checkbox that says "done." Watch
            season progress fill in as you go. See an upcoming episode calendar
            for the shows you follow. Then look back at a year in review and find
            out exactly how much of your life you gave to prestige drama.
          </p>
        </section>

        {/* Features grid */}
        <section className="mt-16 sm:mt-20">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Everything you need
          </h2>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-card border border-border rounded-lg p-6"
                >
                  <Icon className="size-6 text-primary" />
                  <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {feature.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mt-20 sm:mt-24 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Start tracking today
          </h2>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Free to join. Your watchlist is waiting.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal("signup")}
            className="mt-6 h-9 px-5 inline-flex items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
          >
            Create an account
          </button>
        </section>
      </div>
    </div>
  );
}
