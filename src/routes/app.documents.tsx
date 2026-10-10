import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthState, canUpload } from "@/hooks/useAuth";
import { logDocumentDownload } from "@/features/governance/governance.functions";
import { StatusPill } from "./app.index";
import { Plus, Upload, X, Loader2, FileText, Search, Eye, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/documents")({
  component: DocumentsPage,
});

const CATEGORIES = [
  { v: "academic", l: "Academic" },
  { v: "student_records", l: "Student Records" },
  { v: "faculty_records", l: "Faculty Records" },
  { v: "accreditation", l: "Accreditation" },
  { v: "administrative", l: "Administrative" },
  { v: "research", l: "Research" },
  { v: "infrastructure", l: "Infrastructure" },
  { v: "compliance", l: "Compliance" },
];

function DocumentsPage() {
  const { user, roles } = useAuthState();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    setDocs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = docs.filter((d) => {
    if (filter !== "all" && d.category !== filter) return false;
    if (query && !d.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Repository</div>
          <h1 className="font-display text-4xl text-foreground mt-1">Documents</h1>
          <p className="text-muted-foreground text-sm mt-1">All institutional documents across categories and departments.</p>
        </div>
        {canUpload(roles) && (
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-sm font-medium shadow-soft hover:bg-primary/90 transition-all"
          >
            <Plus className="w-4 h-4" /> Upload Document
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All</FilterChip>
        {CATEGORIES.map((c) => (
          <FilterChip key={c.v} active={filter === c.v} onClick={() => setFilter(c.v)}>{c.l}</FilterChip>
        ))}
      </div>

      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents by title..."
          className="w-full pl-10 pr-4 py-2.5 border border-border rounded-sm bg-card focus:outline-none focus:border-primary"
        />
      </div>

      <div className="border border-border bg-card rounded-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground text-sm">No documents found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-parchment border-b border-border">
              <tr className="text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-border/60 last:border-0 hover:bg-parchment/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{d.title}</div>
                    {d.regulation && <div className="text-xs text-muted-foreground mt-0.5 font-mono">{d.regulation}</div>}
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{d.category.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.department || "—"}</td>
                  <td className="px-4 py-3"><StatusPill status={d.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><DocActions doc={d} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showUpload && user && (
        <UploadDialog
          userId={user.id}
          onClose={() => setShowUpload(false)}
          onDone={() => { setShowUpload(false); load(); }}
        />
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
        active ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:border-primary/40"
      }`}
    >{children}</button>
  );
}

function DocActions({ doc }: { doc: any }) {
  const [busy, setBusy] = useState<"view" | "download" | null>(null);

  const openSigned = async (action: "view" | "download") => {
    setBusy(action);
    try {
      const { data, error } = await supabase.storage
        .from("sargs-documents")
        .createSignedUrl(doc.storage_path, 60 * 5, action === "download" ? { download: doc.file_name } : undefined);
      if (error || !data?.signedUrl) throw error ?? new Error("Could not generate link");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      // Audit log the download
      if (action === "download") {
        logDocumentDownload({ data: { documentId: doc.id, documentTitle: doc.title } }).catch(() => {});
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to open file");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        onClick={() => openSigned("view")}
        disabled={busy !== null}
        title="Open in new tab"
        className="p-1.5 rounded-sm hover:bg-primary/10 text-primary disabled:opacity-50 transition-all"
      >
        {busy === "view" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={() => openSigned("download")}
        disabled={busy !== null}
        title="Download"
        className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground disabled:opacity-50 transition-all"
      >
        {busy === "download" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function UploadDialog({ userId, onClose, onDone }: { userId: string; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("academic");
  const [department, setDepartment] = useState("");
  const [regulation, setRegulation] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error("Please select a file"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("File too large (20MB max)"); return; }
    if (title.trim().length < 3) { toast.error("Title must be at least 3 characters"); return; }

    setSaving(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("sargs-documents").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;

      // hash for tamper detection
      const buf = await file.arrayBuffer();
      const hashBuf = await crypto.subtle.digest("SHA-256", buf);
      const hash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");

      const { data: doc, error: docErr } = await supabase.from("documents").insert({
        title: title.trim(),
        description: description.trim() || null,
        category: category as any,
        department: department.trim() || null,
        regulation: regulation.trim() || null,
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        file_hash: hash,
        status: "pending_hod",
        uploaded_by: userId,
      }).select().single();
      if (docErr) throw docErr;

      await supabase.from("document_approvals").insert({
        document_id: doc.id,
        actor_id: userId,
        action: "submitted",
        from_status: "draft",
        to_status: "pending_hod",
      });
      await supabase.from("audit_log").insert({
        actor_id: userId,
        action: "document.upload",
        entity_type: "document",
        entity_id: doc.id,
        metadata: { title: doc.title, category: doc.category },
      });
      toast.success("Document uploaded and submitted for review");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form onSubmit={submit} className="bg-card border border-border rounded-sm max-w-lg w-full shadow-elegant max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gold font-semibold">New Upload</div>
            <h2 className="font-display text-2xl text-foreground mt-1">Upload Document</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded-sm"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <Input label="Title" required value={title} onChange={setTitle} maxLength={200} />
          <Input label="Description" value={description} onChange={setDescription} maxLength={500} textarea />
          <div>
            <Label>Category</Label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field w-full">
              {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Department" value={department} onChange={setDepartment} maxLength={50} placeholder="CSE, ECE..." />
            <Input label="Regulation" value={regulation} onChange={setRegulation} maxLength={20} placeholder="R22" />
          </div>
          <div>
            <Label>File (max 20MB)</Label>
            <label className="mt-1.5 flex items-center gap-3 px-4 py-4 border border-dashed border-border rounded-sm cursor-pointer hover:border-primary/50 bg-parchment">
              <Upload className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                {file ? `${file.name} · ${(file.size / 1024).toFixed(0)}KB` : "Choose file to upload"}
              </span>
              <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded-sm text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="px-5 py-2 bg-primary text-primary-foreground rounded-sm text-sm font-medium disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit for Approval
          </button>
        </div>
        <style>{`.input-field{padding:.6rem .75rem;border:1px solid var(--color-border);border-radius:.125rem;background:var(--color-parchment);font-size:.9rem}.input-field:focus{outline:none;border-color:var(--color-primary)}`}</style>
      </form>
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">{children}</span>;
}
function Input({ label, value, onChange, required, maxLength, placeholder, textarea }: any) {
  return (
    <div>
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <div className="mt-1.5">
        {textarea ? (
          <textarea value={value} onChange={(e) => onChange(e.target.value)} maxLength={maxLength} rows={2} className="input-field w-full" />
        ) : (
          <input value={value} onChange={(e) => onChange(e.target.value)} required={required} maxLength={maxLength} placeholder={placeholder} className="input-field w-full" />
        )}
      </div>
    </div>
  );
}
