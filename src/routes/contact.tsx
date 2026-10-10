import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { Mail, MapPin, Phone } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — SARGS" },
      { name: "description", content: "Get in touch with the SARGS team to deploy the repository at your institution." },
      { property: "og:title", content: "Contact SARGS" },
      { property: "og:description", content: "Schedule a demo or request deployment details." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <section className="py-20 container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">Contact</div>
            <h1 className="font-display text-5xl md:text-6xl font-semibold text-foreground mt-3 leading-tight">
              Deploy SARGS at your institution.
            </h1>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              Write to us for a guided walkthrough, role-mapping consultation, and NAAC-readiness
              assessment for your campus.
            </p>
            <div className="mt-10 space-y-5">
              <Row icon={Mail} label="Email" value="hello@sargs.academy" />
              <Row icon={Phone} label="Phone" value="+91 · Available on request" />
              <Row icon={MapPin} label="Based in" value="Hyderabad, Telangana, India" />
            </div>
          </div>
          <form className="p-8 border border-border bg-card rounded-sm shadow-soft space-y-4"
                onSubmit={(e) => { e.preventDefault(); alert("Thank you — we'll be in touch."); }}>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">Institution</label>
              <input required maxLength={150} className="mt-1.5 w-full px-3 py-2.5 border border-border rounded-sm bg-parchment focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">Your name</label>
              <input required maxLength={100} className="mt-1.5 w-full px-3 py-2.5 border border-border rounded-sm bg-parchment focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">Email</label>
              <input type="email" required maxLength={255} className="mt-1.5 w-full px-3 py-2.5 border border-border rounded-sm bg-parchment focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">Message</label>
              <textarea required maxLength={1000} rows={4} className="mt-1.5 w-full px-3 py-2.5 border border-border rounded-sm bg-parchment focus:outline-none focus:border-primary" />
            </div>
            <button className="w-full py-3 bg-primary text-primary-foreground rounded-sm font-medium shadow-soft hover:bg-primary/90 transition-all">
              Request a Demo
            </button>
          </form>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-sm bg-gradient-primary flex items-center justify-center shadow-soft">
        <Icon className="w-4 h-4 text-gold" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">{label}</div>
        <div className="font-display text-lg text-foreground">{value}</div>
      </div>
    </div>
  );
}
