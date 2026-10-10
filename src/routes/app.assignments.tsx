import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthState } from "@/hooks/useAuth";
import {
  getAssignments,
  createAssignment,
  deleteAssignment,
} from "@/features/governance/governance.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Plus, Trash2, Loader2, CheckCircle2, User, HelpCircle, FileText
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/assignments")({
  component: TeachingAssignmentsPage,
});

function TeachingAssignmentsPage() {
  const { user, primaryRole } = useAuthState();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [form, setForm] = useState({
    facultyId: "",
    courseId: "",
    academicYear: "2026-2027",
    semester: "I",
    sections: [] as string[],
    yearOfStudy: [] as string[],
    workloadHours: 4,
    ownership: "Primary" as "Primary" | "Co-Faculty" | "Substitute" | "Reviewer",
  });

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const data = await getAssignments({ data: {} });
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error("Failed to load teaching assignments: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFormHelpers = async () => {
    // Load faculty members in the department or institution
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, department")
      .order("full_name");
    
    // Load available courses
    const { data: courses } = await supabase
      .from("courses")
      .select("id, code, name, type, regulation")
      .order("code");

    setFacultyList(profiles ?? []);
    setCoursesList(courses ?? []);
  };

  useEffect(() => {
    loadAssignments();
    loadFormHelpers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.facultyId || !form.courseId) {
      toast.error("Please select a faculty and a course.");
      return;
    }
    setSaving(true);
    try {
      await createAssignment({
        data: {
          facultyId: form.facultyId,
          courseId: form.courseId,
          academicYear: form.academicYear,
          semester: form.semester,
          sections: form.sections.length > 0 ? form.sections : ["A"],
          yearOfStudy: form.yearOfStudy.length > 0 ? form.yearOfStudy : ["III"],
          workloadHours: form.workloadHours,
          ownership: form.ownership,
        },
      });
      toast.success("Teaching assignment mapped and course file generated");
      setShowCreate(false);
      loadAssignments();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save mapping");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this teaching assignment workload mapping? This will delete the linked course file submission data.")) return;
    try {
      await deleteAssignment({ data: { id } });
      toast.success("Assignment deleted");
      loadAssignments();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete mapping");
    }
  };

  const toggleSection = (s: string) => {
    const next = form.sections.includes(s)
      ? form.sections.filter((x) => x !== s)
      : [...form.sections, s];
    setForm({ ...form, sections: next });
  };

  const toggleYear = (y: string) => {
    const next = form.yearOfStudy.includes(y)
      ? form.yearOfStudy.filter((x) => x !== y)
      : [...form.yearOfStudy, y];
    setForm({ ...form, yearOfStudy: next });
  };

  return (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto">
      <header className="mb-8 flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Governance & Workload</div>
          <h1 className="font-display text-4xl text-foreground mt-1">Teaching Assignments</h1>
          <p className="text-muted-foreground text-sm mt-1">Map faculty members to courses, configure workloads, sections, and semesters.</p>
        </div>
        {["super_admin", "principal", "hod"].includes(primaryRole || "") && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-sm font-semibold hover:bg-primary/95 transition-all shadow-soft"
          >
            <Plus className="w-4 h-4" /> Add Assignment
          </button>
        )}
      </header>

      {loading ? (
        <div className="py-24 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm shadow-soft overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-parchment text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left px-5 py-4">Faculty Member</th>
                <th className="text-left px-5 py-4">Course</th>
                <th className="text-left px-5 py-4">Year & Sem</th>
                <th className="text-left px-5 py-4">Sections</th>
                <th className="text-left px-5 py-4">Hours/Wk</th>
                <th className="text-left px-5 py-4">Role</th>
                <th className="text-right px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">No workloads assigned. Add a new teaching mapping to start.</td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-parchment/30">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-foreground">{a.profiles?.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{a.profiles?.email} · {a.profiles?.department}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-mono text-xs text-primary font-bold">{a.courses?.code}</div>
                      <div className="font-medium text-foreground">{a.courses?.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{a.courses?.type} · {a.courses?.regulation}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium">{a.academic_year}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Year: {a.year_of_study?.join(", ")} · Sem: {a.semester}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        {a.sections?.map((sec: string) => (
                          <span key={sec} className="px-1.5 py-0.5 text-xs bg-muted border border-border rounded-sm font-semibold">{sec}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-foreground font-mono">{a.workload_hours}h</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-sm font-semibold ${
                        a.ownership === "Primary" ? "bg-primary/10 text-primary border border-primary/20" : "bg-gold/20 text-gold-foreground border border-gold/40"
                      }`}>{a.ownership}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {["super_admin", "principal", "hod"].includes(primaryRole || "") && (
                        <button onClick={() => handleDelete(a.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-sm" title="Remove assignment">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreate} className="bg-card border border-border rounded-sm max-w-lg w-full shadow-elegant max-h-[95vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="font-display text-2xl">Create Assignment Mapping</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block">
                <span className="text-xs uppercase text-muted-foreground font-semibold">Faculty Member</span>
                <select value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })} className="input-field w-full mt-1">
                  <option value="">— Select Faculty —</option>
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>{f.full_name} ({f.email}) · {f.department}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs uppercase text-muted-foreground font-semibold">Course</span>
                <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} className="input-field w-full mt-1">
                  <option value="">— Select Course —</option>
                  {coursesList.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} · {c.name} ({c.type} - {c.regulation})</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs uppercase text-muted-foreground font-semibold">Academic Year</span>
                  <select value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} className="input-field w-full mt-1">
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2027-2028">2027-2028</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs uppercase text-muted-foreground font-semibold">Semester</span>
                  <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} className="input-field w-full mt-1">
                    <option value="I">I</option>
                    <option value="II">II</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs uppercase text-muted-foreground font-semibold">Workload Hours/Wk</span>
                  <input type="number" min="1" value={form.workloadHours} onChange={(e) => setForm({ ...form, workloadHours: parseInt(e.target.value) })} className="input-field w-full mt-1" />
                </label>
                <label className="block">
                  <span className="text-xs uppercase text-muted-foreground font-semibold">Faculty Role</span>
                  <select value={form.ownership} onChange={(e) => setForm({ ...form, ownership: e.target.value as any })} className="input-field w-full mt-1">
                    <option value="Primary">Primary Owner</option>
                    <option value="Co-Faculty">Co-Faculty</option>
                    <option value="Substitute">Substitute</option>
                    <option value="Reviewer">Reviewer</option>
                  </select>
                </label>
              </div>

              <div>
                <span className="text-xs uppercase text-muted-foreground font-semibold">Select Sections</span>
                <div className="flex gap-2 mt-2">
                  {["A", "B", "C", "D"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSection(s)}
                      className={`px-3 py-1.5 border rounded-sm text-xs font-semibold ${
                        form.sections.includes(s) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/55"
                      }`}
                    >Section {s}</button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs uppercase text-muted-foreground font-semibold">Year of Study</span>
                <div className="flex gap-2 mt-2">
                  {["I", "II", "III", "IV"].map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => toggleYear(y)}
                      className={`px-3 py-1.5 border rounded-sm text-xs font-semibold ${
                        form.yearOfStudy.includes(y) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/55"
                      }`}
                    >Year {y}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3 bg-parchment/20">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Map Assignment
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .input-field { padding: 0.6rem 0.8rem; border: 1px solid var(--color-border); border-radius: 0.125rem; background: var(--color-parchment); font-size: 0.9rem; }
        .input-field:focus { outline: none; border-color: var(--color-primary); }
      `}</style>
    </div>
  );
}
