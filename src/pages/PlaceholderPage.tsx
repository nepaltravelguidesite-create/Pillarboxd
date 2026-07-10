import { useLocation } from "react-router-dom";

export function PlaceholderPage() {
  const { pathname } = useLocation();
  const label = pathname.replace("/", "").replace(/-/g, " ") || "page";
  const title = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center gap-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground/60 font-semibold">
        Coming Soon
      </p>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        This section will be built in upcoming tasks.
      </p>
    </div>
  );
}
