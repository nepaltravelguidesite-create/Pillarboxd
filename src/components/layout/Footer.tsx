import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AftershowLogo } from "@/components/brand/AftershowLogo";

const FOOTER_LINKS = [
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "Shows", to: "/shows" },
  { label: "Members", to: "/members" },
  { label: "Journal", to: "/journal" },
  { label: "Lists", to: "/lists" },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between sm:items-start">
          {/* Brand */}
          <div className="flex flex-col items-center sm:items-start gap-2">
            <Link
              to="/"
              className="group focus:outline-none"
              aria-label="Aftershow home"
            >
              <AftershowLogo size={22} />
            </Link>
            <p className="text-xs text-muted-foreground text-center sm:text-left max-w-xs">
              Track, rate, and review every TV series you've ever watched.
            </p>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap justify-center sm:justify-end gap-x-5 gap-y-2">
              {FOOTER_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className={cn(
                      "text-xs text-muted-foreground hover:text-foreground",
                      "transition-colors duration-150"
                    )}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 pt-5 border-t border-border/50 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground/60 text-center">
            TV show data provided by{" "}
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              TMDB
            </a>
            .
          </p>
          <p className="text-xs text-muted-foreground/40">
            &copy; {new Date().getFullYear()} Aftershow.
          </p>
        </div>
      </div>
    </footer>
  );
}
