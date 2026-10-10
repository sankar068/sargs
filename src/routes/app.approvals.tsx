import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthState, canApprove } from "@/hooks/useAuth";
import { StatusPill } from "./app.index";
import { toast } from "sonner";
import { Check, X, Lock, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/app/approvals")({
  component: ApprovalsPage,
});

const NEXT_STATUS: Record<string, string> = {
  pending_hod: "pending_dean",
  pending_dean: "pending_principal",
  pending_principal: "approved",
  approved: "locked",
};

function ApprovalsPage() {
  const { user, roles } = useAuthState();
  const [docs, setDocs] = useState<any[]>([]);
  const allowed = canApprove(roles);

  const load = async () => {
    const { data } = await supabase
      .from("documents")
      .select("*")
      .in("status", ["pending_hod", "pending_dean", "pending_principal", "approved"])
      .order("created_at", { ascending: false });
    setDocs(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const act = async (doc: any, action: "approve" | "reject" | "lock") => {
    if (!user) return;
    const from = doc.status;
    const to = action === "reject" ? "rejected" : action === "lock" ? "locked" : NEXT_STATUS[from];
    if (!to) return;
    const { error } = await supabase.from("documents").update({ status: to as any }).eq("id", doc.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("document_approvals").insert({
      document_id: doc.id, actor_id: user.id, action, from_status: from as any, to_status: to as any,
    });
    await supabase.from("audit_log").insert({
      actor_id: user.id, action: `document.${action}`, entity_type: "document", entity_id: doc.id,
      metadata: { from, to },
    });
    toast.success(`Document ${action}${action === "approve" || action === "lock" ? "d" : "ed"}`);
    load();
  };

  return (
    <div className="p-8 max-w-7xl">
      <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Workflow</div>
      <h1 className="font-display text-4xl text-foreground mt-1">Approvals</h1>
      <p className="text-muted-foreground text-sm mt-1 mb-8">
        {allowed ? "Review, approve, reject, or lock documents." : "You do not have approval authority. View only."}
      </p>

      {!allowed && (
        <div className="mb-6 p-4 border border-gold/40 bg-gold/10 rounded-sm flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-gold shrink-0 mt-0.5" />
          <div className="text-sm text-foreground/80">
            Approval actions are restricted to HOD, Dean, Principal, and Super Admin roles.
          </div>
        </div>
      )}

      <div className="space-y-3">
        {docs.length === 0 && <div className="p-12 text-center text-muted-foreground border border-border bg-card rounded-sm">No items awaiting action.</div>}
        {docs.map((d) => (
          <div key={d.id} className="p-5 border border-border bg-card rounded-sm flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="font-display text-xl text-foreground">{d.title}</div>
                <StatusPill status={d.status} />
              </div>
              <div className="text-xs text-muted-foreground mt-1 capitalize">
                {d.category.replace("_", " ")} · {d.department || "Institution"} · {new Date(d.created_at).toLocaleDateString()}
              </div>
            </div>
            {allowed && (
              <div className="flex gap-2">
                {d.status === "approved" ? (
                  <button onClick={() => act(d, "lock")} className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-sm text-sm">
                    <Lock className="w-3.5 h-3.5" /> Lock
                  </button>
                ) : (
                  <>
                    <button onClick={() => act(d, "approve")} className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-sm text-sm">
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => act(d, "reject")} className="inline-flex items-center gap-1.5 px-3 py-2 border border-destructive/40 text-destructive rounded-sm text-sm hover:bg-destructive/10">
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
