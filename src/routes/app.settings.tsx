import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthState, ROLE_LABEL } from "@/hooks/useAuth";
import {
  Loader2, Settings as SettingsIcon, Building2, User as UserIcon,
  CalendarRange, ShieldCheck, Plus, Trash2, Save, KeyRound,
} from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

type Tab = "profile" | "departments" | "academic" | "security" | "system";

function SettingsPage() {
  const { primaryRole, loading } = useAuthState();
  const isSuper = primaryRole === "super_admin";
  const isPrincipal = primaryRole === "principal";
  const isDeanHod = primaryRole === "dean" || primaryRole === "hod";

  const available: Tab[] = [
    "profile",
    ...(isSuper || isPrincipal ? (["departments", "academic"] as Tab[]) : []),
    ...(isSuper ? (["security", "system"] as Tab[]) : []),
    ...(isDeanHod ? (["departments"] as Tab[]) : []),
  ];
  const [tab, setTab] = useState<Tab>("profile");

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary font-semibold">
          <SettingsIcon className="w-4 h-4" /> Configuration
        </div>
        <h1 className="mt-2 font-display text-4xl text-foreground">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Role-scoped configuration for your institution — signed in as <strong>{primaryRole ? ROLE_LABEL[primaryRole] : "—"}</strong>.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-border">
        {available.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === t ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {tabIcon(t)} {tabLabel(t)}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab />}
      {tab === "departments" && <DepartmentsTab canEdit={isSuper || isPrincipal} />}
      {tab === "academic" && <AcademicTab />}
      {tab === "security" && <SecurityTab />}
      {tab === "system" && <SystemTab />}
    </div>
  );
}

function tabLabel(t: Tab) {
  return { profile: "Profile", departments: "Departments", academic: "Academic Year", security: "Security", system: "System" }[t];
}
function tabIcon(t: Tab) {
  const cn = "w-4 h-4 inline-block mr-1.5 -mt-0.5";
  return {
    profile: <UserIcon className={cn} />,
    departments: <Building2 className={cn} />,
    academic: <CalendarRange className={cn} />,
    security: <ShieldCheck className={cn} />,
    system: <SettingsIcon className={cn} />,
  }[t];
}

// ---- Profile ---------------------------------------------------------------
function ProfileTab() {
  const { user, profile, refresh } = useAuthState();
  const [form, setForm] = useState({ full_name: "", phone: "", employee_id: "" });
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name,phone,employee_id").eq("id", user.id).maybeSingle()
      .then(({ data }) => data && setForm({ full_name: data.full_name ?? "", phone: data.phone ?? "", employee_id: data.employee_id ?? "" }));
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true); setMsg(null);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setMsg(error ? { text: error.message, ok: false } : { text: "Profile updated", ok: true });
    await refresh();
    setSaving(false);
  };

  const changePw = async () => {
    if (pw.length < 8) { setMsg({ text: "Password must be at least 8 characters", ok: false }); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    setMsg(error ? { text: error.message, ok: false } : { text: "Password changed", ok: true });
    setPw("");
  };

  return (
    <Card title="Personal details" desc="Update your profile information.">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name">
          <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label="Email"><input className="input" disabled value={profile?.email ?? ""} /></Field>
        <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Employee ID"><input className="input" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} /></Field>
      </div>
      <div className="mt-5 flex justify-end">
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
        </button>
      </div>

      <div className="mt-8 pt-6 border-t border-border">
        <h3 className="font-display text-xl">Change password</h3>
        <p className="text-sm text-muted-foreground mt-1">Minimum 8 characters.</p>
        <div className="mt-3 flex gap-2">
          <input type="password" className="input flex-1" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button onClick={changePw} className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-sm text-sm hover:border-primary">
            <KeyRound className="w-4 h-4" /> Update
          </button>
        </div>
      </div>

      {msg && <div className={`mt-4 text-sm ${msg.ok ? "text-green-700" : "text-destructive"}`}>{msg.text}</div>}
      <InputStyles />
    </Card>
  );
}

// ---- Departments -----------------------------------------------------------
function DepartmentsTab({ canEdit }: { canEdit: boolean }) {
  const [rows, setRows] = useState<{ id: string; code: string; name: string; description: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ code: "", name: "", description: "" });
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("departments").select("*").order("code");
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!draft.code || !draft.name) { setMsg("Code and name are required"); return; }
    const { error } = await supabase.from("departments").insert(draft);
    if (error) setMsg(error.message);
    else { setDraft({ code: "", name: "", description: "" }); load(); }
  };
  const del = async (id: string) => {
    if (!confirm("Delete this department?")) return;
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) setMsg(error.message);
    else load();
  };

  return (
    <Card title="Departments" desc="Standard engineering departments available across the institution.">
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-3 bg-background border border-border rounded-sm">
              <div>
                <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary rounded-sm text-xs font-mono mr-3">{r.code}</span>
                <span className="font-medium">{r.name}</span>
                {r.description && <span className="text-muted-foreground text-sm ml-2">— {r.description}</span>}
              </div>
              {canEdit && (
                <button onClick={() => del(r.id)} className="p-1.5 hover:bg-destructive/10 rounded-sm">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <div className="mt-5 pt-5 border-t border-border">
          <h3 className="font-display text-lg mb-3">Add department</h3>
          <div className="grid sm:grid-cols-4 gap-2">
            <input className="input" placeholder="Code (e.g. AIDS)" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} />
            <input className="input sm:col-span-2" placeholder="Full name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <button onClick={add} className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-sm text-sm">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
      )}
      {msg && <div className="mt-3 text-sm text-destructive">{msg}</div>}
      <InputStyles />
    </Card>
  );
}

// ---- Academic Year ---------------------------------------------------------
function AcademicTab() {
  const [val, setVal] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("system_settings").select("value").eq("key", "academic_year").maybeSingle()
      .then(({ data }) => data && setVal(String(data.value).replaceAll('"', "")));
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("system_settings")
      .update({ value: JSON.stringify(val) as any })
      .eq("key", "academic_year");
    setMsg(error ? error.message : "Saved");
    setSaving(false);
  };

  return (
    <Card title="Academic Year" desc="Current academic year used across reports and compliance.">
      <Field label="Academic year (e.g. 2025-2026)">
        <input className="input" value={val} onChange={(e) => setVal(e.target.value)} />
      </Field>
      <div className="mt-5 flex justify-end">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
        </button>
      </div>
      {msg && <div className="mt-3 text-sm">{msg}</div>}
      <InputStyles />
    </Card>
  );
}

// ---- Security --------------------------------------------------------------
function SecurityTab() {
  const [settings, setSettings] = useState<{ enforce_2fa: boolean; password_min_length: number; allow_public_signup: boolean }>({
    enforce_2fa: false, password_min_length: 8, allow_public_signup: true,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("system_settings").select("key,value").in("key", ["enforce_2fa", "password_min_length", "allow_public_signup"])
      .then(({ data }) => {
        if (!data) return;
        const map: any = {};
        data.forEach((r: any) => { map[r.key] = r.value; });
        setSettings({
          enforce_2fa: !!map.enforce_2fa,
          password_min_length: Number(map.password_min_length ?? 8),
          allow_public_signup: !!map.allow_public_signup,
        });
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const updates = [
      { key: "enforce_2fa", value: settings.enforce_2fa as any },
      { key: "password_min_length", value: settings.password_min_length as any },
      { key: "allow_public_signup", value: settings.allow_public_signup as any },
    ];
    for (const u of updates) {
      await supabase.from("system_settings").update({ value: u.value }).eq("key", u.key);
    }
    setMsg("Saved");
    setSaving(false);
  };

  return (
    <Card title="Security" desc="Global security posture and authentication rules.">
      <div className="space-y-4">
        <Toggle label="Enforce 2FA for privileged roles" value={settings.enforce_2fa} onChange={(v) => setSettings({ ...settings, enforce_2fa: v })} />
        <Toggle label="Allow public signup (from /login page)" value={settings.allow_public_signup} onChange={(v) => setSettings({ ...settings, allow_public_signup: v })} />
        <Field label="Minimum password length">
          <input type="number" min={6} max={32} className="input w-32"
            value={settings.password_min_length}
            onChange={(e) => setSettings({ ...settings, password_min_length: Number(e.target.value) })} />
        </Field>
      </div>
      <div className="mt-5 flex justify-end">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
        </button>
      </div>
      {msg && <div className="mt-3 text-sm text-green-700">{msg}</div>}
      <InputStyles />
    </Card>
  );
}

// ---- System ---------------------------------------------------------------
function SystemTab() {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("system_settings").select("value").eq("key", "institution_name").maybeSingle()
      .then(({ data }) => data && setName(String(data.value).replaceAll('"', "")));
  }, []);

  const save = async () => {
    setSaving(true);
    await supabase.from("system_settings").update({ value: JSON.stringify(name) as any }).eq("key", "institution_name");
    setMsg("Saved");
    setSaving(false);
  };

  return (
    <Card title="System" desc="Institution identity and core branding.">
      <Field label="Institution name">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="mt-5 flex justify-end">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-sm disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
        </button>
      </div>
      {msg && <div className="mt-3 text-sm text-green-700">{msg}</div>}
      <InputStyles />
    </Card>
  );
}

// ---- primitives ------------------------------------------------------------
function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-sm p-6">
      <h2 className="font-display text-2xl">{title}</h2>
      {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      <div className="mt-5">{children}</div>
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

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-6 cursor-pointer py-2 border-b border-border/50 last:border-b-0">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

function InputStyles() {
  return (
    <style>{`
      .input { width: 100%; padding: 0.55rem 0.8rem; border: 1px solid var(--color-border); border-radius: 0.125rem; background: var(--color-background); font-size: 0.9rem; }
      .input:focus { outline: none; border-color: var(--color-primary); }
      .input:disabled { opacity: .6; cursor: not-allowed; }
    `}</style>
  );
}
