import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthState } from "@/hooks/useAuth";
import {
  getTemplates, createTemplate, getTemplateItems,
  addTemplateItem, toggleTemplateItem,
} from "@/features/governance/governance.functions";
import {
  LayoutTemplate, Plus, Loader2, ArrowLeft,
  CheckCircle2, XCircle, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/templates")({
  component: TemplatesPage,
});

const ALLOWED = ["super_admin", "principal", "dean", "iqac_coordinator"];

function TemplatesPage() {
  const { primaryRole } = useAuthState();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", type: "Theory" as "Theory" | "Lab" | "Theory+Lab" | "Other",
    academic_year: "2026-2027", regulation: "", is_active: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await getTemplates();
      setTemplates(Array.isArray(res) ? res : []);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createTemplate({ data: form });
      toast.success("Template created");
      setShowCreate(false);
      setForm({ name: "", type: "Theory", academic_year: "2026-2027", regulation: "", is_active: true });
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (!ALLOWED.includes(primaryRole ?? "")) {
    return (
      <div className="p-10 max-w-xl mx-auto">
        <div className="bg-card border border-border rounded-sm p-8 text-center">
          <XCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h2 className="font-display text-2xl">Access Restricted</h2>
          <p className="text-muted-foreground text-sm mt-2">Template management is for IQAC Coordinators and above.</p>
        </div>
      </div>
    );
  }

  if (selectedId) {
    return <TemplateItemsView templateId={selectedId} templates={templates} onBack={() => { setSelectedId(null); load(); }} />;
  }

  return (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto">
      <header className="mb-8 flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">IQAC / Admin</div>
          <h1 className="font-display text-4xl text-foreground mt-1">Course File Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage Theory and Lab A/B/C checklist templates per academic year and regulation.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-sm font-semibold hover:bg-primary/95 shadow-soft">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </header>

      {loading ? (
        <div className="py-24 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.length === 0 && (
            <div className="col-span-3 p-16 text-center bg-card border border-border rounded-sm text-muted-foreground">
              No templates yet. Create one to start configuring course file checklists.
            </div>
          )}
          {templates.map((t) => (
            <div key={t.id} onClick={() => setSelectedId(t.id)}
              className="bg-card border border-border rounded-sm p-5 cursor-pointer hover:border-primary/50 shadow-soft transition-all">
              <div className="flex justify-between items-start mb-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                  t.type === "Theory" ? "bg-blue-100 text-blue-800" :
                  t.type === "Lab" ? "bg-purple-100 text-purple-800" : "bg-gold/20 text-gold-foreground"
                }`}>{t.type}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm ${t.is_active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                  {t.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <h3 className="font-display text-xl text-foreground font-semibold">{t.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">AY: {t.academic_year}{t.regulation ? ` · Reg: ${t.regulation}` : ""}</p>
              <div className="flex items-center justify-end mt-4 pt-3 border-t border-border/40">
                <span className="text-xs text-primary font-semibold flex items-center gap-1">Manage Items <ChevronRight className="w-3.5 h-3.5" /></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreate} className="bg-card border border-border rounded-sm max-w-md w-full shadow-elegant p-6">
            <h2 className="font-display text-2xl mb-5">Create Template</h2>
            <div className="space-y-4">
              <FL label="Template Name *"><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="if w-full mt-1" placeholder="e.g. Theory Course File - R22" /></FL>
              <div className="grid grid-cols-2 gap-3">
                <FL label="Type">
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value as any})} className="if w-full mt-1">
                    <option value="Theory">Theory</option><option value="Lab">Lab</option>
                    <option value="Theory+Lab">Theory + Lab</option><option value="Other">Other</option>
                  </select>
                </FL>
                <FL label="Academic Year">
                  <select value={form.academic_year} onChange={e => setForm({...form, academic_year: e.target.value})} className="if w-full mt-1">
                    <option>2025-2026</option><option>2026-2027</option><option>2027-2028</option>
                  </select>
                </FL>
              </div>
              <FL label="Regulation (e.g. R22)"><input value={form.regulation} onChange={e => setForm({...form, regulation: e.target.value})} className="if w-full mt-1" /></FL>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="rounded-sm w-4 h-4" />
                <span className="text-sm">Mark as Active (visible to faculty)</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border text-sm rounded-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-sm flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create
              </button>
            </div>
          </form>
        </div>
      )}
      <style>{`.if{padding:.6rem .8rem;border:1px solid var(--color-border);border-radius:.125rem;background:var(--color-parchment);font-size:.9rem}.if:focus{outline:none;border-color:var(--color-primary)}`}</style>
    </div>
  );
}

function TemplateItemsView({ templateId, templates, onBack }: { templateId: string; templates: any[]; onBack: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "", section: "Section A" as "Section A" | "Section B" | "Section C",
    document_name: "", instructions: "", requirement: "Mandatory" as "Mandatory" | "Optional", is_active: true,
  });

  const template = templates.find(t => t.id === templateId);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getTemplateItems({ data: { templateId } });
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [templateId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addTemplateItem({ data: { templateId, ...form } });
      toast.success("Item added");
      setShowAdd(false);
      setForm({ code: "", section: "Section A", document_name: "", instructions: "", requirement: "Mandatory", is_active: true });
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (item: any) => {
    setTogglingId(item.id);
    try {
      await toggleTemplateItem({ data: { itemId: item.id, is_active: !item.is_active } });
      toast.success(`Item ${!item.is_active ? "activated" : "deactivated"}`);
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setTogglingId(null); }
  };

  const sections = ["Section A", "Section B", "Section C"];

  return (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground mb-6 font-semibold">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Templates
      </button>
      <header className="mb-8 flex items-start justify-between gap-6 flex-wrap border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${template?.type === "Theory" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}>{template?.type}</span>
            <span className="text-xs text-muted-foreground">{template?.regulation} · AY {template?.academic_year}</span>
          </div>
          <h1 className="font-display text-3xl text-foreground mt-2">{template?.name}</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-sm font-semibold hover:bg-primary/95 shadow-soft">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </header>

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-8">
          {sections.map((sec) => {
            const secItems = items.filter(it => it.section === sec);
            return (
              <div key={sec}>
                <h2 className="font-display text-2xl text-foreground mb-3 flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-sm">{sec}</span>
                  <span className="text-sm text-muted-foreground font-sans">({secItems.length} items)</span>
                </h2>
                <div className="bg-card border border-border rounded-sm overflow-hidden">
                  {secItems.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground text-sm">No items in {sec} yet.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs uppercase tracking-[0.1em] text-muted-foreground border-b border-border">
                        <tr>
                          <th className="text-left px-4 py-3">Code</th>
                          <th className="text-left px-4 py-3">Document Name</th>
                          <th className="text-left px-4 py-3">Requirement</th>
                          <th className="text-left px-4 py-3">Status</th>
                          <th className="text-right px-4 py-3">Toggle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {secItems.map((it) => (
                          <tr key={it.id} className={`border-t border-border/60 ${!it.is_active ? "opacity-50" : ""}`}>
                            <td className="px-4 py-3"><span className="font-mono text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">{it.code}</span></td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-foreground">{it.document_name}</div>
                              {it.instructions && <div className="text-xs text-muted-foreground mt-0.5">{it.instructions}</div>}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${it.requirement === "Mandatory" ? "bg-red-100 text-red-800" : "bg-muted text-muted-foreground"}`}>
                                {it.requirement}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm ${it.is_active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                                {it.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleToggle(it)}
                                disabled={togglingId === it.id}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-sm border transition-colors ${it.is_active ? "border-orange-300 text-orange-700 hover:bg-orange-50" : "border-green-300 text-green-700 hover:bg-green-50"}`}
                              >
                                {togglingId === it.id ? <Loader2 className="w-3 h-3 animate-spin" /> : it.is_active ? "Deactivate" : "Activate"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAdd} className="bg-card border border-border rounded-sm max-w-md w-full shadow-elegant p-6">
            <h2 className="font-display text-2xl mb-5">Add Checklist Item</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FL label="Code *"><input required value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="if w-full mt-1" placeholder="e.g. A1, B3" /></FL>
                <FL label="Section">
                  <select value={form.section} onChange={e => setForm({...form, section: e.target.value as any})} className="if w-full mt-1">
                    <option value="Section A">Section A</option><option value="Section B">Section B</option><option value="Section C">Section C</option>
                  </select>
                </FL>
              </div>
              <FL label="Document Name *"><input required value={form.document_name} onChange={e => setForm({...form, document_name: e.target.value})} className="if w-full mt-1" /></FL>
              <FL label="Instructions"><textarea rows={2} value={form.instructions} onChange={e => setForm({...form, instructions: e.target.value})} className="if w-full mt-1" /></FL>
              <FL label="Requirement">
                <select value={form.requirement} onChange={e => setForm({...form, requirement: e.target.value as any})} className="if w-full mt-1">
                  <option value="Mandatory">Mandatory</option><option value="Optional">Optional</option>
                </select>
              </FL>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="rounded-sm w-4 h-4" />
                <span className="text-sm">Active for current academic year</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border border-border text-sm rounded-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-sm flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Add Item
              </button>
            </div>
          </form>
        </div>
      )}
      <style>{`.if{padding:.6rem .8rem;border:1px solid var(--color-border);border-radius:.125rem;background:var(--color-parchment);font-size:.9rem}.if:focus{outline:none;border-color:var(--color-primary)}`}</style>
    </div>
  );
}

function FL({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      {children}
    </label>
  );
}
