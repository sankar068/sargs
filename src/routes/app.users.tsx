import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminCreateUser,
  adminToggleUserStatus,
  adminResetPassword,
} from "@/features/users/users.functions";
import { useAuthState, ROLE_LABEL, type AppRole } from "@/hooks/useAuth";
import {
  Loader2, Users as UsersIcon, Plus, Search, Shield, Power, KeyRound, X, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/app/users")({
  component: UsersPage,
});

const ALL_ROLES: AppRole[] = [
  "super_admin", "principal", "dean", "hod",
  "iqac_coordinator", "admin_staff", "faculty", "student",
];

// Creation-hierarchy on the client (mirrors can_create_role on the server)
const CAN_CREATE: Record<AppRole, AppRole[]> = {
  super_admin: [...ALL_ROLES],
  principal: ["dean", "hod", "faculty", "admin_staff", "iqac_coordinator", "student"],
  dean: ["hod", "faculty", "student"],
  hod: ["faculty", "student"],
  faculty: [],
  admin_staff: [],
  iqac_coordinator: [],
  student: [],
};

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  status: string;
  last_login: string | null;
  created_at: string;
  roles: AppRole[];
}

function UsersPage() {
  const { primaryRole, user, loading: authLoading } = useAuthState();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [depts, setDepts] = useState<{ code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const canCreateRoles = primaryRole ? CAN_CREATE[primaryRole] : [];
  const isSuperOrPrincipal = primaryRole === "super_admin" || primaryRole === "principal";

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roleRows }, { data: d }] = await Promise.all([
      supabase.from("profiles")
        .select("id,full_name,email,department,status,last_login,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("departments").select("code,name").order("code"),
    ]);
    const byUser = new Map<string, AppRole[]>();
    (roleRows ?? []).forEach((r: any) => {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    });
    setRows((profiles ?? []).map((p: any) => ({
      ...p,
      roles: byUser.get(p.id) ?? [],
    })));
    setDepts(d ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return rows.filter((r) => {
      if (roleFilter !== "all" && !r.roles.includes(roleFilter)) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.full_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.department ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, roleFilter, statusFilter]);

  const showToast = (text: string, ok: boolean) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const toggleStatus = async (r: UserRow) => {
    try {
      const next = r.status === "active" ? "disabled" : "active";
      await adminToggleUserStatus({ data: { user_id: r.id, status: next } });
      showToast(`User ${next === "disabled" ? "disabled" : "enabled"}`, true);
      load();
    } catch (e: any) {
      showToast(e.message ?? "Failed", false);
    }
  };

  const resetPw = async (r: UserRow) => {
    const pw = prompt(`New password for ${r.email} (min 8 chars):`);
    if (!pw) return;
    try {
      await adminResetPassword({ data: { user_id: r.id, new_password: pw } });
      showToast("Password reset", true);
    } catch (e: any) {
      showToast(e.message ?? "Failed", false);
    }
  };

  if (authLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-8 lg:p-10 max-w-7xl mx-auto">
      <header className="mb-8 flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary font-semibold">
            <UsersIcon className="w-4 h-4" /> User Directory
          </div>
          <h1 className="mt-2 font-display text-4xl text-foreground">User Management</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Create, disable, and manage accounts. Creation is restricted by hierarchy — you can create{" "}
            <strong>{canCreateRoles.length === 0 ? "no roles" : canCreateRoles.map((r) => ROLE_LABEL[r]).join(", ")}</strong>.
          </p>
        </div>
        {canCreateRoles.length > 0 && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-colors shadow-elegant"
          >
            <Plus className="w-4 h-4" /> New User
          </button>
        )}
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, dept…"
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-sm text-sm focus:outline-none focus:border-primary" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)}
          className="px-3 py-2 bg-background border border-border rounded-sm text-sm">
          <option value="all">All roles</option>
          {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 bg-background border border-border rounded-sm text-sm">
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-24 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Department</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Last login</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {r.full_name}{r.id === user?.id && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.roles.map((role) => (
                        <span key={role} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-sm">
                          <Shield className="w-3 h-3" /> {ROLE_LABEL[role]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.department ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-sm ${
                      r.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {r.last_login ? new Date(r.last_login).toLocaleString() : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isSuperOrPrincipal && r.id !== user?.id && (
                      <div className="inline-flex gap-1">
                        <button onClick={() => toggleStatus(r)} title={r.status === "active" ? "Disable" : "Enable"}
                          className="p-1.5 hover:bg-muted rounded-sm">
                          <Power className={`w-4 h-4 ${r.status === "active" ? "text-green-700" : "text-destructive"}`} />
                        </button>
                        <button onClick={() => resetPw(r)} title="Reset password"
                          className="p-1.5 hover:bg-muted rounded-sm">
                          <KeyRound className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No users match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          canCreateRoles={canCreateRoles}
          departments={depts}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); showToast("User created", true); }}
          onError={(m) => showToast(m, false)}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-sm shadow-elegant flex items-center gap-2 ${
          toast.ok ? "bg-card border border-green-500/40" : "bg-card border border-destructive/40"
        }`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4 text-green-700" /> : <X className="w-4 h-4 text-destructive" />}
          <span className="text-sm">{toast.text}</span>
        </div>
      )}
    </div>
  );
}

function CreateUserModal({
  canCreateRoles, departments, onClose, onCreated, onError,
}: {
  canCreateRoles: AppRole[];
  departments: { code: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
  onError: (m: string) => void;
}) {
  const [form, setForm] = useState({
    full_name: "", email: "", password: "",
    role: canCreateRoles[0] as AppRole,
    department_code: "",
  });
  const [saving, setSaving] = useState(false);

  const genPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
    let p = "";
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setForm((f) => ({ ...f, password: p }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminCreateUser({
        data: {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role: form.role,
          department_code: form.department_code || null,
        },
      });
      onCreated();
    } catch (err: any) {
      onError(err.message ?? "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form onSubmit={submit} className="w-full max-w-lg bg-card border border-border rounded-sm shadow-elegant">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-2xl">Create User</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded-sm">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Full name">
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input" />
          </Field>
          <Field label="Email">
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          </Field>
          <Field label="Password">
            <div className="flex gap-2">
              <input required type="text" minLength={8} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input flex-1 font-mono text-sm" />
              <button type="button" onClick={genPassword}
                className="px-3 py-2 text-xs border border-border rounded-sm hover:border-primary">Generate</button>
            </div>
          </Field>
          <Field label="Role">
            <select required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AppRole })} className="input">
              {canCreateRoles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </Field>
          <Field label="Department (optional)">
            <select value={form.department_code} onChange={(e) => setForm({ ...form, department_code: e.target.value })} className="input">
              <option value="">— None —</option>
              {departments.map((d) => <option key={d.code} value={d.code}>{d.code} · {d.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-sm hover:bg-muted">Cancel</button>
          <button disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm disabled:opacity-60 inline-flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Create User
          </button>
        </div>
      </form>
      <style>{`
        .input { width: 100%; padding: 0.55rem 0.8rem; border: 1px solid var(--color-border); border-radius: 0.125rem; background: var(--color-background); font-size: 0.9rem; }
        .input:focus { outline: none; border-color: var(--color-primary); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
