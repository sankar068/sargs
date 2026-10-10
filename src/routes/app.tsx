import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthState, ROLE_LABEL } from "@/hooks/useAuth";
import { Brand } from "@/components/Brand";
import { supabase } from "@/integrations/supabase/client";
import { getNotifications, markNotificationsRead } from "@/features/governance/governance.functions";
import {
  LayoutDashboard, FolderArchive, GitPullRequestArrow, ScrollText, CalendarClock,
  Users as UsersIcon, UserCog, Settings, LogOut, Loader2, ShieldCheck,
  User, BookOpen, FileSpreadsheet, CalendarDays, Ticket, DoorOpen, LayoutTemplate,
  Bell, X,
} from "lucide-react";

export const Route = createFileRoute("/app")({
  component: AppShell,
});

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/profile", label: "My Profile", icon: User },
  { to: "/app/assignments", label: "Teaching Assignments", icon: BookOpen, adminOnly: true },
  { to: "/app/course-files", label: "Course Files", icon: FileSpreadsheet },
  { to: "/app/templates", label: "Course Templates", icon: LayoutTemplate, iqacOnly: true },
  { to: "/app/leave", label: "Leave Management", icon: CalendarDays },
  { to: "/app/tickets", label: "Support Tickets", icon: Ticket },
  { to: "/app/exit", label: "Exit & Handover", icon: DoorOpen },
  { to: "/app/documents", label: "Documents", icon: FolderArchive },
  { to: "/app/approvals", label: "Approvals", icon: GitPullRequestArrow },
  { to: "/app/compliance", label: "Compliance", icon: CalendarClock },
  { to: "/app/audit", label: "Audit Log", icon: ScrollText },
  { to: "/app/team", label: "Team", icon: UsersIcon },
  { to: "/app/users", label: "User Management", icon: UserCog, adminOnly: true },
  { to: "/app/roles", label: "Role Management", icon: ShieldCheck, superAdminOnly: true },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

function AppShell() {
  const { loading, user, profile, roles, primaryRole } = useAuthState();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    getNotifications().then((res) => setNotifications(Array.isArray(res) ? res : [])).catch(() => {});
    const interval = setInterval(() => {
      getNotifications().then((res) => setNotifications(Array.isArray(res) ? res : [])).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (!unreadIds.length) return;
    await markNotificationsRead({ data: { ids: unreadIds } }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="min-h-screen flex bg-parchment">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-5 border-b border-sidebar-border">
          <Brand variant="light" />
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.filter((n: any) => {
            if (n.superAdminOnly) return primaryRole === "super_admin";
            if (n.adminOnly) return ["super_admin","principal","dean","hod"].includes(primaryRole ?? "");
            if (n.iqacOnly) return ["iqac_coordinator","super_admin","principal","dean"].includes(primaryRole ?? "");
            return true;
          }).map((n: any) => {
            const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-all ${
                  active
                    ? "bg-sidebar-accent text-sidebar-primary-foreground border-l-2 border-sidebar-primary"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }`}
              >
                <n.icon className="w-4 h-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs uppercase tracking-[0.15em] text-sidebar-primary/80 font-semibold">
            {primaryRole ? ROLE_LABEL[primaryRole] : "No role"}
          </div>
          <div className="mt-1 font-display text-lg text-sidebar-foreground truncate">
            {profile?.full_name ?? user.email}
          </div>
          <div className="text-xs text-sidebar-foreground/60 truncate">{user.email}</div>
          <div className="mt-3 flex gap-2">
            {/* Notifications bell */}
            <button
              onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) handleMarkAllRead(); }}
              className="relative flex-1 flex items-center justify-center py-2 border border-sidebar-border rounded-sm text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent transition-all"
              title="Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold text-gold-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={signOut}
              className="flex-1 flex items-center justify-center gap-2 py-2 border border-sidebar-border rounded-sm text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent transition-all"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Notifications panel */}
      {showNotifs && (
        <div className="fixed right-0 top-0 h-full w-80 bg-card border-l border-border shadow-elegant z-50 flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
            <h2 className="font-display text-xl text-foreground">Notifications</h2>
            <button onClick={() => setShowNotifs(false)} className="p-1 hover:bg-muted rounded-sm"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {notifications.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">No notifications yet.</div>
            )}
            {notifications.map((n) => (
              <div key={n.id} className={`p-4 ${!n.read ? "bg-gold/5 border-l-2 border-gold" : ""}`}>
                <div className="text-sm font-semibold text-foreground">{n.title}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</div>
                <div className="text-[10px] text-muted-foreground mt-2 font-mono">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          {notifications.some((n) => !n.read) && (
            <div className="p-3 border-t border-border shrink-0">
              <button onClick={handleMarkAllRead} className="w-full py-2 text-xs text-center text-primary font-semibold hover:bg-primary/10 rounded-sm transition-colors">
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

