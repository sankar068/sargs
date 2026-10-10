import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { BookOpen, GraduationCap, Users, Award, Wallet, FlaskConical, Building, FileCheck } from "lucide-react";

export const Route = createFileRoute("/documents-architecture")({
  head: () => ({
    meta: [
      { title: "Document Architecture — SARGS" },
      { name: "description", content: "Eight canonical document domains covering every academic, administrative, and accreditation artifact." },
      { property: "og:title", content: "SARGS Document Architecture" },
      { property: "og:description", content: "Academic, Accreditation, Administrative, Research, Infrastructure, Compliance — structured." },
    ],
  }),
  component: ArchPage,
});

const DOMAINS = [
  { icon: BookOpen, name: "Academic", badge: "A", items: ["Syllabus (R20/R22/R25)", "Lesson Plans", "Course Files", "Lab Manuals", "Attendance Records", "Internal Marks", "Question Papers", "Result Analysis"] },
  { icon: GraduationCap, name: "Student Records", badge: "B", items: ["Admission Forms", "SSC / Inter Certificates", "Transfer Certificate", "Bonafide Certificates", "Migration Certificates", "Transcripts & OD Requests"] },
  { icon: Users, name: "Faculty Records", badge: "C", items: ["Qualification Documents", "Experience Certificates", "Faculty Attendance", "Workload Allocation", "Publications & Research Papers"] },
  { icon: Award, name: "Accreditation", badge: "D", items: ["Self Study Report (SSR)", "AQAR Reports", "IQAC Documents", "NBA Files", "AICTE Approval (EOA)", "Infrastructure Proofs"] },
  { icon: Wallet, name: "Administrative & Financial", badge: "E", items: ["Fee Records", "Salary Records", "Budget Reports", "Audit Reports", "Scholarships"] },
  { icon: FlaskConical, name: "Research & Innovation", badge: "F", items: ["Patents", "Funded Projects", "Publications", "Conference Records"] },
  { icon: Building, name: "Infrastructure", badge: "G", items: ["Lab Equipment Records", "Library Data", "Asset Registers", "Maintenance Logs"] },
  { icon: FileCheck, name: "Compliance & Legal", badge: "H", items: ["UGC Certificates", "AICTE Approvals", "Affiliation Documents", "Government Orders"] },
];

function ArchPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <section className="py-20 container mx-auto px-6">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Document Architecture</div>
          <h1 className="font-display text-5xl md:text-6xl font-semibold text-foreground mt-3 leading-tight">
            Every artifact. Every audit. Every angle covered.
          </h1>
          <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
            Built on real NAAC, NBA, AICTE, and JNTU artifact maps — SARGS organizes your institution's
            knowledge into eight canonical domains, each with its own workflow, retention, and compliance rules.
          </p>
        </div>
      </section>
      <section className="pb-20 container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-6">
          {DOMAINS.map((d) => (
            <div key={d.name} className="p-7 border border-border bg-card rounded-sm hover:border-primary/40 hover:shadow-elegant transition-all">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-sm bg-gradient-primary flex items-center justify-center shadow-soft relative">
                  <d.icon className="w-6 h-6 text-gold" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gold text-gold-foreground text-xs font-bold flex items-center justify-center font-mono">
                    {d.badge}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-2xl text-primary">{d.name}</h3>
                  <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-foreground/80">
                    {d.items.map((it) => (
                      <li key={it} className="flex items-start gap-2">
                        <span className="w-1 h-1 bg-gold rounded-full mt-2 shrink-0" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
