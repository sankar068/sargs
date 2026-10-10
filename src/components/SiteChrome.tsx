import { Link } from "@tanstack/react-router";
import { Brand } from "./Brand";

export function SiteHeader() {
  return (
    <header className="border-b border-border/60 bg-parchment/80 backdrop-blur-md sticky top-0 z-40">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Brand />
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground/80">
          <Link to="/" className="hover:text-primary transition-colors [&.active]:text-primary">Home</Link>
          <Link to="/features" className="hover:text-primary transition-colors [&.active]:text-primary">Features</Link>
          <Link to="/roles" className="hover:text-primary transition-colors [&.active]:text-primary">Hierarchy</Link>
          <Link to="/documents-architecture" className="hover:text-primary transition-colors [&.active]:text-primary">Documents</Link>
          <Link to="/contact" className="hover:text-primary transition-colors [&.active]:text-primary">Contact</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors">
            Sign in
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-all shadow-soft"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-gradient-parchment">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Brand />
            <p className="mt-4 text-sm text-muted-foreground max-w-sm leading-relaxed">
              A centralized, secure, and intelligent academic repository designed for Tier-1 engineering
              institutions under JNTU — enabling seamless document governance, accreditation readiness,
              and audit-grade traceability.
            </p>
          </div>
          <div>
            <h4 className="font-display text-lg text-foreground mb-3">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/features" className="hover:text-primary">Features</Link></li>
              <li><Link to="/roles" className="hover:text-primary">Role Hierarchy</Link></li>
              <li><Link to="/documents-architecture" className="hover:text-primary">Document Architecture</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display text-lg text-foreground mb-3">Compliance</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>NAAC Ready</li>
              <li>NBA Aligned</li>
              <li>AICTE Compliant</li>
              <li>JNTU Affiliated</li>
            </ul>
          </div>
        </div>
        <div className="ornament-rule my-8" />
        <div className="flex flex-col md:flex-row justify-between gap-4 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} SARGS — Smart Academic Repository & Governance System.</div>
          <div className="font-mono tracking-wider">v1.0 • Secure • Audit-Ready</div>
        </div>
      </div>
    </footer>
  );
}
