import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Tv } from "lucide-react";
import {
  getPerson,
  profileUrl,
  type PersonDetail,
  type TVShow,
} from "@/lib/tmdb";
import { ShowPosterCard } from "@/components/shows/ShowPosterCard";
import { SEOMeta } from "@/components/SEOMeta";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A TV filmography cast entry — a TVShow augmented with role metadata. */
type FilmographyEntry = TVShow & {
  character: string;
  episode_count: number;
};

// ---------------------------------------------------------------------------
// PersonPage
// ---------------------------------------------------------------------------

export default function PersonPage() {
  const { personId } = useParams<{ personId: string }>();
  const id = Number(personId);

  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id || Number.isNaN(id)) {
      setError("Invalid person ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setPerson(null);

    getPerson(id)
      .then((data) => {
        if (cancelled) return;
        setPerson(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to load person.";
        setError(msg);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // ---- Loading -------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background text-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // ---- Error / empty -------------------------------------------------------
  if (error || !person) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-background px-4 text-center text-foreground">
        <Tv className="size-12 text-muted-foreground/50" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">
          {error ?? "Person not found."}
        </p>
        <Link
          to="/"
          className="text-sm font-medium text-primary hover:underline"
        >
          Back home
        </Link>
      </div>
    );
  }

  // ---- Data prep -----------------------------------------------------------
  const filmography: FilmographyEntry[] = [...(person.tv_credits?.cast ?? [])]
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

  const knownForCount = filmography.length;

  // Birthday line: "1979-04-04 · Glasgow, Scotland, UK"
  const birthBits: string[] = [];
  if (person.birthday) birthBits.push(person.birthday);
  if (person.place_of_birth) birthBits.push(person.place_of_birth);
  const bornLine = birthBits.length > 0 ? birthBits.join(" · ") : null;

  return (
    <>
    <SEOMeta title={person.name} />
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {/* ----------------------------------------------------------- Header */}
        <section className="flex flex-col gap-6 sm:flex-row sm:gap-8">
          {/* Profile photo */}
          <div className="mx-auto shrink-0 sm:mx-0">
            <div className="w-[120px] sm:w-[200px] aspect-[2/3] overflow-hidden rounded-xl border border-border/50 bg-muted shadow-lg shadow-black/30">
              <img
                src={profileUrl(person.profile_path, "h632")}
                alt={person.name}
                loading="lazy"
                className="h-full w-full object-cover object-top"
              />
            </div>
          </div>

          {/* Bio / metadata */}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {person.name}
            </h1>

            {person.known_for_department && (
              <p className="mt-2 text-sm font-medium uppercase tracking-widest text-primary">
                {person.known_for_department}
              </p>
            )}

            {bornLine && (
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground/80">Born:</span>{" "}
                {bornLine}
              </p>
            )}

            {knownForCount > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground/80">
                  Known for:
                </span>{" "}
                {knownForCount} TV {knownForCount === 1 ? "credit" : "credits"}
              </p>
            )}

            {person.homepage && (
              <a
                href={person.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                Official website ↗
              </a>
            )}

            {/* Biography */}
            {person.biography ? (
              <p className="mt-4 max-w-prose text-sm leading-relaxed text-foreground/80 sm:text-base">
                {person.biography}
              </p>
            ) : (
              <p className="mt-4 text-sm italic text-muted-foreground">
                No biography available.
              </p>
            )}
          </div>
        </section>

        {/* ----------------------------------------------------- Filmography */}
        <section className="mt-12">
          <div className="mb-5 flex items-baseline justify-between border-b border-border/50 pb-2">
            <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              TV Filmography
            </h2>
            {filmography.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {filmography.length}{" "}
                {filmography.length === 1 ? "show" : "shows"}
              </span>
            )}
          </div>

          {filmography.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Tv
                className="size-10 text-muted-foreground/40"
                strokeWidth={1.5}
              />
              <p className="text-sm text-muted-foreground">
                No TV credits found for this person.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {filmography.map((entry) => (
                <FilmographyCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Filmography card — ShowPosterCard + character/episode info underneath
// ---------------------------------------------------------------------------

function FilmographyCard({ entry }: { entry: FilmographyEntry }) {
  const hasCharacter = entry.character && entry.character.trim().length > 0;
  const hasEpisodes = entry.episode_count > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <ShowPosterCard
        show={entry}
        size="md"
        showTitle={false}
        showRating={false}
        className="w-full"
      />

      {/* Title + character + episode count */}
      <div className="px-0.5">
        <Link
          to={`/show/${entry.id}`}
          className="block text-xs font-medium text-foreground truncate leading-tight hover:text-primary transition-colors duration-150"
        >
          {entry.name}
        </Link>

        {hasCharacter && (
          <p className="mt-0.5 text-[11px] text-primary/90 truncate leading-tight">
            as {entry.character}
          </p>
        )}

        {hasEpisodes && (
          <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
            {entry.episode_count}{" "}
            {entry.episode_count === 1 ? "episode" : "episodes"}
          </p>
        )}
      </div>
    </div>
  );
}
