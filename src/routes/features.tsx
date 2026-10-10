import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { ShieldCheck, Lock, CloudUpload, Fingerprint, GitBranch, Search, LineChart, BellRing, Award, BookOpen, Layers, Signature } from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — SARGS" },
      { name: "description", content: "Explore SARGS features: role-based access, tamper-proof storage, accreditation workflows, audit trails, and more." },
      { property: "og:title", content: "SARGS Features — Academic Governance Platform" },
      { property: "og:description", content: "Governance + Compliance + Intelligence for engineering institutions." },
    ],
  }),
  component: FeaturesPage,
});

const GROUPS = [
  {
    title: "Security", icon: Lock,
    items: [
      { icon: ShieldCheck, name: "Role-Based Access Control", desc: "Eight-tier hierarchy enforced at database level via RLS policies." },
      { icon: Lock, name: "AES-256 Encrypted Storage", desc: "Private, signed-URL storage with tamper detection via content hashing." },
      { icon: Fingerprint, name: "Immutable Audit Log", desc: "Every action recorded — who uploaded, edited, viewed, approved, with timestamps." },
      { icon: Signature, name: "Version Control", desc: "Track every revision. Roll back or compare. Auditors see the full lineage." },
    ],
  },
  {
    title: "Governance", icon: GitBranch,
    items: [
      { icon: GitBranch, name: "Multi-Stage Approval", desc: "Faculty → HOD → Dean → Principal → Locked. Custom routing per category." },
      { icon: Layers, name: "Department Segmentation", desc: "HOD dashboards scoped to their department; Dean sees all; Principal sees institution." },
      { icon: BellRing, name: "Deadline Intelligence", desc: "Compliance reminders for NAAC, NBA, AICTE, JNTU renewals and reviews." },
      { icon: Award, name: "Accreditation Readiness", desc: "Automated scoring against NAAC/NBA document completeness requirements." },
    ],
  },
  {
    title: "Intelligence", icon: LineChart,
    items: [
      { icon: Search, name: "Smart Indexing", desc: "Auto-tag by category, regulation (R20/R22/R25), department, academic year." },
      { icon: CloudUpload, name: "Cloud-Native Storage", desc: "Elastic, multi-tenant, with backup and disaster recovery built in." },
      { icon: BookOpen, name: "Structured Document Domains", desc: "Eight canonical categories aligned with real accreditation artifact maps." },
      { icon: LineChart, name: "Role Dashboards", desc: "Every role sees what matters — approvals, compliance alerts, workload, analytics." },
    ],
  },
];

function FeaturesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <section className="py-20 container mx-auto px-6">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Features</div>
          <h1 className="font-display text-5xl md:text-6xl font-semibold text-foreground mt-3 leading-tight">
            A platform that thinks like an auditor — and feels like a library.
          </h1>
          <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
            Engineered for the real demands of Tier-1 engineering institutions: accreditation cycles, multi-role
            approvals, document authenticity, and compliance intelligence — all in one place.
          </p>
        </div>
      </section>
      {GROUPS.map((g, i) => (
        <section key={g.title} className={i % 2 === 0 ? "py-16 bg-parchment border-y border-border/60" : "py-16"}>
          <div className="container mx-auto px-6">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-sm bg-gradient-primary flex items-center justify-center">
                <g.icon className="w-5 h-5 text-gold" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Pillar</div>
                <h2 className="font-display text-3xl text-foreground">{g.title}</h2>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {g.items.map((it) => (
                <div key={it.name} className="p-6 border border-border bg-card rounded-sm hover:border-primary/50 transition-all">
                  <it.icon className="w-5 h-5 text-primary mb-3" />
                  <h3 className="font-display text-lg text-foreground">{it.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{it.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
      <SiteFooter />
    </div>
  );
}
