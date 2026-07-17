import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface CommentThreadProps {
  logId: string;
}

interface CommentWithAuthor {
  id: string;
  user_id: string;
  log_id: string;
  content: string;
  created_at: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url: string | null;
}

type CommentRow = {
  id: string;
  user_id: string;
  log_id: string;
  content: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return iso;
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export function CommentThread({ logId }: CommentThreadProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows } = await supabase
        .from("comments")
        .select("*")
        .eq("log_id", logId)
        .order("created_at", { ascending: true });

      if (!rows || rows.length === 0) {
        setComments([]);
        return;
      }

      const typedRows = rows as CommentRow[];

      // Fetch author profiles
      const userIds = [...new Set(typedRows.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      const profileMap = new Map<string, ProfileRow>();
      (profiles ?? []).forEach((p) => {
        const row = p as ProfileRow;
        profileMap.set(row.id, row);
      });

      const merged: CommentWithAuthor[] = typedRows.map((c) => {
        const profile = profileMap.get(c.user_id);
        return {
          id: c.id,
          user_id: c.user_id,
          log_id: c.log_id,
          content: c.content,
          created_at: c.created_at,
          author_username: profile?.username ?? "unknown",
          author_display_name: profile?.display_name ?? profile?.username ?? "Unknown",
          author_avatar_url: profile?.avatar_url ?? null,
        };
      });

      setComments(merged);
    } finally {
      setLoading(false);
    }
  }, [logId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async () => {
    if (!user || !draft.trim()) return;
    const content = draft.trim();
    setDraft("");
    setSubmitting(true);

    // Optimistic insert
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: CommentWithAuthor = {
      id: optimisticId,
      user_id: user.id,
      log_id: logId,
      content,
      created_at: new Date().toISOString(),
      author_username: user.username,
      author_display_name: user.displayName || user.username,
      author_avatar_url: user.avatarUrl ?? null,
    };
    setComments((prev) => [...prev, optimistic]);

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          user_id: user.id,
          log_id: logId,
          content,
        })
        .select("*")
        .single();

      if (error || !data) {
        // Roll back optimistic insert
        setComments((prev) => prev.filter((c) => c.id !== optimisticId));
        setDraft(content);
        return;
      }

      const row = data as CommentRow;
      // Replace optimistic row with real row
      setComments((prev) =>
        prev.map((c) =>
          c.id === optimisticId
            ? {
                ...c,
                id: row.id,
                created_at: row.created_at,
              }
            : c
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user) return;
    // Optimistic delete
    const target = comments.find((c) => c.id === commentId);
    if (!target) return;
    setComments((prev) => prev.filter((c) => c.id !== commentId));

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (error) {
      // Roll back
      setComments((prev) => {
        const next = [...prev];
        const insertIdx = next.findIndex((c) => c.created_at > target.created_at);
        if (insertIdx === -1) {
          return [...next, target];
        }
        next.splice(insertIdx, 0, target);
        return next;
      });
    }
  };

  return (
    <div>
      {/* Comments list */}
      {loading ? (
        <div className="space-y-3 mt-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center mt-6">
          No comments yet. Start the conversation
        </p>
      ) : (
        <div className="space-y-3 mt-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Link to={`/profile/${c.author_username}`} className="shrink-0">
                {c.author_avatar_url ? (
                  <img
                    src={c.author_avatar_url}
                    alt={c.author_display_name}
                    className="size-7 rounded-full object-cover bg-muted"
                  />
                ) : (
                  <div className="size-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold">
                    {initials(c.author_display_name || c.author_username)}
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <div className="bg-secondary/30 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/profile/${c.author_username}`}
                      className="text-xs font-medium text-foreground hover:underline"
                    >
                      {c.author_display_name || c.author_username}
                    </Link>
                    {user && c.user_id === user.id && (
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap break-words">
                    {c.content}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 inline-block">
                  {timeAgo(c.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      {user ? (
        <div className="flex gap-2 mt-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Add a comment…"
            rows={2}
            className="flex-1 rounded border border-border bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !draft.trim()}
            className="self-stretch bg-primary text-primary-foreground rounded px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Post
          </button>
        </div>
      ) : null}
    </div>
  );
}
