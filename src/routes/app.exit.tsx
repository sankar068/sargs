import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthState } from "@/hooks/useAuth";
import {
  initiateExit,
  updateTaskStatus,
  reviewExitRequest,
  finalizeExit,
} from "@/features/governance/governance.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  DoorOpen, FileText, CheckCircle2, Loader2, ArrowLeft, Plus,
  ClipboardList, User, ShieldAlert, Check, X, Lock,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/exit")({
  component: ExitHandoverPage,
});

function ExitHandoverPage() {
  const { user, primaryRole } = useAuthState();
  const [exitRequest, setExitRequest] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [departmentExits, setDepartmentExits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [actualReleaseDate, setActualReleaseDate] = useState("");

  // Form states
  const [requestType, setRequestType] = useState<any>("Resignation");
  const [proposedLastDate, setProposedLastDate] = useState("");
  const [reasonCategory, setReasonCategory] = useState("Better Career Opportunities");
  const [statement, setStatement] = useState("");
  const [resignationLetter, setResignationLetter] = useState<File | null>(null);

  const loadExitData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch personal exit request
      const { data: myExit } = await supabase
        .from("exit_requests")
        .select("*")
        .eq("faculty_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setExitRequest(myExit);

      if (myExit) {
        const { data: tks } = await supabase
          .from("handover_tasks")
          .select("*, profiles(full_name)")
          .eq("exit_request_id", myExit.id)
          .order("area");
        setTasks(tks ?? []);
      }

      // Fetch department exits if HOD or higher
      if (["hod", "dean", "principal", "super_admin"].includes(primaryRole || "")) {
        const { data: deptExits } = await supabase
          .from("exit_requests")
          .select("*, profiles(full_name, email, department)")
          .order("created_at", { ascending: false });
        setDepartmentExits(deptExits ?? []);
      }
    } catch (err: any) {
      toast.error("Failed to load exit details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadExitData(); }, [user, primaryRole]);

  const handleSubmitNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposedLastDate) { toast.error("Please specify a last working date"); return; }
    setSaving(true);

    try {
      let resignationLetterPath = null;
      if (resignationLetter) {
        const ext = resignationLetter.name.split(".").pop();
        const path = `exits/${user?.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("sargs-documents").upload(path, resignationLetter);
        if (upErr) throw upErr;
        resignationLetterPath = path;
      }

      await initiateExit({
        data: {
          requestType,
          proposedLastWorkingDate: proposedLastDate,
          reasonCategory,
          facultyStatement: statement,
          resignationLetterPath,
        },
      });

      toast.success("Exit notice submitted and handover tasks generated");
      setShowCreate(false);
      loadExitData();
    } catch (err: any) {
      toast.error("Notice submission failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTaskCheck = async (taskId: string, currentStatus: string) => {
    const next = currentStatus === "Completed" ? "Pending" : "Completed";
    try {
      await updateTaskStatus({
        data: {
          taskId,
          status: next,
        },
      });
      toast.success(`Task marked as ${next}`);
      loadExitData();
    } catch (err: any) {
      toast.error("Task update failed: " + err.message);
    }
  };

  const handleReviewAction = async (id: string, action: "recommend" | "approve" | "return") => {
    try {
      await reviewExitRequest({
        data: {
          exitRequestId: id,
          action,
        },
      });
      toast.success(`Exit request ${action === "recommend" ? "recommended" : action === "approve" ? "approved" : "returned"}`);
      loadExitData();
    } catch (err: any) {
      toast.error("Review action failed: " + err.message);
    }
  };

  const handleFinalizeRelease = async (exitId: string) => {
    if (!actualReleaseDate) {
      toast.error("Please set the actual release date before finalizing");
      return;
    }
    if (!confirm("This will disable the faculty's login. Confirm final release?")) return;
    setFinalizing(true);
    try {
      await finalizeExit({ data: { exitRequestId: exitId, actualReleaseDate } });
      toast.success("Faculty released — login has been disabled");
      loadExitData();
    } catch (err: any) {
      toast.error(err.message ?? "Finalization failed");
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const isPrivileged = ["hod", "dean", "principal", "super_admin"].includes(primaryRole || "");

  return (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto">
      <header className="mb-8 flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Offboarding & Handover</div>
          <h1 className="font-display text-4xl text-foreground mt-1">Exit Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Submit exit notices, complete handover task lists, or approve department offboardings.</p>
        </div>
        {!exitRequest && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-sm font-semibold hover:bg-primary/95 transition-all shadow-soft"
          >
            <DoorOpen className="w-4 h-4" /> Submit Exit Notice
          </button>
        )}
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {exitRequest ? (
            <div className="bg-card border border-border rounded-sm shadow-soft p-6">
              <div className="flex justify-between items-start border-b border-border/40 pb-4 mb-6">
                <div>
                  <h2 className="font-display text-2xl font-bold">My Exit Details</h2>
                  <p className="text-xs text-muted-foreground mt-1">Proposed release date: {new Date(exitRequest.proposed_last_working_date).toLocaleDateString()}</p>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-sm font-bold bg-gold/20 text-gold-foreground border border-gold-300 uppercase">{exitRequest.status}</span>
              </div>

              <h3 className="font-display text-xl mb-4 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-primary" /> Handover Checklists</h3>
              <div className="space-y-3">
                {tasks.map((t) => {
                  const isChecked = t.status === "Completed" || t.status === "Approved";
                  return (
                    <div key={t.id} className="p-4 border border-border rounded-sm flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTaskCheck(t.id, t.status)}
                          className="rounded-sm w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <div className="text-sm font-semibold text-foreground">{t.area} Handover</div>
                          <div className="text-xs text-muted-foreground">{t.task_description}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm ${
                        isChecked ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"
                      }`}>{t.status}</span>
                    </div>
                  );
                })}
              </div>

              {/* Finalize Release (Principal/Admin only) */}
              {["super_admin", "principal", "admin_staff"].includes(primaryRole || "") &&
               ["Approved - Notice Period", "Recommended"].includes(exitRequest.status) && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="font-display text-xl mb-3 flex items-center gap-2 text-destructive"><Lock className="w-5 h-5" /> Finalize Release</h3>
                  <p className="text-xs text-muted-foreground mb-3">All mandatory handover tasks must be completed before release. This will permanently disable the faculty's login.</p>
                  <div className="flex items-end gap-3">
                    <label className="block flex-1">
                      <span className="text-xs uppercase text-muted-foreground font-semibold">Actual Release Date *</span>
                      <input type="date" value={actualReleaseDate} onChange={e => setActualReleaseDate(e.target.value)} className="input-field w-full mt-1" />
                    </label>
                    <button
                      onClick={() => handleFinalizeRelease(exitRequest.id)}
                      disabled={finalizing || !actualReleaseDate}
                      className="px-4 py-2.5 bg-destructive text-destructive-foreground rounded-sm text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                    >
                      {finalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      Finalize & Release
                    </button>
                  </div>
                  <div className="mt-3 flex gap-1.5 flex-wrap">
                    {tasks.map(t => (
                      <span key={t.id} className={`text-[10px] px-2 py-0.5 rounded-sm font-semibold border ${t.status === "Completed" || t.status === "Approved" ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}`}>
                        {t.area}: {t.status}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-16 text-center bg-card border border-border rounded-sm shadow-soft">
              <DoorOpen className="w-12 h-12 text-muted-foreground/65 mx-auto mb-4" />
              <h3 className="font-display text-2xl text-foreground mb-2">No Active Exit Request</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                If you are planning to leave the institution, submit a formal notice first. Handover tasks will be automatically generated.
              </p>
            </div>
          )}
        </div>

        {/* HOD / Admin Reviews */}
        {isPrivileged && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-sm shadow-soft p-6">
              <h2 className="font-display text-2xl mb-4 border-b border-border/40 pb-2 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-primary" /> Exit Approvals</h2>
              <div className="space-y-4">
                {departmentExits.filter((e) => e.status === "Submitted" || e.status === "HOD Review").length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-xs">No pending exits to review.</div>
                )}
                {departmentExits.filter((e) => e.status === "Submitted" || e.status === "HOD Review").map((e) => (
                  <div key={e.id} className="p-4 border border-border rounded-sm space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-foreground text-sm">{e.profiles?.full_name}</div>
                        <div className="text-xs text-muted-foreground">{e.profiles?.department} · {e.request_type}</div>
                      </div>
                      <span className="text-[10px] bg-gold/20 text-gold-foreground px-1.5 py-0.5 font-mono">{e.status}</span>
                    </div>
                    <div className="flex gap-1.5 justify-end pt-2 border-t border-border/40">
                      <button onClick={() => handleReviewAction(e.id, "return")} className="p-1 border border-destructive/40 text-destructive rounded-sm hover:bg-destructive/10"><X className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleReviewAction(e.id, "recommend")} className="px-2 py-1 border border-border text-xs rounded-sm hover:bg-muted">Recommend</button>
                      <button onClick={() => handleReviewAction(e.id, "approve")} className="px-2 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-sm hover:bg-primary/95">Approve Notice</button>
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
          <form onSubmit={handleSubmitNotice} className="bg-card border border-border rounded-sm max-w-lg w-full shadow-elegant max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="font-display text-2xl">Submit Exit Notice</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs uppercase text-muted-foreground font-semibold">Exit Request Type</span>
                  <select value={requestType} onChange={(e) => setRequestType(e.target.value as any)} className="input-field w-full mt-1">
                    <option value="Resignation">Resignation</option>
                    <option value="Retirement">Retirement</option>
                    <option value="End of Contract">End of Contract</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Termination">Termination</option>
                    <option value="Long-term Separation">Long-term Separation</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs uppercase text-muted-foreground font-semibold">Proposed Last Date</span>
                  <input type="date" value={proposedLastDate} onChange={(e) => setProposedLastDate(e.target.value)} className="input-field w-full mt-1" />
                </label>
              </div>

              <label className="block">
                <span className="text-xs uppercase text-muted-foreground font-semibold">Reason Category</span>
                <select value={reasonCategory} onChange={(e) => setReasonCategory(e.target.value)} className="input-field w-full mt-1">
                  <option value="Better Career Opportunities">Better Career Opportunities</option>
                  <option value="Relocation">Relocation</option>
                  <option value="Personal / Family Reasons">Personal / Family Reasons</option>
                  <option value="Health Issues">Health Issues</option>
                  <option value="Higher Studies">Higher Studies</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs uppercase text-muted-foreground font-semibold">Faculty Statement / Remarks</span>
                <textarea rows={3} value={statement} onChange={(e) => setStatement(e.target.value)} className="input-field w-full mt-1" />
              </label>

              <label className="block">
                <span className="text-xs uppercase text-muted-foreground font-semibold">Resignation Letter (PDF/DOCX)</span>
                <input type="file" onChange={(e) => setResignationLetter(e.target.files?.[0] ?? null)} className="w-full mt-1 text-xs" />
              </label>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3 bg-parchment/20">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Notice
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
