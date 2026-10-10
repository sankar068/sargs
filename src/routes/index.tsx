import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import heroCampus from "@/assets/hero-campus.jpg";
import {
  ShieldCheck, FileStack, GitBranch, Fingerprint, LineChart, Lock, CloudUpload,
  BookOpen, Award, Search, BellRing, Users2, ArrowRight, Quote,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SARGS — Smart Academic Repository & Governance System" },
      { name: "description", content: "Centralized, secure, role-based document repository for JNTU-affiliated engineering institutions. NAAC, NBA, AICTE accreditation ready." },
      { property: "og:title", content: "SARGS — Academic Governance, Reimagined" },
      { property: "og:description", content: "Governance + Compliance + Intelligence platform for Tier-1 engineering colleges." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={heroCampus} alt="" className="w-full h-full object-cover opacity-20" width={1600} height={1024} />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-background" />
        </div>
        <div className="container mx-auto px-6 pt-20 pb-28 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-gold/40 bg-parchment/60 rounded-sm text-xs tracking-[0.18em] uppercase text-foreground/70">
              <span className="w-1 h-1 rounded-full bg-gold" />
              For JNTU-affiliated institutions
            </div>
            <h1 className="mt-6 font-display text-5xl md:text-7xl font-semibold leading-[1.02] text-foreground">
              Governance, <em className="text-primary not-italic">reimagined</em><br />
              for academic excellence.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
              A centralized, audit-grade platform to manage, verify, and govern every academic,
              administrative, and accreditation document across your institution — with full role-based
              access, tamper-proof storage, and real-time compliance intelligence.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-sm font-medium shadow-elegant hover:shadow-soft transition-all group"
              >
                Launch Repository
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/documents-architecture"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground rounded-sm font-medium hover:border-primary hover:text-primary transition-all"
              >
                Explore Architecture
              </Link>
            </div>
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl">
              {[
                { k: "8", l: "Document Categories" },
                { k: "8", l: "Role Hierarchy" },
                { k: "100%", l: "Audit Traceable" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display text-4xl text-primary">{s.k}</div>
                  <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pitch */}
      <section className="py-20 bg-parchment border-y border-border/60">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Quote className="w-10 h-10 text-gold mx-auto mb-4" />
            <p className="font-display italic text-2xl md:text-3xl text-foreground leading-relaxed">
              “A centralized, secure, and intelligent academic repository designed for Tier-1 engineering
              institutions under JNTU, enabling seamless document management, accreditation readiness,
              and governance automation.”
            </p>
            <div className="ornament-rule mt-8 max-w-xs mx-auto" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <SectionHeader eyebrow="Platform" title="Not just storage — a governance fabric." subtitle="Unlike Google Drive or ad-hoc folders, SARGS is built for structured academic workflows, accreditation audits, and institutional accountability." />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
            {FEATURES.map((f) => (
              <div key={f.title} className="group p-7 border border-border bg-card rounded-sm hover:border-primary/50 hover:shadow-elegant transition-all">
                <div className="w-11 h-11 rounded-sm bg-gradient-primary flex items-center justify-center mb-5 shadow-soft">
                  <f.icon className="w-5 h-5 text-gold" />
                </div>
                <h3 className="font-display text-xl text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="py-24 bg-parchment border-y border-border/60">
        <div className="container mx-auto px-6">
          <SectionHeader eyebrow="Workflow" title="Every document. Every signature. Every touch — traced." subtitle="From faculty upload to principal lock, SARGS enforces a tamper-proof chain of custody that auditors can verify in seconds." />
          <div className="mt-14 grid md:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {WORKFLOW.map((step, i) => (
              <div key={step.role} className="relative">
                <div className="p-5 bg-card border border-border rounded-sm text-center">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-gold font-semibold">Step {i + 1}</div>
                  <div className="font-display text-lg text-primary mt-2">{step.role}</div>
                  <div className="text-xs text-muted-foreground mt-1">{step.action}</div>
                </div>
                {i < WORKFLOW.length - 1 && (
                  <ArrowRight className="hidden md:block w-4 h-4 text-gold absolute top-1/2 -right-3 -translate-y-1/2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center p-12 border border-gold/40 bg-gradient-primary rounded-sm text-parchment shadow-elegant">
            <h2 className="font-display text-4xl md:text-5xl font-semibold">Ready for your next NAAC cycle?</h2>
            <p className="mt-4 text-parchment/80 max-w-xl mx-auto">
              Set up your institution, map the role hierarchy, and start uploading — with full audit trail from day one.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 mt-8 px-8 py-3 bg-gold text-gold-foreground rounded-sm font-semibold hover:brightness-105 transition-all"
            >
              Enter Repository
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">{eyebrow}</div>
      <h2 className="font-display text-4xl md:text-5xl font-semibold text-foreground mt-3 leading-tight">{title}</h2>
      <p className="mt-4 text-muted-foreground leading-relaxed">{subtitle}</p>
    </div>
  );
}

const FEATURES = [
  { icon: ShieldCheck, title: "Role-Based Access", desc: "Eight-tier hierarchy from Super Admin to Student with granular permissions mapped to real academic structures." },
  { icon: Lock, title: "Tamper-Proof Storage", desc: "AES-256 encryption, cryptographic file hashing, and immutable version history for audit-grade integrity." },
  { icon: GitBranch, title: "Approval Workflows", desc: "Faculty → HOD → Dean → Principal → Locked. Enforced routing with comments and rejection handling." },
  { icon: FileStack, title: "8 Document Domains", desc: "Academic, Student, Faculty, Accreditation, Administrative, Research, Infrastructure, and Compliance." },
  { icon: Fingerprint, title: "Full Audit Trail", desc: "Every upload, view, approval, and edit logged with actor, timestamp, and metadata. Exportable for audits." },
  { icon: LineChart, title: "Accreditation Intelligence", desc: "Track NAAC, NBA, AICTE, JNTU compliance deadlines with real-time readiness scoring." },
  { icon: Search, title: "Smart Indexing", desc: "Auto-tagging by category, regulation (R20/R22/R25), department, and academic year." },
  { icon: BellRing, title: "Deadline Alerts", desc: "Compliance reminders for AQAR, EOA, affiliation renewals — never miss a submission window." },
  { icon: Users2, title: "Department-wise Segmentation", desc: "HOD-level dashboards with workload, uploads, and pending approvals per department." },
];

const WORKFLOW = [
  { role: "Faculty", action: "Uploads document" },
  { role: "HOD", action: "Reviews department submission" },
  { role: "Dean", action: "Validates academic standard" },
  { role: "Principal", action: "Finalizes approval" },
  { role: "Locked", action: "Audit-ready & immutable" },
];
