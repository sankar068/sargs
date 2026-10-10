import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthState, ROLE_LABEL, type AppRole } from "@/hooks/useAuth";
import { Loader2, ShieldCheck, ShieldAlert, Search, Save, UserCog } from "lucide-react";

export const Route = createFileRoute("/app/roles")({
  component: RolesPage,
});

const ALL_ROLES: AppRole[] = [
  "super_admin", "principal", "dean", "hod",
  "iqac_coordinator", "admin_staff", "faculty", "student",
];

interface Row {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  roles: AppRole[];
}

function RolesPage() {
  const { primaryRole, user, roles: myRoles, loading: authLoading } = useAuthState();
  const isSuperAdmin = primaryRole === "super_admin";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  // Draft edits per user
  const [drafts, setDrafts] = useState<Record<string, { roles: Set<AppRole>; department: string }>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: profiles, error: pe }, { data: roleRows, error: re }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,email,department").order("full_name"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    if (pe || re) {
      setMsg({ id: "_", text: pe?.message ?? re?.message ?? "Load failed", ok: false });
      setLoading(false);
      return;
    }
    const byUser = new Map<string, AppRole[]>();
    (roleRows ?? []).forEach((r: any) => {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role as AppRole);
      byUser.set(r.user_id, arr);
    });
    const mapped: Row[] = (profiles ?? []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      department: p.department,
      roles: byUser.get(p.id) ?? [],
    }));
    setRows(mapped);
    const d: Record<string, { roles: Set<AppRole>; department: string }> = {};
    mapped.forEach((r) => {
      d[r.id] = { roles: new Set(r.roles), department: r.department ?? "" };
    });
    setDrafts(d);
    setLoading(false);
  };

  useEffect(() => {
    if (isSuperAdmin) load();
  }, [isSuperAdmin]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.department ?? "").toLowerCase().includes(q) ||
        r.roles.some((x) => x.includes(q)),
    );
  }, [rows, query]);

  const toggleRole = (userId: string, role: AppRole) => {
    setDrafts((prev) => {
      const cur = prev[userId];
      const next = new Set(cur.roles);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return { ...prev, [userId]: { ...cur, roles: next } };
    });
  };

  const setDept = (userId: string, department: string) => {
    setDrafts((prev) => ({ ...prev, [userId]: { ...prev[userId], department } }));
  };

  const save = async (row: Row) => {
    const draft = drafts[row.id];
    if (!draft) return;
    setSavingId(row.id);
    setMsg(null);

    const currentSet = new Set(row.roles);
    const nextSet = draft.roles;
    const toAdd = [...nextSet].filter((r) => !currentSet.has(r));
    const toRemove = [...currentSet].filter((r) => !nextSet.has(r));

    try {
      // Department update on profile
      if ((row.department ?? "") !== draft.department) {
        const { error } = await supabase
          .from("profiles")
          .update({ department: draft.department || null })
          .eq("id", row.id);
        if (error) throw error;
      }

      // Remove roles
      if (toRemove.length) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", row.id)
          .in("role", toRemove);
        if (error) throw error;
      }

      // Add roles (include department snapshot)
      if (toAdd.length) {
        const { error } = await supabase.from("user_roles").insert(
          toAdd.map((role) => ({
            user_id: row.id,
            role,
            department: draft.department || null,
          })),
        );
        if (error) throw error;
      }

      // Audit
      await supabase.from("audit_log").insert({
        actor_id: user!.id,
        entity_type: "user_roles",
        entity_id: row.id,
        action: "update_roles",
        metadata: {
          added: toAdd,
          removed: toRemove,
          department: draft.department || null,
        },
      });

      setMsg({ id: row.id, text: "Saved successfully", ok: true });
      await load();
    } catch (e: any) {
      setMsg({ id: row.id, text: e.message ?? "Save failed", ok: false });
    } finally {
      setSavingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-10">
        <div className="max-w-2xl mx-auto bg-card border border-border rounded-sm p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-destructive mx-auto" />
          <h1 className="mt-4 font-display text-3xl text-foreground">Access Restricted</h1>
          <p className="mt-2 text-muted-foreground">
            The Role Management console is reserved for <strong>Super Admin</strong>.
          </p>
          <div className="mt-6 text-sm text-muted-foreground">
            Your active roles:{" "}
            {myRoles.length === 0 ? (
              <em>none</em>
            ) : (
              myRoles.map((r) => (
                <span key={r} className="inline-block mx-1 px-2 py-0.5 bg-muted rounded-sm">
                  {ROLE_LABEL[r]}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-10 max-w-7xl mx-auto">
      <header className="mb-8 flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary font-semibold">
            <ShieldCheck className="w-4 h-4" /> Governance
          </div>
          <h1 className="mt-2 font-display text-4xl text-foreground">Role Management</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Assign or revoke roles per user and set their department. Changes take effect immediately and
            are recorded in the Audit Log.
          </p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, role, dept…"
            className="w-80 pl-9 pr-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((row) => {
            const draft = drafts[row.id];
            if (!draft) return null;
            const dirty =
              (row.department ?? "") !== draft.department ||
              row.roles.length !== draft.roles.size ||
              row.roles.some((r) => !draft.roles.has(r));
            const isSelf = row.id === user?.id;

            return (
              <div key={row.id} className="bg-card border border-border rounded-sm p-6">
                <div className="flex items-start justify-between gap-6 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCog className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-display text-xl text-foreground">
                        {row.full_name}
                        {isSelf && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-muted rounded-sm text-muted-foreground">
                            you
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{row.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      value={draft.department}
                      onChange={(e) => setDept(row.id, e.target.value)}
                      placeholder="Department (e.g. CSE)"
                      className="w-48 px-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => save(row)}
                      disabled={!dirty || savingId === row.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm disabled:opacity-40 hover:bg-primary/90 transition-colors"
                    >
                      {savingId === row.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {ALL_ROLES.map((r) => {
                    const checked = draft.roles.has(r);
                    return (
                      <button
                        key={r}
                        onClick={() => toggleRole(row.id, r)}
                        className={`px-3 py-1.5 text-xs rounded-sm border transition-colors ${
                          checked
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:border-primary"
                        }`}
                      >
                        {ROLE_LABEL[r]}
                      </button>
                    );
                  })}
                </div>

                {msg && msg.id === row.id && (
                  <div
                    className={`mt-4 text-sm ${
                      msg.ok ? "text-green-700" : "text-destructive"
                    }`}
                  >
                    {msg.text}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No users match your search.</div>
          )}
        </div>
      )}
    </div>
  );
}
