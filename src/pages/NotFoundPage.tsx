import { Link } from "react-router-dom";
import { PillarboxdLogo } from "@/components/brand/PillarboxdLogo";

export function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center gap-4">
      <div className="opacity-20">
        <PillarboxdLogo size={48} showWordmark={false} />
      </div>
      <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
        Page Not Found
      </h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-2 h-9 px-5 flex items-center rounded bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:bg-primary/90 active:scale-95 transition-all"
      >
        Go Home
      </Link>
    </div>
  );
}
