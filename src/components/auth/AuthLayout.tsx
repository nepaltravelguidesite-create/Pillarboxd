import { type ReactNode } from "react";
import { AftershowLogo } from "@/components/brand/AftershowLogo";
import { AuthCollage } from "@/components/auth/AuthCollage";
import { useTrendingShows } from "@/hooks/use-tmdb";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const { data: trending } = useTrendingShows("week");

  return (
    <>
      {/* Mobile layout */}
      <div className="flex min-h-svh flex-col bg-background md:hidden">
        <AuthCollage shows={trending?.results ?? []} />
        <div className="flex-1 flex flex-col items-center px-6 pt-6 pb-8 -mt-8 relative z-10">
          <div className="w-full max-w-sm space-y-5">
            <div className="flex justify-center">
              <AftershowLogo size={32} />
            </div>
            <div className="text-center space-y-1">
              <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex min-h-svh bg-background">
        <div className="w-[55%] h-svh">
          <AuthCollage shows={trending?.results ?? []} variant="desktop" />
        </div>
        <div className="flex-1 h-svh flex items-center justify-center px-8 lg:px-12">
          <div className="w-full max-w-[420px] space-y-5">
            <div>
              <AftershowLogo size={32} />
            </div>
            <div className="space-y-1">
              <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
