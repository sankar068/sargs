import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthState } from "@/hooks/useAuth";
import {
  getMyCourseFiles,
  getCourseFileDetail,
  submitEvidenceFile,
  reviewEvidenceItem,
  finalizeCourseFileSubmission,
} from "@/features/governance/governance.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  FileSpreadsheet, FileText, CheckCircle2, AlertCircle, RefreshCw, Upload,
  ArrowLeft, Download, Eye, Loader2, MessageSquare, ChevronRight
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/course-files")({
  component: CourseFilesPage,
});

function CourseFilesPage() {
  const { user, primaryRole } = useAuthState();
  const [courseFiles, setCourseFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadList = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getMyCourseFiles({ data: { userId: user.id } });
      setCourseFiles(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error("Failed to load course files: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadList(); }, [user]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedId) {
    return <CourseFileDetailView courseFileId={selectedId} onBack={() => { setSelectedId(null); loadList(); }} />;
  }

  return (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Course Portfolios</div>
        <h1 className="font-display text-4xl text-foreground mt-1">My Course Files</h1>
        <p className="text-muted-foreground text-sm mt-1">Compile Section A, B, and C course-file portfolios for your assigned teaching workloads.</p>
      </header>

      {courseFiles.length === 0 ? (
        <div className="p-16 text-center bg-card border border-border rounded-sm shadow-soft">
          <FileSpreadsheet className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
          <h3 className="font-display text-2xl text-foreground mb-2">No Course Files Assigned</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Once the HOD maps your teaching workload and subjects in the Teaching Assignments screen, your course file checklists will generate here automatically.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {courseFiles.map((cf) => {
            const statusColorClass =
              cf.status === "Approved" ? "bg-green-100 text-green-800 border-green-200" :
              cf.status === "Submitted" ? "bg-gold/20 text-gold-foreground border-gold/30" :
              cf.status === "Draft" ? "bg-blue-50 text-blue-800 border-blue-200" :
              "bg-muted text-muted-foreground border-border";

            return (
              <div
                key={cf.id}
                onClick={() => setSelectedId(cf.id)}
                className="bg-card border border-border rounded-sm hover:border-primary/50 cursor-pointer p-6 transition-all shadow-soft flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-xs font-bold font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-sm">{cf.teaching_assignments?.courses?.code}</span>
                      <h3 className="font-display text-2xl mt-2 text-foreground font-semibold">{cf.teaching_assignments?.courses?.name}</h3>
                      <p className="text-muted-foreground text-xs mt-1">Year: {cf.teaching_assignments?.year_of_study?.join(", ")} · Sem: {cf.teaching_assignments?.semester} · Sec: {cf.teaching_assignments?.sections?.join(", ")}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-sm font-semibold border ${statusColorClass}`}>
                      {cf.status}
                    </span>
                  </div>

                  <div className="mt-6">
                    {cf.status === "Draft" ? (
                      <>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Upload in progress</span>
                          <span className="font-semibold text-foreground italic">Open to view progress</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div className="bg-primary h-full animate-pulse" style={{ width: "40%" }} />
                        </div>
                      </>
                    ) : cf.status === "Not Started" ? (
                      <p className="text-xs text-muted-foreground italic">No documents uploaded yet. Click to start.</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {cf.status === "Submitted" ? "Portfolio locked and submitted for review." : "Portfolio reviewed and approved."}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-border/40 text-xs">
                  <span className="text-muted-foreground">Template: {cf.course_file_templates?.name}</span>
                  <span className="text-primary font-semibold flex items-center gap-1">Compile File <ChevronRight className="w-3.5 h-3.5" /></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CourseFileDetailView({ courseFileId, onBack }: { courseFileId: string; onBack: () => void }) {
  const { user, primaryRole } = useAuthState();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterSection, setFilterSection] = useState<string>("all");
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);
  
  // Review comments states
  const [reviewingItem, setReviewingItem] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await getCourseFileDetail({ data: { courseFileId } });
      setDetail(res && res.courseFile ? res : null);
    } catch (err: any) {
      toast.error("Failed to load details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDetail(); }, [courseFileId]);

  const handleFileUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingItem(itemId);

    try {
      const ext = file.name.split(".").pop();
      const path = `course-files/${courseFileId}/${itemId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("sargs-documents").upload(path, file);
      if (upErr) throw upErr;

      await submitEvidenceFile({
        data: {
          courseFileId,
          templateItemId: itemId,
          storagePath: path,
          fileName: file.name,
          fileSize: file.size,
        },
      });

      toast.success("Document uploaded to checklist item");
      loadDetail();
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploadingItem(null);
    }
  };

  const handleReview = async (evidenceId: string, status: "Verified" | "Returned for Correction") => {
    try {
      await reviewEvidenceItem({
        data: {
          evidenceId,
          status,
          comments: reviewComment,
        },
      });
      toast.success(`Item marked as ${status}`);
      setReviewingItem(null);
      setReviewComment("");
      loadDetail();
    } catch (err: any) {
      toast.error("Review action failed: " + err.message);
    }
  };

  const handleFinalSubmit = async () => {
    if (!confirm("Are you sure you want to finalize and lock editing? HOD will be notified for final review.")) return;
    try {
      await finalizeCourseFileSubmission({ data: { courseFileId } });
      toast.success("Course file portfolio locked and submitted to HOD");
      loadDetail();
    } catch (err: any) {
      toast.error(err.message ?? "Final submission failed");
    }
  };

  const openSignedUrl = async (path: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("sargs-documents")
        .createSignedUrl(path, 60 * 5);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      toast.error("Could not retrieve file: " + err.message);
    }
  };

  if (loading || !detail) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const { courseFile, items, evidence } = detail ?? {};
  const safeItems = Array.isArray(items) ? items : [];
  const safeEvidence = Array.isArray(evidence) ? evidence : [];
  const isFacultyOwner = user?.id === courseFile?.teaching_assignments?.faculty_id;
  const isReviewer = ["hod", "dean", "principal", "iqac_coordinator", "super_admin"].includes(primaryRole || "");

  const filteredItems = safeItems.filter((it: any) => {
    // Only show active items to faculty; reviewers see all
    const passActive = isReviewer ? true : it.is_active !== false;
    if (!passActive) return false;
    if (filterSection === "all") return true;
    return it.section === filterSection;
  });

  return (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground mb-6 font-semibold">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Portfolios
      </button>

      <header className="mb-8 flex justify-between items-start flex-wrap gap-4 border-b border-border/40 pb-6">
        <div>
          <span className="text-xs font-bold font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-sm">{courseFile?.teaching_assignments?.courses?.code}</span>
          <h1 className="font-display text-4xl text-foreground mt-2">{courseFile?.teaching_assignments?.courses?.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Instructor: {courseFile?.teaching_assignments?.profiles?.full_name} · Year: {courseFile?.teaching_assignments?.year_of_study?.join(", ")} · Sem: {courseFile?.teaching_assignments?.semester} · Sec: {courseFile?.teaching_assignments?.sections?.join(", ")}
          </p>
        </div>
        <div className="flex gap-2">
          {isFacultyOwner && courseFile?.status !== "Submitted" && courseFile?.status !== "Approved" && (
            <button
              onClick={handleFinalSubmit}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-sm shadow-soft hover:bg-primary/95"
            >Declare & Lock Portfolio</button>
          )}
          <span className={`text-xs px-3 py-1 rounded-sm font-bold border flex items-center ${
            courseFile?.status === "Approved" ? "bg-green-100 text-green-800 border-green-200" :
            courseFile?.status === "Submitted" ? "bg-gold/20 text-gold-foreground border-gold/30" : "bg-muted text-muted-foreground border-border"
          }`}>{courseFile?.status}</span>
        </div>
      </header>

      {/* Filter Section Buttons */}
      <div className="flex border-b border-border mb-6 gap-2 overflow-x-auto pb-1">
        {["all", "Section A", "Section B", "Section C"].map((sec) => (
          <button
            key={sec}
            onClick={() => setFilterSection(sec)}
            className={`px-4 py-2 text-xs font-bold border-b-2 whitespace-nowrap ${
              filterSection === sec ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >{sec === "all" ? "All Sections" : sec}</button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredItems.map((item: any) => {
          const itemEvidence = safeEvidence.filter((e: any) => e.template_item_id === item.id);
          const activeEv = itemEvidence.sort((x: any, y: any) => y.version - x.version)[0]; // Latest version
          const isItemLocked = courseFile?.status === "Submitted" || courseFile?.status === "Approved";

          return (
            <div key={item.id} className={`bg-card border border-border rounded-sm p-5 shadow-soft flex flex-col md:flex-row justify-between gap-6 ${item.is_active === false ? "opacity-60 border-dashed" : ""}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">{item.code}</span>
                  <span className="text-xs text-muted-foreground font-semibold uppercase">{item.section}</span>
                  {item.requirement === "Mandatory" && <span className="text-[10px] bg-red-100 text-red-800 border border-red-200 px-1 rounded-sm font-bold">Mandatory</span>}
                  {item.is_active === false && <span className="text-[10px] bg-muted text-muted-foreground border border-border px-1 rounded-sm font-bold">Inactive</span>}
                </div>
                <h3 className="font-display text-xl text-foreground font-semibold mt-2">{item.document_name}</h3>
                {item.instructions && <p className="text-xs text-muted-foreground mt-1">{item.instructions}</p>}
                
                {/* Evidence history / comment display */}
                {activeEv && (
                  <div className="mt-4 p-3 bg-parchment rounded-sm border border-border/40 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span>Uploaded File: {activeEv.file_name} (v{activeEv.version})</span>
                      <button onClick={() => openSignedUrl(activeEv.storage_path, activeEv.file_name)} className="text-primary hover:underline flex items-center gap-1">
                        <Eye className="w-3 h-3" /> View Evidence
                      </button>
                    </div>
                    {activeEv.comments && (
                      <div className="mt-2 text-gold-foreground bg-gold/10 p-2 border border-gold/30 rounded-sm flex items-start gap-1">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gold" />
                        <span><strong>Reviewer Comment:</strong> {activeEv.comments}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center items-end gap-2 shrink-0">
                {activeEv ? (
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                      activeEv.status === "Verified" ? "bg-green-100 text-green-800 border border-green-200" :
                      activeEv.status === "Returned for Correction" ? "bg-red-100 text-red-800 border border-red-200" : "bg-gold/20 text-gold-foreground border border-gold/40"
                    }`}>{activeEv.status}</span>

                    {isReviewer && !isItemLocked && reviewingItem !== activeEv.id && (
                      <button onClick={() => setReviewingItem(activeEv.id)} className="px-2.5 py-1 text-xs border border-primary text-primary rounded-sm font-bold hover:bg-primary/10">Review</button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">No evidence uploaded</span>
                )}

                {/* Upload Button for Faculty */}
                {isFacultyOwner && !isItemLocked && (
                  <label className="px-3 py-1.5 border border-dashed border-primary hover:bg-primary/10 text-primary text-xs font-bold rounded-sm cursor-pointer flex items-center gap-1">
                    {uploadingItem === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    Upload File
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(item.id, e)} disabled={uploadingItem !== null} />
                  </label>
                )}
              </div>

              {/* Inline Review Panel */}
              {reviewingItem === activeEv?.id && (
                <div className="w-full border-t border-border/40 pt-4 flex flex-col gap-3">
                  <textarea
                    rows={2}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Enter review comments (mandatory if returning for correction)..."
                    className="input-field w-full"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setReviewingItem(null)} className="px-3 py-1.5 border border-border text-xs">Cancel</button>
                    <button onClick={() => handleReview(activeEv.id, "Returned for Correction")} className="px-3 py-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-sm">Return for Correction</button>
                    <button onClick={() => handleReview(activeEv.id, "Verified")} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-sm">Verify / Approve</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .input-field { padding: 0.6rem 0.8rem; border: 1px solid var(--color-border); border-radius: 0.125rem; background: var(--color-parchment); font-size: 0.9rem; }
        .input-field:focus { outline: none; border-color: var(--color-primary); }
      `}</style>
    </div>
  );
}
