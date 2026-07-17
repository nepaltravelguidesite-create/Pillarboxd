import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AftershowLogo } from "@/components/brand/AftershowLogo";
import { Button } from "@/components/ui/button";

const WELCOME_KEY = "aftershow:welcome-seen";

export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(WELCOME_KEY)) {
      onDone();
      return;
    }
    setShow(true);
  }, [onDone]);

  if (!show) return null;

  const handleStart = () => {
    localStorage.setItem(WELCOME_KEY, "1");
    navigate("/login");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center gap-8 max-w-sm text-center">
        <AftershowLogo size={48} className="text-primary" />

        <div className="space-y-3">
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
            Track every show you've ever watched.
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Rate, review, and share your TV journey with friends. Build
            watchlists, create lists, and discover what's trending.
          </p>
        </div>

        <Button
          onClick={handleStart}
          size="lg"
          className="w-full h-12 text-base font-semibold"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
}
