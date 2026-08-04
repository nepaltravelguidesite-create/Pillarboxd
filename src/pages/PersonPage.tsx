import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Tv, UserPlus, UserCheck } from "lucide-react";
import {
  getPerson,
  profileUrl,
  type PersonDetail,
  type TVShow,
} from "@/lib/tmdb";
import { ShowPosterCard } from "@/components/shows/ShowPosterCard";
import { SEOMeta } from "@/components/SEOMeta";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A TV filmography cast entry - a TVShow augmented with role metadata. */
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
  const { user } = useAuth();

  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

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
    setIsFollowing(false);

    getPerson(id)
      .then((data) => {
        if (cancelled) return;
        setPerson(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Failed to load person.";
        setError(msg);
        setLoading(false);
      });

    // Check if current user follows this person
    if (user) {
      supabase
        .from("person_follows")
        .select("id")
        .eq("user_id", user.id)
        .eq("person_id", id)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled) setIsFollowing(!!data);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [id, user]);

  const toggleFollowPerson = useCallback(async () => {
    if (!user || !person) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error: unfollowErr } = await supabase
          .from("person_follows")
          .delete()
          .eq("user_id", user.id)
          .eq("person_id", id);
        if (unfollowErr) throw unfollowErr;
        setIsFollowing(false);
        toast.success(`Unfollowed ${person.name}`);
      } else {
        const { error: followErr } = await supabase
          .from("person_follows")
          .insert({
            user_id: user.id,
            person_id: id,
            person_name: person.name,
          });
        if (followErr) throw followErr;
        setIsFollowing(true);
        toast.success(`Following ${person.name}`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to toggle follow",
      );
    } finally {
      setFollowLoading(false);
    }
  }, [user, person, isFollowing, id]);

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
  const filmography: FilmographyEntry[] = [
    ...(person.tv_credits?.cast ?? []),
  ].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

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
                  <span className="font-semibold text-foreground/80">
                    Born:
                  </span>{" "}
                  {bornLine}
                </p>
              )}

              {knownForCount > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground/80">
                    Known for:
                  </span>{" "}
                  {knownForCount} TV{" "}
                  {knownForCount === 1 ? "credit" : "credits"}
                </p>
              )}

              <div className="mt-3 flex items-center gap-3">
                {user && (
                  <button
                    onClick={toggleFollowPerson}
                    disabled={followLoading}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 shrink-0",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                      isFollowing
                        ? "bg-secondary text-foreground border border-border"
                        : "bg-primary text-primary-foreground hover:-translate-y-px hover:shadow-md hover:shadow-primary/25",
                    )}
                  >
                    {followLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isFollowing ? (
                      <UserCheck className="size-4" />
                    ) : (
                      <UserPlus className="size-4" />
                    )}
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                )}
                {person.homepage && (
                  <a
                    href={person.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Official website ↗
                  </a>
                )}
              </div>

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
// Filmography card - ShowPosterCard + character/episode info underneath
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
