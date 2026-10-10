import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Brand } from "@/components/Brand";
import { seedDemoAccounts } from "@/features/users/users.functions";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

const DEMO_LOGINS: { role: string; email: string; password: string }[] = [
  { role: "Super Admin",       email: "superadmin@spec.edu.in", password: "Admin@12345" },
  { role: "Principal",         email: "principal@spec.edu.in",  password: "Principal@12345" },
  { role: "Dean",              email: "dean@spec.edu.in",       password: "Dean@12345" },
  { role: "HOD",               email: "hod@spec.edu.in",        password: "Hod@12345" },
  { role: "Faculty",           email: "faculty@spec.edu.in",    password: "Faculty@12345" },
  { role: "Student",           email: "student@spec.edu.in",    password: "Student@12345" },
];

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — SARGS" },
      { name: "description", content: "Sign in to the Smart Academic Repository & Governance System." },
    ],
  }),
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Minimum 6 characters").max(72),
});
const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, "Please provide your full name").max(100),
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDemos, setShowDemos] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const authBackendMessage = (value: unknown) => {
    const message = value instanceof Error ? value.message : typeof value === "string" ? value : "";
    if (message.includes("Failed to fetch") || message.includes("ERR_NAME_NOT_RESOLVED")) {
      return "Supabase backend is unreachable. Check the project URL in .env and reconnect Supabase.";
    }
    return message || "Something went wrong";
  };

  useEffect(() => {
    // redirect if already signed in
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedDemoAccounts();
      const created = res.results.filter((r) => r.status === "created").length;
      const repaired = res.results.filter((r) => r.status === "repaired").length;
      const errors = res.results.filter((r) => r.status === "error");
      toast.success(`${created} created, ${repaired} repaired${errors.length ? `, ${errors.length} failed` : ""}`);
      if (errors.length) console.error("Seed errors:", errors);
      setShowDemos(true);
    } catch (e) {
      toast.error(authBackendMessage(e));
    } finally {
      setSeeding(false);
    }
  };

  const quickLogin = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success(`Signed in as ${email}`);
      navigate({ to: "/app" });
    } catch (e) {
      toast.error(authBackendMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/app" });
      } else {
        const parsed = signupSchema.safeParse({ email, password, fullName });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });
        if (error) throw error;
        toast.success("Account created");
        navigate({ to: "/app" });
      }
    } catch (err) {
      toast.error(authBackendMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/app`,
      });
      if (result.error) {
        toast.error("Google sign-in failed");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/app" });
    } catch {
      setLoading(false);
      toast.error("Google sign-in failed");
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-parchment">
      {/* Left: brand panel */}
      <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-primary text-parchment relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,theme(colors.gold/20%),transparent_50%)]" />
        <Brand variant="light" />
        <div className="relative max-w-md">
          <h2 className="font-display text-4xl leading-tight">Where academic integrity becomes infrastructure.</h2>
          <p className="mt-4 text-parchment/80 text-sm leading-relaxed">
            SARGS is trusted for NAAC, NBA, AICTE, and JNTU-ready document governance across engineering
            institutions. Sign in to manage your institution's repository.
          </p>
          <div className="ornament-rule mt-8 max-w-xs" />
          <div className="mt-6 text-xs tracking-[0.2em] uppercase text-gold/80">
            Smart Academic Repository & Governance System
          </div>
        </div>
        <div className="text-xs text-parchment/50 font-mono">© SARGS · v1.0</div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-8"><Brand /></div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </div>
          <h1 className="font-display text-4xl text-foreground mt-2">
            {mode === "signin" ? "Sign in to SARGS" : "Request access"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === "signin"
              ? "Access your institution's academic repository."
              : "Your account will be provisioned with Faculty access. Super Admin can elevate your role."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <Field label="Full name">
                <input
                  type="text" required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                  placeholder="Dr. Ravi Kumar"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                type="email" required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@institution.edu.in"
              />
            </Field>
            <Field label="Password">
              <input
                type="password" required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-sm font-medium shadow-elegant hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-3 border border-border bg-card rounded-sm font-medium hover:border-primary/50 transition-all flex items-center justify-center gap-3"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Demo accounts panel — for evaluation/testing only */}
          <div className="mt-6 border border-dashed border-gold/40 rounded-sm bg-gold/5">
            <button
              type="button"
              onClick={() => setShowDemos((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> Demo accounts
              </span>
              {showDemos ? <ChevronUp className="w-4 h-4 text-gold" /> : <ChevronDown className="w-4 h-4 text-gold" />}
            </button>
            {showDemos && (
              <div className="px-4 pb-4 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  One-click sign-in for each role in the hierarchy. If accounts are missing or broken, click <em>Seed</em> first.
                </p>
                <button
                  type="button"
                  onClick={handleSeed}
                  disabled={seeding || loading}
                  className="w-full py-2 bg-ink text-parchment rounded-sm text-xs font-medium uppercase tracking-[0.15em] hover:bg-ink/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {seeding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Seed / repair 6 demo accounts
                </button>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_LOGINS.map((d) => (
                    <button
                      key={d.email}
                      type="button"
                      disabled={loading || seeding}
                      onClick={() => quickLogin(d.email, d.password)}
                      className="text-left px-3 py-2 border border-border bg-card rounded-sm hover:border-primary/50 transition-all disabled:opacity-50"
                    >
                      <div className="text-xs font-semibold text-foreground">{d.role}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">{d.email}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>


          <div className="mt-8 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>Don't have an account?{" "}
                <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">
                  Create one
                </button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button onClick={() => setMode("signin")} className="text-primary font-medium hover:underline">
                  Sign in
                </button>
              </>
            )}
          </div>
          <div className="mt-6 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-primary">← Back to home</Link>
          </div>
        </div>
      </div>
      <style>{`
        .input-field {
          width: 100%;
          padding: 0.7rem 0.9rem;
          border: 1px solid var(--color-border);
          border-radius: 0.125rem;
          background: var(--color-card);
          color: var(--color-foreground);
          font-size: 0.95rem;
          transition: border-color .15s, box-shadow .15s;
        }
        .input-field:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px oklch(0.36 0.12 20 / 0.1);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
