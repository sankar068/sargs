import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/audit")({
  component: AuditPage,
});

function AuditPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200).then(({ data }) => setRows(data ?? []));
  }, []);

  return (
    <div className="p-8 max-w-6xl">
      <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Traceability</div>
      <h1 className="font-display text-4xl text-foreground mt-1">Audit Log</h1>
      <p className="text-muted-foreground text-sm mt-1 mb-8">Immutable record of every action taken on every document.</p>

      <div className="border border-border bg-card rounded-sm overflow-hidden">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No activity yet. Upload a document to begin.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-parchment border-b border-border">
              <tr className="text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5"><code className="text-xs bg-muted px-2 py-0.5 rounded-sm">{r.action}</code></td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.entity_type}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono truncate max-w-xs">{JSON.stringify(r.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
