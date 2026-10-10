import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

export function Brand({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const colorClass = variant === "light" ? "text-parchment" : "text-primary";
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <div className="relative">
        <div className="w-9 h-9 rounded-sm bg-gradient-primary flex items-center justify-center shadow-soft">
          <ShieldCheck className="w-5 h-5 text-gold" strokeWidth={2} />
        </div>
        <div className="absolute -inset-0.5 border border-gold/40 rounded-sm pointer-events-none" />
      </div>
      <div className="leading-none">
        <div className={`font-display text-xl font-semibold tracking-tight ${colorClass}`}>SARGS</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
          Academic Repository
        </div>
      </div>
    </Link>
  );
}
