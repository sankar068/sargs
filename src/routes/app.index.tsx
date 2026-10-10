import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthState, ROLE_LABEL } from "@/hooks/useAuth";
import {
  FileSpreadsheet, GitPullRequestArrow, CalendarClock, ShieldCheck,
  Users, Clock, CheckCircle2, Ticket, Loader2, CalendarDays,
} from "lucide-react";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

interface Stats {
  totalDocs: number;
  pendingDocs: number;
  approvedDocs: number;
  myAssignments: number;
  pendingLeaves: number;
  openTickets: number;
  totalStaff: number;
  complianceAlerts: number;
}

function Dashboard() {
  const { user, profile, primaryRole } = useAuthState();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const [{ data: docs }, { data: assg }, { data: lvs }, { data: tkts }, { data: dls }, { data: staff }, { data: urgentDl }] = await Promise.all([
          supabase.from("documents").select("id, status"),
          supabase.from("teaching_assignments").select("id").eq("faculty_id", user.id),
          supabase.from("leave_requests").select("id, status").eq("faculty_id", user.id),
          supabase.from("tickets").select("id, status").eq("faculty_id", user.id),
          supabase.from("compliance_deadlines").select("*").order("due_date", { ascending: true }).limit(3),
          supabase.from("profiles").select("id").eq("status", "active"),
          supabase.from("compliance_deadlines").select("id").lte("due_date", new Date(Date.now() + 45 * 86400000).toISOString()),
        ]);

        const allDocs = docs ?? [];
        setStats({
          totalDocs: allDocs.length,
          pendingDocs: allDocs.filter((d) => ["pending_hod", "pending_dean", "pending_principal", "draft"].includes(d.status)).length,
          approvedDocs: allDocs.filter((d) => ["approved", "locked"].includes(d.status)).length,
          myAssignments: (assg ?? []).length,
          pendingLeaves: (lvs ?? []).filter((l) => l.status === "Submitted").length,
          openTickets: (tkts ?? []).filter((t) => t.status === "Open").length,
          totalStaff: (staff ?? []).length,
          complianceAlerts: (urgentDl ?? []).length,
        });
        setDeadlines(dls ?? []);

        const { data: rec } = await supabase
          .from("documents")
          .select("id, title, status, category, created_at")
          .order("created_at", { ascending: false })
          .limit(4);
        setRecentDocs(rec ?? []);
      } catch (err) {
        console.error("Dashboard data load failed", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  const isHOD = primaryRole === "hod";
  const isDean = primaryRole === "dean";
  const isPrincipal = primaryRole === "principal";
  const isSuper = primaryRole === "super_admin";
  const isAdmin = isHOD || isDean || isPrincipal || isSuper;

  return (
    <div className="p-8 lg:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <header className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">
            {primaryRole ? ROLE_LABEL[primaryRole] + " Dashboard" : "Dashboard"}
          </div>
          <h1 className="font-display text-4xl text-foreground mt-1">
            Welcome, {profile?.full_name?.split(" ")[0] ?? "Colleague"}.
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            St. Peter's Engineering College — institutional operations overview.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 border border-gold/40 rounded-sm bg-card text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-gold" />
          <span className="font-mono tracking-wide">Governance Mode · Live</span>
        </div>
      </header>

      {/* KPI Cards Grid based on role */}
      {isAdmin ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Active Staff" value={stats?.totalStaff ?? 0} hint="All departments" />
          <StatCard icon={GitPullRequestArrow} label="Pending Reviews" value={stats?.pendingDocs ?? 0} hint="Awaiting verification" accent />
          <StatCard icon={CheckCircle2} label="Approved Portfolios" value={stats?.approvedDocs ?? 0} hint="Audit ready" />
          <StatCard icon={CalendarClock} label="Compliance Alerts" value={stats?.complianceAlerts ?? 0} hint="Due within 45 days" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={FileSpreadsheet} label="My Assigned Subjects" value={stats?.myAssignments ?? "0"} hint="Active course files" />
          <StatCard icon={Clock} label="Pending Leaves" value={stats?.pendingLeaves ?? "0"} hint="Awaiting approval" />
          <StatCard icon={Ticket} label="Open Tickets" value={stats?.openTickets ?? "0"} hint="Requires response" />
          <StatCard icon={CheckCircle2} label="Compliance Status" value="100%" hint="Mandatory uploads clear" accent />
        </div>
      )}

      {/* Shortcuts and Quick Actions */}
      <div className="bg-card border border-border rounded-sm p-6 shadow-soft">
        <h2 className="font-display text-2xl mb-4 border-b border-border/40 pb-2">Quick Navigation Shortcuts</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/app/profile" className="p-4 border border-border hover:border-primary/50 text-center rounded-sm transition-all hover:bg-parchment/10">
            <Users className="w-6 h-6 mx-auto text-primary mb-2" />
            <span className="text-xs font-bold text-foreground">Edit Profile</span>
          </Link>
          <Link to="/app/course-files" className="p-4 border border-border hover:border-primary/50 text-center rounded-sm transition-all hover:bg-parchment/10">
            <FileSpreadsheet className="w-6 h-6 mx-auto text-primary mb-2" />
            <span className="text-xs font-bold text-foreground">Course Files</span>
          </Link>
          <Link to="/app/leave" className="p-4 border border-border hover:border-primary/50 text-center rounded-sm transition-all hover:bg-parchment/10">
            <CalendarDays className="w-6 h-6 mx-auto text-primary mb-2" />
            <span className="text-xs font-bold text-foreground">Apply Leave</span>
          </Link>
          <Link to="/app/tickets" className="p-4 border border-border hover:border-primary/50 text-center rounded-sm transition-all hover:bg-parchment/10">
            <Ticket className="w-6 h-6 mx-auto text-primary mb-2" />
            <span className="text-xs font-bold text-foreground">Raise Ticket</span>
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 border border-border bg-card rounded-sm shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl text-foreground">Recent Institutional Documents</h2>
            <span className="text-xs text-muted-foreground uppercase tracking-[0.2em]">Latest uploads</span>
          </div>
          <div className="ornament-rule mb-4" />
          <div className="space-y-3">
            {recentDocs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No documents uploaded.</div>
            ) : (
              recentDocs.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{d.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {d.category.replace("_", " ")} · {new Date(d.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-sm font-bold ${
                    d.status === "approved" || d.status === "locked" ? "bg-green-100 text-green-800" : "bg-gold/20 text-gold-foreground"
                  }`}>{d.status}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-6 border border-border bg-gradient-primary rounded-sm text-parchment shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold font-semibold">
              <CalendarClock className="w-3.5 h-3.5" /> Compliance
            </div>
            <h2 className="font-display text-2xl mt-2">Upcoming deadlines</h2>
            <div className="ornament-rule mt-3 mb-4 opacity-60" />
            <div className="space-y-3">
              {deadlines.map((d) => {
                const days = Math.ceil((new Date(d.due_date).getTime() - Date.now()) / 86400000);
                return (
                  <div key={d.id} className="flex items-start justify-between gap-3 pb-3 border-b border-parchment/10 last:border-0 last:pb-0">
                    <div>
                      <div className="text-sm font-semibold">{d.title}</div>
                      <div className="text-xs text-parchment/60 mt-0.5">
                        {d.authority} · {new Date(d.due_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`text-xs font-mono px-2 py-1 rounded-sm ${days < 60 ? "bg-gold text-gold-foreground" : "bg-parchment/10"}`}>
                      {days}d
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, accent }: { icon: any; label: string; value: number | string; hint: string; accent?: boolean }) {
  return (
    <div className={`p-5 border rounded-sm transition-all hover:scale-[1.01] ${accent ? "border-gold/50 bg-card shadow-soft" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-semibold">{label}</div>
        <Icon className={`w-4 h-4 ${accent ? "text-gold" : "text-primary"}`} />
      </div>
      <div className="font-display text-4xl text-foreground mt-3 font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{hint}</div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    pending_hod: { label: "Pending HOD", cls: "bg-gold/20 text-gold-foreground border border-gold/40" },
    pending_dean: { label: "Pending Dean", cls: "bg-gold/20 text-gold-foreground border border-gold/40" },
    pending_principal: { label: "Pending Principal", cls: "bg-gold/20 text-gold-foreground border border-gold/40" },
    approved: { label: "Approved", cls: "bg-primary/10 text-primary border border-primary/30" },
    locked: { label: "Locked", cls: "bg-primary text-primary-foreground" },
    rejected: { label: "Rejected", cls: "bg-destructive/10 text-destructive border border-destructive/30" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted" };
  return <span className={`text-xs px-2 py-0.5 rounded-sm font-medium ${s.cls}`}>{s.label}</span>;
}
