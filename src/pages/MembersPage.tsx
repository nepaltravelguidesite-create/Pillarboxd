import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSocial, type UserProfile } from "@/context/SocialContext";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { cn } from "@/lib/utils";
import { Search, UserPlus, UserCheck, Users, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

// ---------------------------------------------------------------------------
// MembersPage — /members route
// ---------------------------------------------------------------------------

export default function MembersPage() {
  const { allProfiles, loadingProfiles, isFollowing, toggleFollow } = useSocial();
  const { user } = useAuth();
  const { openAuthModal } = useUI();

  const [query, setQuery] = useState("");

  // Filter out the current user and apply the search query
  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allProfiles
      .filter((p) => (user ? p.id !== user.id : true))
      .filter((p) => {
        if (!q) return true;
        return (
          p.username.toLowerCase().includes(q) ||
          p.display_name.toLowerCase().includes(q)
        );
      });
  }, [allProfiles, user, query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Heading */}
        <header className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Members
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse the community and follow other viewers.
          </p>
        </header>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or display name…"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary/40 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        {/* Content */}
        {loadingProfiles ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="size-8 animate-spin mb-3" />
            <p className="text-sm">Loading members…</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <EmptyState
            icon={Users}
            title={query ? "No members found" : "No members yet"}
            description={query ? "Try a different search term." : "Check back once people join."}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProfiles.map((profile) => (
              <MemberCard
                key={profile.id}
                profile={profile}
                following={isFollowing(profile.id)}
                onToggleFollow={() => {
                  if (!user) {
                    openAuthModal("signup");
                    return;
                  }
                  toggleFollow(profile.id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MemberCard
// ---------------------------------------------------------------------------

interface MemberCardProps {
  profile: UserProfile;
  following: boolean;
  onToggleFollow: () => void;
}

function MemberCard({ profile, following, onToggleFollow }: MemberCardProps) {
  const initial = (profile.display_name || profile.username || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="flex flex-col items-center text-center p-4 sm:p-5 rounded-xl border border-border bg-secondary/20 hover:border-primary/50 hover:bg-secondary/30 transition-colors">
      {/* Avatar */}
      <Link
        to={`/profile/${profile.username}`}
        className="mb-3 rounded-full transition-transform hover:scale-105"
      >
        <div className="size-16 sm:size-20 rounded-full flex items-center justify-center bg-primary/20 border-2 border-primary text-primary font-bold text-xl sm:text-2xl">
          {initial}
        </div>
      </Link>

      {/* Name + username */}
      <Link
        to={`/profile/${profile.username}`}
        className="block max-w-full truncate font-medium text-foreground hover:text-primary transition-colors"
      >
        {profile.display_name}
      </Link>
      <Link
        to={`/profile/${profile.username}`}
        className="block max-w-full truncate text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        @{profile.username}
      </Link>

      {/* Follower count */}
      <p className="mt-1 text-xs text-muted-foreground">
        {profile.follower_count}{" "}
        {profile.follower_count === 1 ? "follower" : "followers"}
      </p>

      {/* Follow / Following toggle */}
      <button
        onClick={onToggleFollow}
        className={cn(
          "mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          following
            ? "border border-border bg-transparent text-foreground hover:bg-secondary/40"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {following ? (
          <>
            <UserCheck className="size-4" />
            Following
          </>
        ) : (
          <>
            <UserPlus className="size-4" />
            Follow
          </>
        )}
      </button>
    </div>
  );
}
