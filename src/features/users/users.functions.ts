import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = [
  "super_admin",
  "principal",
  "dean",
  "hod",
  "iqac_coordinator",
  "admin_staff",
  "faculty",
  "student",
] as const;

type AppRole = (typeof ROLES)[number];

const DEMO_ACCOUNTS: { email: string; password: string; full_name: string; role: AppRole; dept?: string }[] = [
  { email: "superadmin@spec.edu.in", password: "Admin@12345", full_name: "Dr. Arjun Reddy", role: "super_admin", dept: "ADMIN" },
  { email: "principal@spec.edu.in", password: "Principal@12345", full_name: "Prof. Kavitha Rao", role: "principal", dept: "ADMIN" },
  { email: "dean@spec.edu.in", password: "Dean@12345", full_name: "Dr. Suresh Babu", role: "dean", dept: "ADMIN" },
  { email: "hod@spec.edu.in", password: "Hod@12345", full_name: "Dr. Priya Nair", role: "hod", dept: "CSE" },
  { email: "faculty@spec.edu.in", password: "Faculty@12345", full_name: "Sanjay Kadapala", role: "faculty", dept: "CSE" },
  { email: "student@spec.edu.in", password: "Student@12345", full_name: "Rohit Sharma", role: "student", dept: "CSE" },
];

const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(2).max(100),
  role: z.enum(ROLES),
  department_code: z.string().trim().max(20).nullable().optional(),
});

const toggleStatusSchema = z.object({
  user_id: z.string().uuid(),
  status: z.enum(["active", "disabled"]),
});

const resetPwSchema = z.object({
  user_id: z.string().uuid(),
  new_password: z.string().min(8).max(72),
});

export const seedDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const results: { email: string; status: "created" | "repaired" | "error"; message?: string }[] = [];
  
  // Resolve default institution
  const { data: inst } = await supabaseAdmin.from("institutions").select("id").eq("code", "SPEC").limit(1).maybeSingle();
  const instId = inst?.id ?? null;

  const { data: depts } = await supabaseAdmin.from("departments").select("id,code");
  const deptMap = new Map((depts ?? []).map((d) => [d.code, d.id]));

  for (const acct of DEMO_ACCOUNTS) {
    try {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users.find((u) => u.email?.toLowerCase() === acct.email.toLowerCase());

      if (existing) {
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          password: acct.password,
          email_confirm: true,
          ban_duration: "none",
          user_metadata: {
            full_name: acct.full_name,
            role: acct.role,
            department_code: acct.dept ?? null,
          },
        });

        await supabaseAdmin.from("profiles").upsert({
          id: existing.id,
          full_name: acct.full_name,
          email: acct.email,
          department: acct.dept ?? null,
          department_id: acct.dept ? deptMap.get(acct.dept) ?? null : null,
          institution_id: instId,
          status: "active",
        });
        await supabaseAdmin.from("user_roles").delete().eq("user_id", existing.id);
        await supabaseAdmin.from("user_roles").insert({
          user_id: existing.id,
          role: acct.role,
          department: acct.dept ?? null,
          department_id: acct.dept ? deptMap.get(acct.dept) ?? null : null,
        });
        await supabaseAdmin.from("faculty_profiles").upsert({
          id: existing.id,
          status: "active",
          designation: acct.role === "faculty" ? "Assistant Professor" : "HOD",
          employment_type: "Regular",
        });
        results.push({ email: acct.email, status: "repaired" });
        continue;
      }

      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: acct.email,
        password: acct.password,
        email_confirm: true,
        user_metadata: {
          full_name: acct.full_name,
          role: acct.role,
          department_code: acct.dept ?? null,
        },
      });
      if (error) throw error;

      if (created?.user) {
        await supabaseAdmin
          .from("profiles")
          .update({
            department: acct.dept ?? null,
            department_id: acct.dept ? deptMap.get(acct.dept) ?? null : null,
            institution_id: instId,
            status: "active",
          })
          .eq("id", created.user.id);

        await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
        await supabaseAdmin.from("user_roles").insert({
          user_id: created.user.id,
          role: acct.role,
          department: acct.dept ?? null,
          department_id: acct.dept ? deptMap.get(acct.dept) ?? null : null,
        });

        await supabaseAdmin.from("faculty_profiles").upsert({
          id: created.user.id,
          status: "active",
          designation: acct.role === "faculty" ? "Assistant Professor" : "HOD",
          employment_type: "Regular",
        });
      }

      results.push({ email: acct.email, status: "created" });
    } catch (e: any) {
      results.push({ email: acct.email, status: "error", message: e.message });
    }
  }

  return { results };
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createUserSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { supabase, userId } = context;

    const { data: allowed, error: permErr } = await supabase.rpc("can_create_role", {
      _creator: userId,
      _target_role: data.role,
    });
    if (permErr) throw new Error(permErr.message);
    if (!allowed) throw new Error(`You do not have permission to create users with role '${data.role}'.`);

    let department_id: string | null = null;
    if (data.department_code) {
      const { data: dept } = await supabaseAdmin
        .from("departments")
        .select("id")
        .eq("code", data.department_code)
        .maybeSingle();
      department_id = dept?.id ?? null;
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        role: data.role,
        department_code: data.department_code ?? null,
        created_by: userId,
      },
    });
    if (error) throw new Error(error.message);
    const newId = created.user!.id;

    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    await supabaseAdmin.from("user_roles").insert({
      user_id: newId,
      role: data.role,
      department: data.department_code ?? null,
      department_id,
    });
    await supabaseAdmin
      .from("profiles")
      .update({
        department: data.department_code ?? null,
        department_id,
        created_by: userId,
      })
      .eq("id", newId);

    await supabaseAdmin.from("audit_log").insert({
      actor_id: userId,
      entity_type: "user",
      entity_id: newId,
      action: "create_user",
      metadata: { role: data.role, department: data.department_code ?? null, email: data.email },
    });

    return { id: newId };
  });

export const adminToggleUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => toggleStatusSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId, supabase } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
    const { data: isPrincipal } = await supabase.rpc("has_role", { _user_id: userId, _role: "principal" });
    if (!isAdmin && !isPrincipal) throw new Error("Only Super Admin or Principal can change user status.");
    if (data.user_id === userId) throw new Error("You cannot disable your own account.");

    await supabaseAdmin.from("profiles").update({ status: data.status }).eq("id", data.user_id);
    await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.status === "disabled" ? "876000h" : "none",
    });

    await supabaseAdmin.from("audit_log").insert({
      actor_id: userId,
      entity_type: "user",
      entity_id: data.user_id,
      action: data.status === "disabled" ? "disable_user" : "enable_user",
      metadata: {},
    });

    return { ok: true };
  });

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => resetPwSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId, supabase } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
    const { data: isPrincipal } = await supabase.rpc("has_role", { _user_id: userId, _role: "principal" });
    if (!isAdmin && !isPrincipal) throw new Error("Only Super Admin or Principal can reset passwords.");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.new_password,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("audit_log").insert({
      actor_id: userId,
      entity_type: "user",
      entity_id: data.user_id,
      action: "reset_password",
      metadata: {},
    });

    return { ok: true };
  });
