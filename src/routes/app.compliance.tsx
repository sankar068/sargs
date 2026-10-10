import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock } from "lucide-react";

export const Route = createFileRoute("/app/compliance")({
  component: CompliancePage,
});

function CompliancePage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("compliance_deadlines").select("*").order("due_date", { ascending: true }).then(({ data }) => setItems(data ?? []));
  }, []);

  return (
    <div className="p-8 max-w-5xl">
      <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Compliance</div>
      <h1 className="font-display text-4xl text-foreground mt-1">Deadlines & Submissions</h1>
      <p className="text-muted-foreground text-sm mt-1 mb-8">NAAC, NBA, AICTE, and JNTU compliance windows tracked in one place.</p>

      <div className="space-y-3">
        {items.map((it) => {
          const days = Math.ceil((new Date(it.due_date).getTime() - Date.now()) / 86400000);
          const urgent = days < 45;
          return (
            <div key={it.id} className={`p-5 border rounded-sm flex items-center justify-between gap-4 ${urgent ? "border-gold/50 bg-gold/5" : "border-border bg-card"}`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-sm bg-gradient-primary flex items-center justify-center shrink-0">
                  <CalendarClock className="w-4 h-4 text-gold" />
                </div>
                <div>
                  <div className="font-display text-xl text-foreground">{it.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-mono font-semibold text-gold">{it.authority}</span> · {it.notes}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Due</div>
                <div className="font-display text-lg text-foreground">{new Date(it.due_date).toLocaleDateString()}</div>
                <div className={`text-xs font-mono mt-1 ${urgent ? "text-gold font-semibold" : "text-muted-foreground"}`}>{days} days</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
