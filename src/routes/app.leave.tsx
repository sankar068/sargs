import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthState } from "@/hooks/useAuth";
import {
  submitLeave,
  reviewLeave,
} from "@/features/governance/governance.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarDays, Plus, Loader2, Calendar, FileText, CheckCircle2, AlertTriangle,
  User, Check, X, ShieldAlert, Clock
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/leave")({
  component: LeaveManagementPage,
});

function LeaveManagementPage() {
  const { user, primaryRole } = useAuthState();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [departmentLeaves, setDepartmentLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Leave Form state
  const [leaveType, setLeaveType] = useState("Casual");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [totalDays, setTotalDays] = useState(1);
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  // Substitute faculty details
  const [subFacultyId, setSubFacultyId] = useState("");
  const [subClass, setSubClass] = useState("");
  const [subTime, setSubTime] = useState("");
  const [continuityPlan, setContinuityPlan] = useState<any[]>([]);

  // Helpers
  const [facultyList, setFacultyList] = useState<any[]>([]);

  const loadLeaves = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load personal leaves
      const { data: myLvs } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("faculty_id", user.id)
        .order("created_at", { ascending: false });
      setLeaves(myLvs ?? []);

      // Load department leaves if HOD or higher
      if (["hod", "dean", "principal", "super_admin"].includes(primaryRole || "")) {
        const { data: deptLvs } = await supabase
          .from("leave_requests")
          .select("*, profiles(full_name, email, department)")
          .order("created_at", { ascending: false });
        setDepartmentLeaves(deptLvs ?? []);
      }
    } catch (err: any) {
      toast.error("Failed to load leaves: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHelpers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, department")
      .order("full_name");
    setFacultyList(profiles ?? []);
  };

  useEffect(() => {
    loadLeaves();
    loadHelpers();
  }, [user, primaryRole]);

  const handleAddContinuity = () => {
    if (!subFacultyId || !subClass || !subTime) {
      toast.error("Complete class adjustment fields first");
      return;
    }
    const name = facultyList.find((f) => f.id === subFacultyId)?.full_name || "Substitute";
    setContinuityPlan([...continuityPlan, {
      class: subClass,
      substituteFacultyId: subFacultyId,
      substituteName: name,
      timeSlot: subTime,
    }]);
    setSubClass("");
    setSubTime("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let attachmentPath = null;
      if (attachment) {
        const ext = attachment.name.split(".").pop();
        const path = `leaves/${user?.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("sargs-documents").upload(path, attachment);
        if (upErr) throw upErr;
        attachmentPath = path;
      }

      await submitLeave({
        data: {
          leaveType,
          fromDate,
          toDate,
          halfDay: false,
          totalDays,
          reason,
          attachmentPath,
          continuityPlan: continuityPlan.map((c) => ({
            class: c.class,
            substituteFacultyId: c.substituteFacultyId,
            timeSlot: c.timeSlot,
          })),
        },
      });

      toast.success("Leave request submitted and routed to HOD");
      setShowCreate(false);
      setContinuityPlan([]);
      loadLeaves();
    } catch (err: any) {
      toast.error("Request failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReviewAction = async (id: string, action: "approve" | "reject" | "forward") => {
    try {
      await reviewLeave({ data: { leaveId: id, action } });
      toast.success(`Leave request ${action}d successfully`);
      loadLeaves();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to complete review");
    }
  };

  return (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto">
      <header className="mb-8 flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Absence & Continuity</div>
          <h1 className="font-display text-4xl text-foreground mt-1">Leave Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Submit personal leaves, specify substitution faculty, or review department leave approvals.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-sm font-semibold hover:bg-primary/95 transition-all shadow-soft"
        >
          <Plus className="w-4 h-4" /> Request Leave
        </button>
      </header>

      {/* Warnings / Policy Info */}
      <div className="mb-6 p-4 border border-gold/40 bg-gold/10 rounded-sm flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
        <div className="text-sm">
          <span className="font-bold">Gating Policy:</span> St. Peter's Engineering College requires that any summer vacation or leaves longer than 5 days require prior clearance of all mandatory Section A/B/C course file checklist items.
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-sm shadow-soft p-6">
            <h2 className="font-display text-2xl mb-4 border-b border-border/40 pb-2 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> My Leave Requests
            </h2>
            <div className="space-y-4">
              {leaves.length === 0 && <div className="p-8 text-center text-muted-foreground">No leave history.</div>}
              {leaves.map((l) => (
                <div key={l.id} className="p-4 border border-border rounded-sm flex justify-between items-start gap-4 hover:bg-parchment/10">
                  <div>
                    <div className="font-display text-lg font-bold text-foreground">{l.leave_type} Leave</div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">{new Date(l.from_date).toLocaleDateString()} - {new Date(l.to_date).toLocaleDateString()} · {l.total_days} Day(s)</div>
                    <p className="text-xs text-muted-foreground mt-1 italic">"{l.reason}"</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${
                    l.status === "Approved" ? "bg-green-100 text-green-800" :
                    l.status === "Rejected" ? "bg-red-100 text-red-800" : "bg-gold/20 text-gold-foreground"
                  }`}>{l.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Approvals tab for HODs */}
        {["hod", "dean", "principal", "super_admin"].includes(primaryRole || "") && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-sm shadow-soft p-6">
              <h2 className="font-display text-2xl mb-4 border-b border-border/40 pb-2 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" /> Pending Approvals
              </h2>
              <div className="space-y-4">
                {departmentLeaves.filter((l) => l.status === "Submitted" || l.status === "Under HOD Review").length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-xs">No pending leave applications.</div>
                )}
                {departmentLeaves.filter((l) => l.status === "Submitted" || l.status === "Under HOD Review").map((l) => (
                  <div key={l.id} className="p-4 border border-border rounded-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-foreground text-sm">{l.profiles?.full_name}</div>
                        <div className="text-xs text-muted-foreground">{l.profiles?.department} · {l.leave_type}</div>
                      </div>
                      <span className="text-[10px] bg-gold/20 text-gold-foreground px-1.5 py-0.5 font-mono">{l.total_days}d</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">"{l.reason}"</p>
                    <div className="flex gap-1.5 justify-end pt-2 border-t border-border/40">
                      <button onClick={() => handleReviewAction(l.id, "reject")} className="p-1 border border-destructive/40 text-destructive rounded-sm hover:bg-destructive/10"><X className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleReviewAction(l.id, "forward")} className="px-2 py-1 border border-border text-xs rounded-sm hover:bg-muted" title="Escalate to Dean">Forward</button>
                      <button onClick={() => handleReviewAction(l.id, "approve")} className="px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-sm hover:bg-primary/95">Approve</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-sm max-w-lg w-full shadow-elegant max-h-[95vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="font-display text-2xl">Request Leave</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block">
                <span className="text-xs uppercase text-muted-foreground font-semibold">Leave Type</span>
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="input-field w-full mt-1">
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick/Medical">Sick/Medical Leave</option>
                  <option value="On-Duty">On-Duty / Duty Leave</option>
                  <option value="Earned">Earned Leave</option>
                  <option value="Vacation">Vacation Leave</option>
                </select>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="text-xs uppercase text-muted-foreground font-semibold">From Date</span>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input-field w-full mt-1" />
                </label>
                <label className="block">
                  <span className="text-xs uppercase text-muted-foreground font-semibold">To Date</span>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input-field w-full mt-1" />
                </label>
                <label className="block">
                  <span className="text-xs uppercase text-muted-foreground font-semibold">Total Days</span>
                  <input type="number" step="0.5" value={totalDays} onChange={(e) => setTotalDays(parseFloat(e.target.value))} className="input-field w-full mt-1" />
                </label>
              </div>

              <label className="block">
                <span className="text-xs uppercase text-muted-foreground font-semibold">Reason</span>
                <textarea required rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="input-field w-full mt-1" />
              </label>

              <label className="block">
                <span className="text-xs uppercase text-muted-foreground font-semibold">Attachment (Medical Certificate, etc.)</span>
                <input type="file" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} className="w-full mt-1 text-xs" />
              </label>

              {/* Continuity Planning */}
              <div className="border-t border-border pt-4">
                <span className="text-xs uppercase text-primary font-bold">Academic Continuity Plan</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">Specify class adjustments and substitute teachers to maintain timetable integrity during your absence.</p>
                
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <input placeholder="Class (e.g. III CSE-A)" value={subClass} onChange={(e) => setSubClass(e.target.value)} className="input-field text-xs" />
                  <select value={subFacultyId} onChange={(e) => setSubFacultyId(e.target.value)} className="input-field text-xs">
                    <option value="">— Substitute —</option>
                    {facultyList.map((f) => <option key={f.id} value={f.id}>{f.full_name}</option>)}
                  </select>
                  <input placeholder="Time slot" value={subTime} onChange={(e) => setSubTime(e.target.value)} className="input-field text-xs" />
                </div>
                <button type="button" onClick={handleAddContinuity} className="mt-2 text-xs text-primary font-bold hover:underline">+ Add Class Adjustment</button>

                <div className="space-y-1.5 mt-3">
                  {continuityPlan.map((c, i) => (
                    <div key={i} className="text-xs p-2 bg-muted rounded-sm border border-border/40 flex justify-between">
                      <span>Class: {c.class} · Sub: {c.substituteName} · Time: {c.timeSlot}</span>
                      <button type="button" onClick={() => setContinuityPlan(continuityPlan.filter((_, idx) => idx !== i))} className="text-destructive font-bold">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3 bg-parchment/20">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Leave
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
