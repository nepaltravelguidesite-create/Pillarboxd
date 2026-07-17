import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useSocial } from "@/context/SocialContext";
import { getWatchProviders } from "@/lib/tmdb";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Minus,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Common streaming providers
// provider_id values correspond to TMDB watch-provider IDs so stored
// subscriptions can be cross-referenced with TMDB watch provider data.
// ---------------------------------------------------------------------------

const COMMON_PROVIDERS = [
  { provider_id: 8, provider_name: "Netflix" },
  { provider_id: 9, provider_name: "Amazon Prime" },
  { provider_id: 337, provider_name: "Disney+" },
  { provider_id: 384, provider_name: "HBO Max" },
  { provider_id: 15, provider_name: "Hulu" },
  { provider_id: 350, provider_name: "Apple TV+" },
  { provider_id: 531, provider_name: "Paramount+" },
  { provider_id: 386, provider_name: "Peacock" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserSubscription {
  id: string;
  user_id: string;
  provider_id: number;
  provider_name: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Provider name matching
// TMDB provider names don't always match our preset labels exactly
// (e.g. "Disney+" vs "Disney Plus", "HBO Max" vs "Max"), so we normalize
// by stripping non-alphanumeric characters and do a bidirectional contains
// check.
// ---------------------------------------------------------------------------

function normalizeProviderName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function providerMatches(subName: string, tmdbName: string): boolean {
  const a = normalizeProviderName(subName);
  const b = normalizeProviderName(tmdbName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SubscriptionInsight() {
  const { user } = useAuth();
  const { userEpisodes } = useSocial();

  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [insightMap, setInsightMap] = useState<Map<number, boolean>>(
    new Map()
  );
  const [loadingInsight, setLoadingInsight] = useState(false);

  // -------------------------------------------------------------------------
  // Load subscriptions on mount
  // -------------------------------------------------------------------------

  const loadSubscriptions = useCallback(async () => {
    if (!user) return;
    setLoadingSubs(true);
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Failed to load subscriptions");
    } else {
      setSubscriptions((data ?? []) as UserSubscription[]);
    }
    setLoadingSubs(false);
  }, [user]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  // -------------------------------------------------------------------------
  // Cross-reference subscriptions with recently watched shows
  // For each subscription, check whether any show watched in the last 30
  // days has that provider in TMDB's flatrate watch providers.
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (subscriptions.length === 0 || userEpisodes.length === 0) {
      setInsightMap(new Map());
      setLoadingInsight(false);
      return;
    }

    let cancelled = false;

    async function computeInsight() {
      setLoadingInsight(true);

      // Recent = last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentEpisodes = userEpisodes.filter(
        (e) => new Date(e.watched_at) >= thirtyDaysAgo
      );

      if (recentEpisodes.length === 0) {
        if (!cancelled) {
          setInsightMap(new Map());
          setLoadingInsight(false);
        }
        return;
      }

      // Unique show IDs from recent episodes, capped to keep API calls sane
      const recentShowIds = [
        ...new Set(recentEpisodes.map((e) => e.show_id)),
      ].slice(0, 10);

      // Fetch watch providers in small batches
      const BATCH_SIZE = 5;
      const allProviderNames = new Set<string>();

      for (let i = 0; i < recentShowIds.length; i += BATCH_SIZE) {
        const batch = recentShowIds.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((id) => getWatchProviders(id))
        );
        for (const result of results) {
          if (result.status === "fulfilled") {
            for (const p of result.value.flatrate ?? []) {
              if (p.provider_name) allProviderNames.add(p.provider_name);
            }
          }
        }
      }

      if (cancelled) return;

      // Match each subscription against the collected TMDB provider names
      const newInsight = new Map<number, boolean>();
      for (const sub of subscriptions) {
        const watched = [...allProviderNames].some((tmdbName) =>
          providerMatches(sub.provider_name, tmdbName)
        );
        newInsight.set(sub.provider_id, watched);
      }

      setInsightMap(newInsight);
      setLoadingInsight(false);
    }

    computeInsight();

    return () => {
      cancelled = true;
    };
  }, [subscriptions, userEpisodes]);

  // -------------------------------------------------------------------------
  // Add / remove handlers
  // -------------------------------------------------------------------------

  const handleAdd = async (providerId: number, providerName: string) => {
    if (!user) return;

    // Optimistic add
    const tempId = crypto.randomUUID();
    const newSub: UserSubscription = {
      id: tempId,
      user_id: user.id,
      provider_id: providerId,
      provider_name: providerName,
      created_at: new Date().toISOString(),
    };
    setSubscriptions((prev) => [...prev, newSub]);

    const { data, error } = await supabase
      .from("user_subscriptions")
      .insert({
        user_id: user.id,
        provider_id: providerId,
        provider_name: providerName,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add subscription");
      setSubscriptions((prev) => prev.filter((s) => s.id !== tempId));
    } else if (data) {
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === tempId ? (data as UserSubscription) : s))
      );
    }
  };

  const handleRemove = async (providerId: number) => {
    if (!user) return;
    const target = subscriptions.find((s) => s.provider_id === providerId);
    if (!target) return;

    // Optimistic remove
    setSubscriptions((prev) =>
      prev.filter((s) => s.provider_id !== providerId)
    );
    setInsightMap((prev) => {
      const next = new Map(prev);
      next.delete(providerId);
      return next;
    });

    const { error } = await supabase
      .from("user_subscriptions")
      .delete()
      .eq("id", target.id);

    if (error) {
      toast.error("Failed to remove subscription");
      setSubscriptions((prev) => [...prev, target]);
    }
  };

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const subscribedIds = new Set(subscriptions.map((s) => s.provider_id));
  const availableProviders = COMMON_PROVIDERS.filter(
    (p) => !subscribedIds.has(p.provider_id)
  );
  const usedCount = subscriptions.filter(
    (s) => insightMap.get(s.provider_id) === true
  ).length;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Subscription Value Insight</CardTitle>
        <CardDescription>
          A lightweight look at which streaming services you've actually used
          recently, not financial tracking, just a usage snapshot.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Loading state */}
        {loadingSubs ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading your subscriptions…
          </div>
        ) : (
          <>
            {/* Insight summary */}
            {subscriptions.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 px-4 py-3">
                <Sparkles className="size-4 shrink-0 text-primary" />
                <p className="text-sm text-foreground/90">
                  {loadingInsight ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="size-3.5 animate-spin" />
                      Checking recent watches…
                    </span>
                  ) : (
                    <>
                      You watched something on{" "}
                      <span className="font-bold text-primary">
                        {usedCount}
                      </span>{" "}
                      of your{" "}
                      <span className="font-bold text-foreground">
                        {subscriptions.length}
                      </span>{" "}
                      subscriptions recently
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Subscription list */}
            {subscriptions.length > 0 && (
              <ul className="space-y-1.5">
                {subscriptions.map((sub) => {
                  const watched = insightMap.get(sub.provider_id) ?? false;
                  return (
                    <li
                      key={sub.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border/40 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {watched ? (
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                        ) : (
                          <Minus className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium text-foreground truncate">
                          {sub.provider_name}
                        </span>
                        {!loadingInsight && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {watched ? "Watched recently" : "Unused"}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemove(sub.provider_id)}
                        aria-label={`Remove ${sub.provider_name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Add subscriptions */}
            {availableProviders.length > 0 ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                  {subscriptions.length === 0
                    ? "Add your streaming subscriptions"
                    : "Add more"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableProviders.map((provider) => (
                    <Button
                      key={provider.provider_id}
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleAdd(provider.provider_id, provider.provider_name)
                      }
                    >
                      <Plus className="size-3.5" />
                      {provider.provider_name}
                    </Button>
                  ))}
                </div>
              </div>
            ) : subscriptions.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                You've added all common providers.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
