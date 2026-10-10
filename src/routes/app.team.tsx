import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, type AppRole } from "@/hooks/useAuth";

export const Route = createFileRoute("/app/team")({
  component: TeamPage,
});

function TeamPage() {
  const [people, setPeople] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data: profiles } = await supabase.from("profiles").select("id,full_name,email,department");
      const { data: allRoles } = await supabase.from("user_roles").select("user_id,role");
      const rolesByUser = new Map<string, AppRole[]>();
      (allRoles ?? []).forEach((r) => {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role as AppRole);
        rolesByUser.set(r.user_id, arr);
      });
      setPeople((profiles ?? []).map((p) => ({ ...p, roles: rolesByUser.get(p.id) ?? [] })));
    })();
  }, []);

  return (
    <div className="p-8 max-w-6xl">
      <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Institution</div>
      <h1 className="font-display text-4xl text-foreground mt-1">Team</h1>
      <p className="text-muted-foreground text-sm mt-1 mb-8">Registered members across the institution.</p>

      <div className="grid md:grid-cols-2 gap-4">
        {people.map((p) => (
          <div key={p.id} className="p-5 border border-border bg-card rounded-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-sm bg-gradient-primary flex items-center justify-center shrink-0">
              <span className="text-gold font-display text-lg">{(p.full_name ?? "?").charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-xl text-foreground truncate">{p.full_name}</div>
              <div className="text-xs text-muted-foreground truncate">{p.email}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.roles.map((r: AppRole) => (
                  <span key={r} className="text-xs px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-sm">
                    {ROLE_LABEL[r]}
                  </span>
                ))}
                {p.department && <span className="text-xs px-2 py-0.5 bg-gold/10 border border-gold/30 rounded-sm">{p.department}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
