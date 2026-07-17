import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SEOMeta } from "@/components/SEOMeta";
import { supabase } from "@/lib/supabase";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const INPUT_CLASS =
  "h-9 w-full rounded border border-border bg-background/50 px-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("contact_messages")
      .insert({ name, email, message });

    if (error) {
      toast.error("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    toast.success("Message sent. Thanks for reaching out!");
    setName("");
    setEmail("");
    setMessage("");
    setSubmitting(false);
  }

  return (
    <div className="bg-background text-foreground">
      <SEOMeta
        title="Contact - Aftershow"
        description="Questions, feedback, or just want to say hi? Drop us a message."
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <header>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-tight">
            Get in touch
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Questions, feedback, or just want to say hi? Drop us a message.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="contact-name"
              className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
            >
              Name
            </label>
            <input
              id="contact-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={submitting}
              className={INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="contact-email"
              className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
            >
              Email
            </label>
            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={submitting}
              className={INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="contact-message"
              className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
            >
              Message
            </label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              disabled={submitting}
              rows={6}
              className="w-full rounded border border-border bg-background/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="h-9 px-5 inline-flex items-center gap-2 rounded bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? "Sending..." : "Send message"}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-border">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Find us elsewhere
          </p>
          <div className="mt-4 flex items-center gap-4">
            <a
              href="#"
              className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground transition-colors"
            >
              <GithubIcon className="size-4" />
              GitHub
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground transition-colors"
            >
              <TwitterIcon className="size-4" />
              Twitter / X
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
