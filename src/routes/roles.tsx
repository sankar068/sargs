import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { Crown, Building2, GraduationCap, Briefcase, UserCog, ClipboardCheck, Users, BookOpenCheck } from "lucide-react";

export const Route = createFileRoute("/roles")({
  head: () => ({
    meta: [
      { title: "Role Hierarchy — SARGS" },
      { name: "description", content: "The eight-tier role hierarchy: Super Admin, Principal, Dean, HOD, IQAC, Admin Staff, Faculty, Student." },
      { property: "og:title", content: "SARGS Role Hierarchy" },
      { property: "og:description", content: "Governance at every tier — from trustee to student." },
    ],
  }),
  component: RolesPage,
});

const ROLES = [
  { icon: Crown, name: "Super Admin", scope: "Management / Trust / Governing Body", perms: ["Assigns all roles", "Deletes documents", "Views full audit log", "System configuration"] },
  { icon: Building2, name: "Principal", scope: "Institution Head", perms: ["Final approval authority", "Institution-wide dashboards", "NAAC readiness view", "Role assignment"] },
  { icon: GraduationCap, name: "Dean", scope: "Academic / R&D / Student Affairs", perms: ["Cross-department approval", "Research & innovation oversight", "Strategic document review"] },
  { icon: Briefcase, name: "HOD", scope: "Department Head", perms: ["Department-scoped approval", "Faculty workload view", "Department analytics"] },
  { icon: ClipboardCheck, name: "IQAC Coordinator", scope: "Internal Quality Assurance Cell", perms: ["Accreditation document curation", "Compliance deadline management", "NAAC/NBA artifact assembly"] },
  { icon: UserCog, name: "Admin Staff", scope: "Office / Exam Cell / Accounts", perms: ["Administrative uploads", "Fee & salary records", "Exam & result management"] },
  { icon: BookOpenCheck, name: "Faculty", scope: "Teaching Staff", perms: ["Upload course files, lesson plans", "Submit research & publications", "View own approvals"] },
  { icon: Users, name: "Student", scope: "Limited Access", perms: ["View relevant public records", "Submit OD / transcript requests", "Read-only syllabus access"] },
];

function RolesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <section className="py-20 container mx-auto px-6">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Role Hierarchy</div>
          <h1 className="font-display text-5xl md:text-6xl font-semibold text-foreground mt-3 leading-tight">
            Eight tiers of governance — enforced at the database, not the UI.
          </h1>
          <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
            Permissions in SARGS are driven by PostgreSQL Row-Level Security policies. Even if a client is
            compromised, the database refuses unauthorized access. This is what audit-grade means.
          </p>
        </div>
      </section>
      <section className="pb-20 container mx-auto px-6">
        <div className="space-y-4">
          {ROLES.map((r, i) => (
            <div key={r.name} className="grid md:grid-cols-[auto_1fr_2fr] gap-6 items-start p-6 border border-border bg-card rounded-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-sm bg-gradient-primary flex items-center justify-center shadow-soft">
                  <r.icon className="w-6 h-6 text-gold" />
                </div>
                <div className="font-display text-3xl text-muted-foreground font-light">{String(i + 1).padStart(2, "0")}</div>
              </div>
              <div>
                <h3 className="font-display text-2xl text-primary">{r.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{r.scope}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {r.perms.map((p) => (
                  <div key={p} className="text-xs text-foreground/80 flex items-start gap-2">
                    <span className="w-1 h-1 bg-gold rounded-full mt-1.5 shrink-0" />
                    {p}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
