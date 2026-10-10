import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: { full_name: string; email: string; department: string | null } | null;
  roles: AppRole[];
  primaryRole: AppRole | null;
  loading: boolean;
}

const ROLE_PRIORITY: AppRole[] = [
  "super_admin", "principal", "dean", "hod", "iqac_coordinator", "admin_staff", "faculty", "student",
];

function pickPrimary(roles: AppRole[]): AppRole | null {
  for (const r of ROLE_PRIORITY) if (roles.includes(r)) return r;
  return null;
}

export function useAuthState(): AuthState & { refresh: () => Promise<void> } {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthState["profile"]>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfileAndRoles = async (userId: string) => {
    const [{ data: prof }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("full_name,email,department").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setProfile(prof ?? null);
    setRoles((roleRows ?? []).map((r) => r.role as AppRole));
  };

  useEffect(() => {
    // Listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      if (sess?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadProfileAndRoles(sess.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });
    // Then current session
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfileAndRoles(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return {
    session,
    user: session?.user ?? null,
    profile,
    roles,
    primaryRole: pickPrimary(roles),
    loading,
    refresh: async () => {
      if (session?.user) await loadProfileAndRoles(session.user.id);
    },
  };
}

export const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  principal: "Principal",
  dean: "Dean",
  hod: "Head of Department",
  iqac_coordinator: "IQAC Coordinator",
  admin_staff: "Admin Staff",
  faculty: "Faculty",
  student: "Student",
};

export function canUpload(roles: AppRole[]) {
  return roles.some((r) =>
    ["faculty", "hod", "dean", "principal", "super_admin", "admin_staff", "iqac_coordinator"].includes(r),
  );
}

export function canApprove(roles: AppRole[]) {
  return roles.some((r) => ["hod", "dean", "principal", "super_admin"].includes(r));
}
