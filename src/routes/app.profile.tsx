import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthState } from "@/hooks/useAuth";
import {
  getFacultyProfile,
  updateFacultyProfile,
  addQualification,
  addExperienceRecord,
  verifyProfileSection,
} from "@/features/governance/governance.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  User, Mail, Phone, BookOpen, Briefcase, Lock, ShieldCheck,
  Plus, Loader2, Save, BadgeCheck, FileText, Eye, EyeOff, CheckCircle2,
  AlertTriangle, Clock,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/profile")({
  component: FacultyProfilePage,
});

type Tab = "identity" | "qualifications" | "experience" | "vault";

const STATUS_COLORS: Record<string, string> = {
  Invited: "bg-muted text-muted-foreground",
  Onboarding: "bg-blue-100 text-blue-800",
  Active: "bg-green-100 text-green-800",
  "On Leave": "bg-yellow-100 text-yellow-800",
  "Notice Period": "bg-orange-100 text-orange-800",
  Exited: "bg-red-100 text-red-800",
  Retired: "bg-purple-100 text-purple-800",
  Suspended: "bg-red-200 text-red-900",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";
  return <span className={`text-xs px-2 py-0.5 rounded-sm font-semibold ${cls}`}>{status}</span>;
}

function VerifyBadge({ status }: { status?: string }) {
  if (!status) return null;
  if (status === "Verified") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-sm bg-green-100 text-green-800 border border-green-200">
      <CheckCircle2 className="w-3 h-3" /> Verified
    </span>
  );
  if (status === "Returned for Correction") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-sm bg-orange-100 text-orange-800 border border-orange-200">
      <AlertTriangle className="w-3 h-3" /> Returned
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-sm bg-muted text-muted-foreground border border-border">
      <Clock className="w-3 h-3" /> {status}
    </span>
  );
}

function FacultyProfilePage() {
  const { user, primaryRole } = useAuthState();
  const [activeTab, setActiveTab] = useState<Tab>("identity");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [facultyData, setFacultyData] = useState<any>({});
  const [qualifications, setQualifications] = useState<any[]>([]);
  const [experience, setExperience] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  const [showAadhaar, setShowAadhaar] = useState(false);
  const [showPan, setShowPan] = useState(false);

  const [showAddQual, setShowAddQual] = useState(false);
  const [qualForm, setQualForm] = useState({
    level: "UG", degree: "", specialization: "", institution: "",
    university: "", start_year: 2020, end_year: 2024, percentage_cgpa: 0,
    register_number: "", mode: "Regular",
  });

  const [showAddExp, setShowAddExp] = useState(false);
  const [expForm, setExpForm] = useState({
    company_name: "", designation: "", from_date: "",
    to_date: "", employment_type: "Regular", responsibilities: "",
  });

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await getFacultyProfile({ data: { userId: user.id } });
      setFullName(res.profile?.full_name ?? "");
      setPhone(res.profile?.phone ?? "");
      setFacultyData(res.faculty ?? { status: "Invited" });
      setQualifications(Array.isArray(res.qualifications) ? res.qualifications : []);
      setExperience(Array.isArray(res.experience) ? res.experience : []);
      setDocuments(Array.isArray(res.documents) ? res.documents : []);
    } catch (err: any) {
      toast.error("Failed to load profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const fd = (key: string) => facultyData[key] ?? "";
  const setFd = (key: string, val: any) => setFacultyData((p: any) => ({ ...p, [key]: val }));

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateFacultyProfile({
        data: {
          userId: user.id,
          basic: { full_name: fullName, phone },
          faculty: {
            jntuh_id: fd("jntuh_id"), aicte_id: fd("aicte_id"),
            pan: fd("pan"), aadhaar: fd("aadhaar"), passport: fd("passport"),
            date_of_joining: fd("date_of_joining"), date_of_joining_dept: fd("date_of_joining_dept"),
            designation: fd("designation"), employment_type: fd("employment_type"),
            pay_scale: fd("pay_scale"), reporting_to_id: fd("reporting_to_id") || null,
            teaching_experience_years: parseFloat(fd("teaching_experience_years") || 0),
            industry_experience_years: parseFloat(fd("industry_experience_years") || 0),
            research_experience_years: parseFloat(fd("research_experience_years") || 0),
            date_of_birth: fd("date_of_birth"), gender: fd("gender"),
            nationality: fd("nationality"), father_name: fd("father_name"),
            mother_name: fd("mother_name"), personal_email: fd("personal_email"),
            alternate_mobile: fd("alternate_mobile"), present_address: fd("present_address"),
            emergency_contact_name: fd("emergency_contact_name"),
            emergency_contact_phone: fd("emergency_contact_phone"),
            biometric_id: fd("biometric_id"), ugc_vidwan_id: fd("ugc_vidwan_id"),
            orcid_id: fd("orcid_id"), scopus_id: fd("scopus_id"),
            google_scholar_id: fd("google_scholar_id"),
            probation_period: fd("probation_period"), confirmation_date: fd("confirmation_date"),
            appointment_order_number: fd("appointment_order_number"),
          },
        },
      });
      toast.success("Profile saved successfully");
      loadData();
    } catch (err: any) {
      toast.error(err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAddQual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addQualification({ data: { facultyId: user.id, ...qualForm } });
      toast.success("Qualification added");
      setShowAddQual(false);
      setQualForm({ level: "UG", degree: "", specialization: "", institution: "", university: "", start_year: 2020, end_year: 2024, percentage_cgpa: 0, register_number: "", mode: "Regular" });
      loadData();
    } catch (err: any) { toast.error(err.message ?? "Failed"); }
  };

  const handleAddExp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addExperienceRecord({ data: { facultyId: user.id, ...expForm, to_date: expForm.to_date || null } });
      toast.success("Experience added");
      setShowAddExp(false);
      setExpForm({ company_name: "", designation: "", from_date: "", to_date: "", employment_type: "Regular", responsibilities: "" });
      loadData();
    } catch (err: any) { toast.error(err.message ?? "Failed"); }
  };

  const maskValue = (val: string, show: boolean, length = 4) => {
    if (!val) return "—";
    if (show) return val;
    return "•".repeat(Math.max(0, val.length - length)) + val.substring(val.length - length);
  };

  if (loading || !user) {
    return <div className="min-h-[70vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto">
      <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Faculty Account</div>
          <h1 className="font-display text-4xl text-foreground mt-1">My Faculty Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage academic identity, regulatory IDs, qualifications, and secure documents.</p>
        </div>
        {facultyData.status && <StatusBadge status={facultyData.status} />}
      </header>

      <div className="flex border-b border-border mb-8 overflow-x-auto gap-1">
        {(["identity","qualifications","experience","vault"] as Tab[]).map((t) => {
          const icons: Record<Tab, any> = { identity: User, qualifications: BookOpen, experience: Briefcase, vault: Lock };
          const labels: Record<Tab, string> = { identity: "Identity & Employment", qualifications: "Qualifications", experience: "Experience", vault: "Document Vault" };
          const Icon = icons[t];
          return (
            <button key={t} onClick={() => setActiveTab(t)} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-4 h-4" />{labels[t]}
            </button>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-sm shadow-soft p-6 lg:p-8">
        {activeTab === "identity" && (
          <form onSubmit={saveProfile} className="space-y-8">
            <Section title="Basic Identity">
              <Grid>
                <F label="Full Name *"><input required value={fullName} onChange={e => setFullName(e.target.value)} className="input-field w-full mt-1" /></F>
                <F label="Email (Official)"><input disabled value={user.email} className="input-field w-full mt-1 opacity-60" /></F>
                <F label="Mobile Phone"><input value={phone} onChange={e => setPhone(e.target.value)} className="input-field w-full mt-1" /></F>
                <F label="Alternate Mobile"><input value={fd("alternate_mobile")} onChange={e => setFd("alternate_mobile", e.target.value)} className="input-field w-full mt-1" /></F>
                <F label="Personal Email"><input type="email" value={fd("personal_email")} onChange={e => setFd("personal_email", e.target.value)} className="input-field w-full mt-1" /></F>
                <F label="Date of Birth"><input type="date" value={fd("date_of_birth")} onChange={e => setFd("date_of_birth", e.target.value)} className="input-field w-full mt-1" /></F>
                <F label="Gender">
                  <select value={fd("gender")} onChange={e => setFd("gender", e.target.value)} className="input-field w-full mt-1">
                    <option value="">— Select —</option>
                    <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
                  </select>
                </F>
                <F label="Nationality"><input value={fd("nationality") || "Indian"} onChange={e => setFd("nationality", e.target.value)} className="input-field w-full mt-1" /></F>
                <F label="Father's Name"><input value={fd("father_name")} onChange={e => setFd("father_name", e.target.value)} className="input-field w-full mt-1" /></F>
                <F label="Mother's Name"><input value={fd("mother_name")} onChange={e => setFd("mother_name", e.target.value)} className="input-field w-full mt-1" /></F>
              </Grid>
              <Grid cols={1} className="mt-4">
                <F label="Present Address"><textarea rows={2} value={fd("present_address")} onChange={e => setFd("present_address", e.target.value)} className="input-field w-full mt-1" /></F>
              </Grid>
              <Grid className="mt-4">
                <F label="Emergency Contact Name"><input value={fd("emergency_contact_name")} onChange={e => setFd("emergency_contact_name", e.target.value)} className="input-field w-full mt-1" /></F>
                <F label="Emergency Contact Phone"><input value={fd("emergency_contact_phone")} onChange={e => setFd("emergency_contact_phone", e.target.value)} className="input-field w-full mt-1" /></F>
              </Grid>
            </Section>

            <Section title="College & Regulatory Identity">
              <Grid>
                <F label="Designation">
                  <select value={fd("designation")} onChange={e => setFd("designation", e.target.value)} className="input-field w-full mt-1">
                    <option value="">— Select —</option>
                    {["Professor","Associate Professor","Assistant Professor","Lecturer","Professor of Practice","Adjunct Faculty","Visiting Faculty","Guest Faculty","Lab/Technical Staff","Other"].map(d => <option key={d}>{d}</option>)}
                  </select>
                </F>
                <F label="Biometric ID"><input value={fd("biometric_id")} onChange={e => setFd("biometric_id", e.target.value)} className="input-field w-full mt-1" placeholder="Assigned by admin" /></F>
                <F label="JNTUH Registration ID"><input value={fd("jntuh_id")} onChange={e => setFd("jntuh_id", e.target.value)} className="input-field w-full mt-1 font-mono uppercase" placeholder="1234-150422-120032" /></F>
                <F label="AICTE Faculty ID"><input value={fd("aicte_id")} onChange={e => setFd("aicte_id", e.target.value)} className="input-field w-full mt-1 font-mono" /></F>
                <F label="UGC / Vidwan ID"><input value={fd("ugc_vidwan_id")} onChange={e => setFd("ugc_vidwan_id", e.target.value)} className="input-field w-full mt-1 font-mono" /></F>
                <F label="ORCID ID"><input value={fd("orcid_id")} onChange={e => setFd("orcid_id", e.target.value)} className="input-field w-full mt-1 font-mono" /></F>
                <F label="Scopus ID"><input value={fd("scopus_id")} onChange={e => setFd("scopus_id", e.target.value)} className="input-field w-full mt-1 font-mono" /></F>
                <F label="Google Scholar ID"><input value={fd("google_scholar_id")} onChange={e => setFd("google_scholar_id", e.target.value)} className="input-field w-full mt-1 font-mono" /></F>
              </Grid>
            </Section>

            <Section title="Employment Details">
              <Grid>
                <F label="Employment Type">
                  <select value={fd("employment_type") || "Regular"} onChange={e => setFd("employment_type", e.target.value)} className="input-field w-full mt-1">
                    {["Regular","Probation","Contract","Temporary","Visiting","Adjunct","Guest","Part-time","Deputation","Other"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </F>
                <F label="Date of Joining College"><input type="date" value={fd("date_of_joining")} onChange={e => setFd("date_of_joining", e.target.value)} className="input-field w-full mt-1" /></F>
                <F label="Date of Joining Department"><input type="date" value={fd("date_of_joining_dept")} onChange={e => setFd("date_of_joining_dept", e.target.value)} className="input-field w-full mt-1" /></F>
                <F label="Appointment Order No."><input value={fd("appointment_order_number")} onChange={e => setFd("appointment_order_number", e.target.value)} className="input-field w-full mt-1" /></F>
                <F label="Probation Period"><input value={fd("probation_period")} onChange={e => setFd("probation_period", e.target.value)} className="input-field w-full mt-1" placeholder="e.g. 1 year" /></F>
                <F label="Confirmation Date"><input type="date" value={fd("confirmation_date")} onChange={e => setFd("confirmation_date", e.target.value)} className="input-field w-full mt-1" /></F>
                <F label="Pay Scale / Level"><input value={fd("pay_scale")} onChange={e => setFd("pay_scale", e.target.value)} className="input-field w-full mt-1" /></F>
                <F label="Teaching Experience (Yrs)"><input type="number" step="0.5" value={fd("teaching_experience_years") || 0} onChange={e => setFd("teaching_experience_years", e.target.value)} className="input-field w-full mt-1" /></F>
                <F label="Industry Experience (Yrs)"><input type="number" step="0.5" value={fd("industry_experience_years") || 0} onChange={e => setFd("industry_experience_years", e.target.value)} className="input-field w-full mt-1" /></F>
                <F label="Research Experience (Yrs)"><input type="number" step="0.5" value={fd("research_experience_years") || 0} onChange={e => setFd("research_experience_years", e.target.value)} className="input-field w-full mt-1" /></F>
              </Grid>
            </Section>

            <div className="flex justify-end pt-4 border-t border-border">
              <button type="submit" disabled={saving} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-sm font-medium flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
              </button>
            </div>
          </form>
        )}

        {activeTab === "qualifications" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-2xl">Educational Qualifications</h2>
              <button onClick={() => setShowAddQual(true)} className="px-3 py-1.5 border border-primary text-primary rounded-sm text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-primary/10"><Plus className="w-3.5 h-3.5" /> Add Degree</button>
            </div>
            <div className="space-y-4">
              {qualifications.length === 0 && <div className="p-8 text-center text-muted-foreground">No qualifications entered yet.</div>}
              {qualifications.map((q) => (
                <div key={q.id} className="p-4 border border-border rounded-sm flex justify-between items-start gap-4">
                  <div>
                    <div className="font-display text-lg font-bold">{q.level} · {q.degree}{q.specialization ? ` in ${q.specialization}` : ""}</div>
                    <div className="text-sm text-muted-foreground mt-1">{q.institution}{q.university ? ` (${q.university})` : ""}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{q.start_year}–{q.end_year} · {q.percentage_cgpa}%{q.register_number ? ` · Reg: ${q.register_number}` : ""}</div>
                    {q.mode && <div className="text-xs text-muted-foreground mt-0.5">Mode: {q.mode}</div>}
                  </div>
                  <VerifyBadge status={q.status} />
                </div>
              ))}
            </div>

            {showAddQual && (
              <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <form onSubmit={handleAddQual} className="bg-card border border-border max-w-md w-full rounded-sm p-6 shadow-elegant max-h-[90vh] overflow-y-auto">
                  <h3 className="font-display text-2xl mb-4">Add Qualification</h3>
                  <div className="space-y-3">
                    <F label="Level"><select value={qualForm.level} onChange={e => setQualForm({...qualForm, level: e.target.value})} className="input-field w-full mt-1"><option value="UG">UG</option><option value="PG">PG</option><option value="Ph.D.">Ph.D.</option><option value="Diploma">Diploma</option></select></F>
                    <F label="Mode"><select value={qualForm.mode} onChange={e => setQualForm({...qualForm, mode: e.target.value})} className="input-field w-full mt-1"><option value="Regular">Regular</option><option value="Distance">Distance</option><option value="Part-time">Part-time</option></select></F>
                    <F label="Degree *"><input required value={qualForm.degree} onChange={e => setQualForm({...qualForm, degree: e.target.value})} className="input-field w-full mt-1" placeholder="e.g. B.Tech" /></F>
                    <F label="Specialization *"><input required value={qualForm.specialization} onChange={e => setQualForm({...qualForm, specialization: e.target.value})} className="input-field w-full mt-1" /></F>
                    <F label="Institution *"><input required value={qualForm.institution} onChange={e => setQualForm({...qualForm, institution: e.target.value})} className="input-field w-full mt-1" /></F>
                    <F label="University / Board"><input value={qualForm.university} onChange={e => setQualForm({...qualForm, university: e.target.value})} className="input-field w-full mt-1" /></F>
                    <F label="Register Number"><input value={qualForm.register_number} onChange={e => setQualForm({...qualForm, register_number: e.target.value})} className="input-field w-full mt-1" /></F>
                    <div className="grid grid-cols-3 gap-2">
                      <F label="Start Year"><input type="number" value={qualForm.start_year} onChange={e => setQualForm({...qualForm, start_year: parseInt(e.target.value)})} className="input-field w-full mt-1" /></F>
                      <F label="End Year"><input type="number" value={qualForm.end_year} onChange={e => setQualForm({...qualForm, end_year: parseInt(e.target.value)})} className="input-field w-full mt-1" /></F>
                      <F label="% / CGPA"><input type="number" step="0.01" value={qualForm.percentage_cgpa} onChange={e => setQualForm({...qualForm, percentage_cgpa: parseFloat(e.target.value)})} className="input-field w-full mt-1" /></F>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button type="button" onClick={() => setShowAddQual(false)} className="px-4 py-2 border border-border text-sm rounded-sm">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-sm">Add</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {activeTab === "experience" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-2xl">Employment Experience</h2>
              <button onClick={() => setShowAddExp(true)} className="px-3 py-1.5 border border-primary text-primary rounded-sm text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-primary/10"><Plus className="w-3.5 h-3.5" /> Add Experience</button>
            </div>
            <div className="space-y-4">
              {experience.length === 0 && <div className="p-8 text-center text-muted-foreground">No experience records yet.</div>}
              {experience.map((e) => (
                <div key={e.id} className="p-4 border border-border rounded-sm flex justify-between items-start gap-4">
                  <div>
                    <div className="font-display text-lg font-bold">{e.company_name}</div>
                    <div className="text-sm text-primary mt-1">{e.designation}{e.employment_type ? ` · ${e.employment_type}` : ""}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{e.from_date ? new Date(e.from_date).toLocaleDateString() : ""} – {e.to_date ? new Date(e.to_date).toLocaleDateString() : "Present"}</div>
                    {e.responsibilities && <p className="text-xs mt-2 text-muted-foreground">{e.responsibilities}</p>}
                  </div>
                  <VerifyBadge status={e.status} />
                </div>
              ))}
            </div>

            {showAddExp && (
              <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <form onSubmit={handleAddExp} className="bg-card border border-border max-w-md w-full rounded-sm p-6 shadow-elegant">
                  <h3 className="font-display text-2xl mb-4">Add Experience</h3>
                  <div className="space-y-3">
                    <F label="Institution / Company *"><input required value={expForm.company_name} onChange={e => setExpForm({...expForm, company_name: e.target.value})} className="input-field w-full mt-1" /></F>
                    <F label="Designation *"><input required value={expForm.designation} onChange={e => setExpForm({...expForm, designation: e.target.value})} className="input-field w-full mt-1" /></F>
                    <F label="Employment Type"><select value={expForm.employment_type} onChange={e => setExpForm({...expForm, employment_type: e.target.value})} className="input-field w-full mt-1"><option>Regular</option><option>Contract</option><option>Visiting</option><option>Part-time</option><option>Other</option></select></F>
                    <div className="grid grid-cols-2 gap-2">
                      <F label="From Date *"><input required type="date" value={expForm.from_date} onChange={e => setExpForm({...expForm, from_date: e.target.value})} className="input-field w-full mt-1" /></F>
                      <F label="To Date"><input type="date" value={expForm.to_date} onChange={e => setExpForm({...expForm, to_date: e.target.value})} className="input-field w-full mt-1" /></F>
                    </div>
                    <F label="Responsibilities"><textarea rows={3} value={expForm.responsibilities} onChange={e => setExpForm({...expForm, responsibilities: e.target.value})} className="input-field w-full mt-1" /></F>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button type="button" onClick={() => setShowAddExp(false)} className="px-4 py-2 border border-border text-sm rounded-sm">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-sm">Add</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {activeTab === "vault" && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 border border-gold/40 bg-gold/10 rounded-sm">
              <ShieldCheck className="w-5 h-5 text-gold shrink-0 mt-0.5" />
              <div className="text-sm"><span className="font-bold">Privacy by default:</span> PAN, Aadhaar and bank details are masked. Full access is limited to Admin/HR only.</div>
            </div>
            <div className="border border-border rounded-sm divide-y divide-border">
              {[
                { label: "PAN Card Number", key: "pan", show: showPan, toggle: () => setShowPan(!showPan) },
                { label: "Aadhaar Card Number", key: "aadhaar", show: showAadhaar, toggle: () => setShowAadhaar(!showAadhaar) },
              ].map(({ label, key, show, toggle }) => (
                <div key={key} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase text-muted-foreground font-semibold">{label}</div>
                    <div className="font-mono text-sm mt-1">{maskValue(fd(key), show)}</div>
                  </div>
                  <button onClick={toggle} className="p-2 hover:bg-muted rounded-sm">{show ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}</button>
                </div>
              ))}
            </div>
            <h2 className="font-display text-2xl border-b border-border/40 pb-2 mt-6 mb-4">Verification Documents</h2>
            <div className="space-y-3">
              {documents.length === 0 && <div className="p-8 text-center text-muted-foreground">No documents uploaded.</div>}
              {documents.map((d) => (
                <div key={d.id} className="p-4 border border-border rounded-sm flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-semibold text-sm">{d.name}</div>
                      <div className="text-xs text-muted-foreground uppercase mt-0.5">{d.category}</div>
                    </div>
                  </div>
                  <VerifyBadge status={d.verification_status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`.input-field{padding:.6rem .8rem;border:1px solid var(--color-border);border-radius:.125rem;background:var(--color-parchment);font-size:.9rem;width:100%}.input-field:focus{outline:none;border-color:var(--color-primary)}`}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-2xl mb-4 border-b border-border/40 pb-2">{title}</h2>
      {children}
    </div>
  );
}

function Grid({ children, cols = 2, className = "" }: { children: React.ReactNode; cols?: number; className?: string }) {
  return <div className={`grid md:grid-cols-${cols} gap-4 ${className}`}>{children}</div>;
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      {children}
    </label>
  );
}
