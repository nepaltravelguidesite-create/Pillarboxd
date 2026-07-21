import { useState, useEffect, useCallback } from "react";
import { useSocial, type ShowList } from "@/context/SocialContext";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import type { TVShow } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { List, Plus, Globe, Lock, Loader2, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AddToListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  show: TVShow;
}

export function AddToListModal({ open, onOpenChange, show }: AddToListModalProps) {
  const { user } = useAuth();
  const { openAuthModal } = useUI();
  const { myLists, loadingLists, addShowToList, removeShowFromList, createList } = useSocial();

  const [membership, setMembership] = useState<Set<string>>(new Set());
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load which lists contain this show
  const loadMembership = useCallback(async () => {
    if (!user || !show.id) { setMembershipLoading(false); return; }
    setMembershipLoading(true);
    const { data } = await supabase
      .from("list_items")
      .select("list_id")
      .eq("show_id", show.id);
    const listIds = new Set((data ?? []).map((i: { list_id: string }) => i.list_id));
    // Only track lists the user owns
    const ownedIds = new Set(myLists.map((l) => l.id));
    setMembership(new Set([...listIds].filter((id) => ownedIds.has(id))));
    setMembershipLoading(false);
  }, [user, show.id, myLists]);

  useEffect(() => {
    if (open && user) {
      loadMembership();
      setCreatingNew(false);
      setNewTitle("");
      setNewIsPublic(false);
    }
  }, [open, user, loadMembership]);

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Sign in required</DialogTitle>
            <DialogDescription>
              Create an account or sign in to add shows to your lists.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => { onOpenChange(false); openAuthModal("signin"); }}>
            Sign in
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  async function handleToggle(list: ShowList, checked: boolean) {
    if (checked) {
      setMembership((prev) => new Set(prev).add(list.id));
      await addShowToList(list.id, show);
    } else {
      setMembership((prev) => { const next = new Set(prev); next.delete(list.id); return next; });
      await removeShowFromList(list.id, show.id);
    }
  }

  async function handleCreateAndAdd() {
    const trimmed = newTitle.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    const created = await createList(trimmed, "", newIsPublic);
    if (created) {
      await addShowToList(created.id, show);
      setMembership((prev) => new Set(prev).add(created.id));
      setNewTitle("");
      setNewIsPublic(false);
      setCreatingNew(false);
    }
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Add to Lists</DialogTitle>
          <DialogDescription>
            Add <span className="font-medium text-foreground">{show.name}</span> to your lists.
          </DialogDescription>
        </DialogHeader>

        {/* + New List row */}
        {!creatingNew ? (
          <button
            type="button"
            onClick={() => setCreatingNew(true)}
            className={cn(
              "flex items-center gap-3 w-full rounded-lg border border-dashed border-border px-4 py-3",
              "text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary">
              <Plus className="size-4" />
            </div>
            <span className="text-sm font-medium text-foreground">Create new list</span>
          </button>
        ) : (
          <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-list-title" className="text-sm font-medium text-foreground">
                List name
              </label>
              <Input
                id="new-list-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Must-watch dramas"
                maxLength={100}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateAndAdd(); }}
              />
            </div>
            <button
              type="button"
              onClick={() => setNewIsPublic((p) => !p)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                newIsPublic ? "border-primary bg-primary/5" : "border-border bg-secondary/20"
              )}
            >
              <span className="flex items-center gap-2">
                {newIsPublic ? <Globe className="size-4 text-primary" /> : <Lock className="size-4 text-muted-foreground" />}
                <span className="text-sm">{newIsPublic ? "Public" : "Private"}</span>
              </span>
              <span className={cn(
                "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                newIsPublic ? "bg-primary" : "bg-muted-foreground/30"
              )}>
                <span className={cn(
                  "inline-block size-4 transform rounded-full bg-background shadow transition-transform",
                  newIsPublic ? "translate-x-4" : "translate-x-0.5"
                )} />
              </span>
            </button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCreatingNew(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateAndAdd} disabled={!newTitle.trim() || submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Create & Add
              </Button>
            </div>
          </div>
        )}

        {/* Existing lists checklist */}
        {loadingLists || membershipLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : myLists.length === 0 && !creatingNew ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <List className="size-10 mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No lists yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first list above to start organizing shows.
            </p>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {myLists.map((list) => {
              const checked = membership.has(list.id);
              return (
                <label
                  key={list.id}
                  htmlFor={`list-${list.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors",
                    "hover:bg-secondary/40",
                    checked && "bg-primary/5"
                  )}
                >
                  <Checkbox
                    id={`list-${list.id}`}
                    checked={checked}
                    onCheckedChange={(v) => handleToggle(list, v === true)}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground line-clamp-1 block">
                      {list.title}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      {list.is_public ? <Globe className="size-3" /> : <Lock className="size-3" />}
                      {list.item_count} {list.item_count === 1 ? "show" : "shows"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
