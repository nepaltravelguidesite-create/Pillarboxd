import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Loader2,
  Upload,
  ImageIcon,
  Globe,
  Tv,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { SEOMeta } from "@/components/SEOMeta";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { bestPosterUrl } from "@/lib/tmdb";
import { EditFavoritesModal } from "@/components/shows/EditFavoritesModal";
import type { FavoriteShow } from "@/context/SocialContext";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ---------------------------------------------------------------------------
// SettingsPage - /settings route
// Authenticated users can manage their profile (avatar, username, display
// name, bio) and social links (Twitter/X, Instagram, website). Avatar files
// are validated client-side and uploaded to the public `avatars` storage
// bucket under `{userId}/{filename}`. Username uniqueness is checked before
// save and handled gracefully if the DB unique constraint still trips.
// ---------------------------------------------------------------------------

const BIO_MAX = 280;
const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

type ProfileForm = {
  username: string;
  displayName: string;
  bio: string;
  twitterUrl: string;
  instagramUrl: string;
  websiteUrl: string;
};

const EMPTY_FORM: ProfileForm = {
  username: "",
  displayName: "",
  bio: "",
  twitterUrl: "",
  instagramUrl: "",
  websiteUrl: "",
};

/** Ensure a URL has an http:// or https:// scheme, prepending https:// if not. */
function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Very light URL validation - must start with http(s) and have a host-ish bit. */
function isValidUrl(value: string): boolean {
  if (!value) return true; // optional fields
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function SettingsPage() {
  const { user, session, authState, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [favorites, setFavorites] = useState<FavoriteShow[]>([]);
  const [editFavoritesOpen, setEditFavoritesOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // -------------------------------------------------------------------------
  // Auth resolution
  // -------------------------------------------------------------------------
  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading settings…</div>
      </div>
    );
  }

  // Not authenticated - redirect home.
  if (!user || !session) {
    return <Navigate to="/" replace />;
  }

  // -------------------------------------------------------------------------
  // Load current profile on mount / when user id resolves
  // -------------------------------------------------------------------------
  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoadingProfile(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "username, display_name, avatar_url, bio, twitter_url, instagram_url, website_url, favorite_shows",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      toast.error("Could not load your profile.");
    }

    if (data) {
      setAvatarUrl(data.avatar_url ?? undefined);
      setFavorites((data.favorite_shows as FavoriteShow[] | null) ?? []);
      setForm({
        username: data.username ?? "",
        displayName: data.display_name ?? "",
        bio: data.bio ?? "",
        twitterUrl: data.twitter_url ?? "",
        instagramUrl: data.instagram_url ?? "",
        websiteUrl: data.website_url ?? "",
      });
    } else if (user) {
      // No profile row yet - seed from auth context fallback values.
      setAvatarUrl(user.avatarUrl);
      setForm({
        username: user.username ?? "",
        displayName: user.displayName ?? "",
        bio: user.bio ?? "",
        twitterUrl: user.twitterUrl ?? "",
        instagramUrl: user.instagramUrl ?? "",
        websiteUrl: user.websiteUrl ?? "",
      });
    }
    setLoadingProfile(false);
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleFavoritesSaved = useCallback(
    (saved: FavoriteShow[]) => {
      setFavorites(saved);
      refreshProfile();
      toast.success("Favorites updated.");
    },
    [refreshProfile],
  );

  // -------------------------------------------------------------------------
  // Field helpers
  // -------------------------------------------------------------------------
  function updateField<K extends keyof ProfileForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const bioCount = form.bio.length;
  const bioTooLong = bioCount > BIO_MAX;

  // -------------------------------------------------------------------------
  // Avatar upload
  // -------------------------------------------------------------------------
  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Always reset the input so picking the same file again re-triggers change.
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file || !user) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      toast.error("Avatar must be an image file.");
      return;
    }
    // Validate size
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error("Avatar image must be 5 MB or smaller.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
      const fileName = `avatar-${Date.now()}.${safeExt}`;
      const path = `${user.id}/${fileName}`;

      // Upload (upsert in case the path collides with a prior attempt)
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const publicUrl = publicData.publicUrl;
      setAvatarUrl(publicUrl);

      // Persist the new avatar URL immediately so the preview sticks on refresh.
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      await refreshProfile();
      toast.success("Avatar updated.");
    } catch (err) {
      console.error("[SettingsPage] avatar upload failed", err);
      toast.error("Could not upload avatar. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------
  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (saving || !user) return;

    const username = form.username.trim();
    if (!username) {
      toast.error("Username is required.");
      return;
    }

    if (bioTooLong) {
      toast.error(`Bio must be ${BIO_MAX} characters or fewer.`);
      return;
    }

    // Normalize + validate social URLs
    const twitterUrl = normalizeUrl(form.twitterUrl);
    const instagramUrl = normalizeUrl(form.instagramUrl);
    const websiteUrl = normalizeUrl(form.websiteUrl);

    for (const [label, value] of [
      ["Twitter / X", twitterUrl],
      ["Instagram", instagramUrl],
      ["Website", websiteUrl],
    ] as const) {
      if (!isValidUrl(value)) {
        toast.error(
          `${label} URL is not valid. Make sure it starts with http:// or https://.`,
        );
        return;
      }
    }

    // Check username uniqueness against other users before saving.
    try {
      const { data: existing, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        toast.error("That username is taken. Please choose another.");
        return;
      }
    } catch (err) {
      console.error("[SettingsPage] username check failed", err);
      toast.error("Could not verify username. Please try again.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        username,
        display_name: form.displayName.trim() || username,
        bio: form.bio.trim() || null,
        twitter_url: twitterUrl || null,
        instagram_url: instagramUrl || null,
        website_url: websiteUrl || null,
        // Keep the avatar in sync with what's already in state.
        avatar_url: avatarUrl ?? null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", user.id);

      if (error) {
        // Handle the unique constraint on username if the pre-check raced.
        if (
          error.code === "23505" ||
          /profiles_username_key/i.test(error.message)
        ) {
          toast.error(
            "That username is already in use. Please choose another.",
          );
        } else {
          throw error;
        }
        return;
      }

      await refreshProfile();
      toast.success("Settings saved.");
    } catch (err) {
      console.error("[SettingsPage] save failed", err);
      toast.error("Could not save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------------------------
  // Delete account
  // -------------------------------------------------------------------------
  async function handleDeleteAccount() {
    if (!user || !session) return;
    setDeleting(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "delete-account",
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      if (invokeError) throw invokeError;
      if (data && data.error) throw new Error(data.error);

      await signOut();
      toast.success("Your account has been deleted.");
      navigate("/", { replace: true });
    } catch (err) {
      console.error("[SettingsPage] account deletion failed", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not delete account. Please try again.",
      );
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const busy = loadingProfile;

  return (
    <div className="bg-background text-foreground">
      <SEOMeta title="Settings" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <header>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-tight">
            Settings
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Manage your profile, avatar, and social links.
          </p>
        </header>

        {busy ? (
          <div className="mt-12 flex items-center justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-10 space-y-6">
            {/* Profile */}
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  How you appear across Aftershow.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <Avatar className="size-20 rounded-full">
                    {avatarUrl ? (
                      <AvatarImage
                        src={avatarUrl}
                        alt={form.displayName || "Your avatar"}
                      />
                    ) : null}
                    <AvatarFallback className="text-base font-semibold">
                      {initialsFromName(form.displayName || form.username)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2">
                    <Label
                      htmlFor="avatar-upload"
                      className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest"
                    >
                      Avatar
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, or GIF. Max 5 MB.
                    </p>
                    <input
                      ref={fileInputRef}
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={uploadingAvatar || saving}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar || saving}
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Upload className="size-4" />
                        )}
                        {uploadingAvatar ? "Uploading…" : "Choose image"}
                      </Button>
                      {avatarUrl && !uploadingAvatar && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <ImageIcon className="size-3.5" />
                          Uploaded
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Username */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="settings-username"
                    className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest"
                  >
                    Username
                  </Label>
                  <Input
                    id="settings-username"
                    type="text"
                    autoComplete="username"
                    value={form.username}
                    onChange={(e) => updateField("username", e.target.value)}
                    required
                    disabled={saving}
                    placeholder="yourname"
                    className="lowercase"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your unique handle on Aftershow.
                  </p>
                </div>

                {/* Display name */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="settings-display-name"
                    className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest"
                  >
                    Display name
                  </Label>
                  <Input
                    id="settings-display-name"
                    type="text"
                    value={form.displayName}
                    onChange={(e) => updateField("displayName", e.target.value)}
                    disabled={saving}
                    placeholder="Your name"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="settings-bio"
                      className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest"
                    >
                      Bio
                    </Label>
                    <span
                      className={cn(
                        "text-[11px] tabular-nums",
                        bioTooLong
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {bioCount}/{BIO_MAX}
                    </span>
                  </div>
                  <Textarea
                    id="settings-bio"
                    value={form.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    rows={4}
                    maxLength={BIO_MAX + 50}
                    disabled={saving}
                    placeholder="Tell people a little about yourself…"
                    aria-invalid={bioTooLong}
                    className="resize-y"
                  />
                  {bioTooLong && (
                    <p className="text-xs text-destructive">
                      Bio is {bioCount - BIO_MAX} character
                      {bioCount - BIO_MAX === 1 ? "" : "s"} too long.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Social links */}
            <Card>
              <CardHeader>
                <CardTitle>Social links</CardTitle>
                <CardDescription>
                  Optional. Where people can find you elsewhere.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Twitter / X */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="settings-twitter"
                    className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest"
                  >
                    <Globe className="size-3.5" />
                    Twitter / X
                  </Label>
                  <Input
                    id="settings-twitter"
                    type="url"
                    inputMode="url"
                    value={form.twitterUrl}
                    onChange={(e) => updateField("twitterUrl", e.target.value)}
                    disabled={saving}
                    placeholder="https://x.com/yourhandle"
                  />
                </div>

                {/* Instagram */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="settings-instagram"
                    className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest"
                  >
                    <Globe className="size-3.5" />
                    Instagram
                  </Label>
                  <Input
                    id="settings-instagram"
                    type="url"
                    inputMode="url"
                    value={form.instagramUrl}
                    onChange={(e) =>
                      updateField("instagramUrl", e.target.value)
                    }
                    disabled={saving}
                    placeholder="https://instagram.com/yourhandle"
                  />
                </div>

                {/* Website */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="settings-website"
                    className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest"
                  >
                    <Globe className="size-3.5" />
                    Website
                  </Label>
                  <Input
                    id="settings-website"
                    type="url"
                    inputMode="url"
                    value={form.websiteUrl}
                    onChange={(e) => updateField("websiteUrl", e.target.value)}
                    disabled={saving}
                    placeholder="https://yoursite.com"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Favorite Shows */}
            <Card>
              <CardHeader>
                <CardTitle>Favorite Shows</CardTitle>
                <CardDescription>
                  Pick up to 4 shows to showcase on your profile.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {favorites.length > 0 ? (
                  <div className="flex items-center gap-3">
                    <div className="flex flex-1 gap-2">
                      {favorites.map((show) => (
                        <div
                          key={show.tmdb_id}
                          className="w-12 h-18 rounded-md overflow-hidden bg-muted shrink-0"
                        >
                          {show.poster_path ? (
                            <img
                              src={bestPosterUrl(
                                {
                                  id: show.tmdb_id,
                                  poster_path: show.poster_path,
                                },
                                "w92",
                              )}
                              alt={show.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Tv className="size-4 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditFavoritesOpen(true)}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-6">
                    <Tv
                      className="size-8 text-muted-foreground/30"
                      strokeWidth={1}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditFavoritesOpen(true)}
                    >
                      Pick your favorites
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="submit"
                disabled={
                  saving ||
                  uploadingAvatar ||
                  bioTooLong ||
                  !form.username.trim()
                }
                className="font-bold uppercase tracking-widest"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        )}

        <EditFavoritesModal
          open={editFavoritesOpen}
          onOpenChange={setEditFavoritesOpen}
          userId={user.id}
          currentFavorites={favorites}
          onSaved={handleFavoritesSaved}
        />

        {/* Danger zone - Delete Account */}
        <div className="mt-12">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 className="font-display text-lg font-bold text-destructive">
                  Delete Account
                </h2>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Permanently delete your account and all associated data -
                  reviews, logs, lists, comments, and follows. This action
                  cannot be undone.
                </p>
              </div>
              <AlertDialog
                open={deleteOpen}
                onOpenChange={(open) => {
                  setDeleteOpen(open);
                  if (!open) {
                    setDeleteConfirmText("");
                    setDeleting(false);
                  }
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="shrink-0">
                    <Trash2 className="size-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive flex items-center gap-2">
                      <AlertTriangle className="size-5" />
                      Delete your account?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account and all your
                      data - reviews, logs, lists, comments, and follows. This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2 py-2">
                    <p className="text-sm text-muted-foreground">
                      Type{" "}
                      <span className="font-semibold text-foreground">
                        DELETE
                      </span>{" "}
                      to confirm:
                    </p>
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      autoComplete="off"
                      disabled={deleting}
                      className="border-destructive/30"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={deleteConfirmText !== "DELETE" || deleting}
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteAccount();
                      }}
                    >
                      {deleting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Delete Forever"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
