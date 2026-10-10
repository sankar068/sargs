import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---- HELPERS FOR ROLE SCOPING ----
async function getRoleAndDept(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role, department_id, department")
    .eq("user_id", userId);
  
  const roleList = (roles ?? []).map((r) => r.role);
  const primaryRole = roleList.includes("super_admin") ? "super_admin" :
                      roleList.includes("principal") ? "principal" :
                      roleList.includes("dean") ? "dean" :
                      roleList.includes("hod") ? "hod" :
                      roleList.includes("iqac_coordinator") ? "iqac_coordinator" :
                      roleList.includes("admin_staff") ? "admin_staff" : "faculty";

  const hodDeptId = roles?.find((r) => r.role === "hod")?.department_id ?? null;
  const facultyDeptId = roles?.find((r) => r.role === "faculty")?.department_id ?? null;

  return { primaryRole, roleList, hodDeptId, facultyDeptId };
}

// ---- PROFILE ENDPOINTS ----
export const getFacultyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = input;
    
    // Fetch profile and faculty details
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*, departments(code, name)")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) throw new Error("Profile not found");

    const { data: faculty } = await supabaseAdmin
      .from("faculty_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    const { data: qualifications } = await supabaseAdmin
      .from("qualifications")
      .select("*")
      .eq("faculty_id", userId);

    const { data: experience } = await supabaseAdmin
      .from("employment_history")
      .select("*")
      .eq("faculty_id", userId);

    const { data: documents } = await supabaseAdmin
      .from("faculty_documents")
      .select("*")
      .eq("faculty_id", userId);

    return {
      profile,
      faculty: faculty ?? { status: "Invited" },
      qualifications: qualifications ?? [],
      experience: experience ?? [],
      documents: documents ?? [],
    };
  });

export const updateFacultyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    userId: z.string().uuid(),
    basic: z.object({
      full_name: z.string().min(2),
      phone: z.string().nullable().optional(),
    }),
    faculty: z.object({
      jntuh_id: z.string().nullable().optional(),
      aicte_id: z.string().nullable().optional(),
      pan: z.string().nullable().optional(),
      aadhaar: z.string().nullable().optional(),
      passport: z.string().nullable().optional(),
      date_of_joining: z.string().nullable().optional(),
      date_of_joining_dept: z.string().nullable().optional(),
      designation: z.string().nullable().optional(),
      employment_type: z.string().nullable().optional(),
      pay_scale: z.string().nullable().optional(),
      reporting_to_id: z.string().uuid().nullable().optional(),
      teaching_experience_years: z.number().optional(),
      industry_experience_years: z.number().optional(),
      research_experience_years: z.number().optional(),
      // Personal details
      date_of_birth: z.string().nullable().optional(),
      gender: z.string().nullable().optional(),
      nationality: z.string().nullable().optional(),
      father_name: z.string().nullable().optional(),
      mother_name: z.string().nullable().optional(),
      personal_email: z.string().nullable().optional(),
      alternate_mobile: z.string().nullable().optional(),
      present_address: z.string().nullable().optional(),
      emergency_contact_name: z.string().nullable().optional(),
      emergency_contact_phone: z.string().nullable().optional(),
      // Administrative IDs
      biometric_id: z.string().nullable().optional(),
      ugc_vidwan_id: z.string().nullable().optional(),
      orcid_id: z.string().nullable().optional(),
      scopus_id: z.string().nullable().optional(),
      google_scholar_id: z.string().nullable().optional(),
      // Service details
      probation_period: z.string().nullable().optional(),
      confirmation_date: z.string().nullable().optional(),
      appointment_order_number: z.string().nullable().optional(),
    }),
  }))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId, basic, faculty } = input;
    const actorId = context.userId;

    // Mask checking or authorization details
    if (actorId !== userId) {
      const { primaryRole } = await getRoleAndDept(actorId);
      if (!["super_admin", "principal", "dean", "hod"].includes(primaryRole)) {
        throw new Error("Unauthorized to update this profile");
      }
    }

    // Update basic profile
    await supabaseAdmin.from("profiles").update({
      full_name: basic.full_name,
      phone: basic.phone,
    }).eq("id", userId);

    // Update faculty profile
    await supabaseAdmin.from("faculty_profiles").upsert({
      id: userId,
      jntuh_id: faculty.jntuh_id,
      aicte_id: faculty.aicte_id,
      pan: faculty.pan,
      aadhaar: faculty.aadhaar,
      passport: faculty.passport,
      date_of_joining: faculty.date_of_joining,
      date_of_joining_dept: faculty.date_of_joining_dept,
      designation: faculty.designation,
      employment_type: faculty.employment_type,
      pay_scale: faculty.pay_scale,
      reporting_to_id: faculty.reporting_to_id,
      teaching_experience_years: faculty.teaching_experience_years,
      industry_experience_years: faculty.industry_experience_years,
      research_experience_years: faculty.research_experience_years,
      date_of_birth: faculty.date_of_birth,
      gender: faculty.gender,
      nationality: faculty.nationality,
      father_name: faculty.father_name,
      mother_name: faculty.mother_name,
      personal_email: faculty.personal_email,
      alternate_mobile: faculty.alternate_mobile,
      present_address: faculty.present_address,
      emergency_contact_name: faculty.emergency_contact_name,
      emergency_contact_phone: faculty.emergency_contact_phone,
      biometric_id: faculty.biometric_id,
      ugc_vidwan_id: faculty.ugc_vidwan_id,
      orcid_id: faculty.orcid_id,
      scopus_id: faculty.scopus_id,
      google_scholar_id: faculty.google_scholar_id,
      probation_period: faculty.probation_period,
      confirmation_date: faculty.confirmation_date,
      appointment_order_number: faculty.appointment_order_number,
      updated_at: new Date().toISOString(),
    });

    await supabaseAdmin.from("audit_log").insert({
      actor_id: actorId,
      action: "profile.update",
      entity_type: "faculty_profile",
      entity_id: userId,
    });

    return { ok: true };
  });

export const addQualification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    facultyId: z.string().uuid(),
    level: z.string(),
    degree: z.string(),
    specialization: z.string().optional(),
    institution: z.string().optional(),
    university: z.string().optional(),
    start_year: z.number().optional(),
    end_year: z.number().optional(),
    percentage_cgpa: z.number().optional(),
    certificate_storage_path: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: dbData, error } = await supabaseAdmin.from("qualifications").insert({
      faculty_id: data.facultyId,
      level: data.level,
      degree: data.degree,
      specialization: data.specialization || null,
      institution: data.institution || null,
      university: data.university || null,
      start_year: data.start_year || null,
      end_year: data.end_year || null,
      percentage_cgpa: data.percentage_cgpa || null,
      certificate_storage_path: data.certificate_storage_path || null,
      status: "Submitted",
    }).select().single();

    if (error) throw error;
    return dbData;
  });

export const addExperienceRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    facultyId: z.string().uuid(),
    company_name: z.string().min(2),
    designation: z.string(),
    from_date: z.string(),
    to_date: z.string().nullable().optional(),
    employment_type: z.string().optional(),
    responsibilities: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: dbData, error } = await supabaseAdmin.from("employment_history").insert({
      faculty_id: data.facultyId,
      company_name: data.company_name,
      designation: data.designation,
      from_date: data.from_date,
      to_date: data.to_date || null,
      employment_type: data.employment_type || null,
      responsibilities: data.responsibilities || null,
      status: "Submitted",
    }).select().single();
    if (error) throw error;
    return dbData;
  });

export const verifyProfileSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    facultyId: z.string().uuid(),
    sectionType: z.enum(["qualification", "experience", "document"]),
    sectionId: z.string().uuid(),
    status: z.enum(["Verified", "Returned for Correction"]),
    comment: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;
    const { primaryRole } = await getRoleAndDept(actorId);

    if (!["super_admin", "principal", "dean", "hod"].includes(primaryRole)) {
      throw new Error("Only reviewers can verify faculty profile items");
    }

    if (data.sectionType === "qualification") {
      await supabaseAdmin.from("qualifications").update({
        status: data.status,
        verifier_comment: data.comment || null,
      }).eq("id", data.sectionId);
    } else if (data.sectionType === "experience") {
      await supabaseAdmin.from("employment_history").update({
        status: data.status,
        verifier_comment: data.comment || null,
      }).eq("id", data.sectionId);
    } else {
      await supabaseAdmin.from("faculty_documents").update({
        verification_status: data.status,
        verifier_comment: data.comment || null,
      }).eq("id", data.sectionId);
    }

    // Trigger notification
    await supabaseAdmin.from("notifications").insert({
      user_id: data.facultyId,
      title: `Profile Item ${data.status}`,
      message: `Your ${data.sectionType} has been ${data.status.toLowerCase()}. ${data.comment ? `Comment: ${data.comment}` : ""}`,
      link: `/app/profile`,
    });

    return { ok: true };
  });

// ---- TEACHING ASSIGNMENTS ----
export const getAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ departmentId: z.string().uuid().nullable().optional() }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;
    const { primaryRole, hodDeptId } = await getRoleAndDept(actorId);

    let query = supabaseAdmin
      .from("teaching_assignments")
      .select("*, profiles(full_name, email, department), courses(code, name, type, regulation)");

    if (primaryRole === "hod" && hodDeptId) {
      query = query.eq("profiles.department_id", hodDeptId);
    } else if (data.departmentId) {
      query = query.eq("profiles.department_id", data.departmentId);
    }

    const { data: queryResult, error } = await query;
    if (error) throw error;
    
    // Post-filter to check null profiles since left join might include empty rows if filtered SQL-side
    return (queryResult ?? []).filter((d: any) => d.profiles !== null);
  });

export const createAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    facultyId: z.string().uuid(),
    courseId: z.string().uuid(),
    academicYear: z.string(),
    semester: z.string(),
    sections: z.array(z.string()),
    yearOfStudy: z.array(z.string()),
    workloadHours: z.number(),
    ownership: z.enum(["Primary", "Co-Faculty", "Substitute", "Reviewer"]),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;
    const { primaryRole, hodDeptId } = await getRoleAndDept(actorId);

    // HOD scope validation
    if (primaryRole === "hod" && hodDeptId) {
      const { data: facultyProf } = await supabaseAdmin
        .from("profiles")
        .select("department_id")
        .eq("id", data.facultyId)
        .maybeSingle();

      if (facultyProf?.department_id !== hodDeptId) {
        throw new Error("HOD can only assign teaching duties for their own department faculty.");
      }
    }

    const { data: assignment, error } = await supabaseAdmin
      .from("teaching_assignments")
      .insert({
        faculty_id: data.facultyId,
        course_id: data.courseId,
        academic_year: data.academicYear,
        semester: data.semester,
        sections: data.sections,
        year_of_study: data.yearOfStudy,
        workload_hours: data.workloadHours,
        ownership: data.ownership,
        status: "active",
      }).select().single();

    if (error) throw error;

    // Auto-create a course_file tracker for this assignment
    const { data: course } = await supabaseAdmin.from("courses").select("type").eq("id", data.courseId).single();
    const { data: template } = await supabaseAdmin
      .from("course_file_templates")
      .select("id")
      .eq("type", course.type)
      .eq("academic_year", data.academicYear)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (template) {
      await supabaseAdmin.from("course_files").insert({
        assignment_id: assignment.id,
        template_id: template.id,
        status: "Not Started",
      });
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: data.facultyId,
      title: "New Course Assigned",
      message: `You have been assigned as ${data.ownership} for ${data.academicYear} Sem ${data.semester}.`,
      link: `/app/course-files`,
    });

    return assignment;
  });

export const deleteAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;
    const { primaryRole } = await getRoleAndDept(actorId);

    if (!["super_admin", "principal", "hod"].includes(primaryRole)) {
      throw new Error("Unauthorized to delete teaching assignments");
    }

    await supabaseAdmin.from("teaching_assignments").delete().eq("id", data.id);
    return { ok: true };
  });

// ---- COURSE FILE MODULE ----
export const getMyCourseFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: dbData, error } = await supabaseAdmin
      .from("course_files")
      .select("*, teaching_assignments(*, courses(*)), course_file_templates(*)")
      .eq("teaching_assignments.faculty_id", data.userId);

    if (error) throw error;
    return (dbData ?? []).filter((f: any) => f.teaching_assignments !== null);
  });

export const getCourseFileDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ courseFileId: z.string().uuid() }).parse(d))
  .handler(async ({ data }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: courseFile } = await supabaseAdmin
      .from("course_files")
      .select("*, teaching_assignments(*, courses(*), profiles(full_name)), course_file_templates(*)")
      .eq("id", data.courseFileId)
      .single();

    const { data: items } = await supabaseAdmin
      .from("course_file_template_items")
      .select("*")
      .eq("template_id", courseFile.template_id)
      .order("code", { ascending: true });

    const { data: evidence } = await supabaseAdmin
      .from("course_file_evidence")
      .select("*")
      .eq("course_file_id", data.courseFileId);

    return {
      courseFile,
      items: items ?? [],
      evidence: evidence ?? [],
    };
  });

export const submitEvidenceFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    courseFileId: z.string().uuid(),
    templateItemId: z.string().uuid(),
    storagePath: z.string(),
    fileName: z.string(),
    fileSize: z.number(),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;

    // Check version
    const { data: prev } = await supabaseAdmin
      .from("course_file_evidence")
      .select("version")
      .eq("course_file_id", data.courseFileId)
      .eq("template_item_id", data.templateItemId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const newVersion = (prev?.version ?? 0) + 1;

    const { data: ev, error } = await supabaseAdmin.from("course_file_evidence").insert({
      course_file_id: data.courseFileId,
      template_item_id: data.templateItemId,
      storage_path: data.storagePath,
      file_name: data.fileName,
      file_size: data.fileSize,
      uploaded_by: actorId,
      status: "Submitted",
      version: newVersion,
    }).select().single();

    if (error) throw error;

    // Update course file status
    await supabaseAdmin.from("course_files").update({
      status: "Draft",
    }).eq("id", data.courseFileId);

    return ev;
  });

export const reviewEvidenceItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    evidenceId: z.string().uuid(),
    status: z.enum(["Verified", "Returned for Correction"]),
    comments: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;
    const { primaryRole } = await getRoleAndDept(actorId);

    if (!["hod", "dean", "principal", "iqac_coordinator", "super_admin"].includes(primaryRole)) {
      throw new Error("Unauthorized approval role");
    }

    await supabaseAdmin.from("course_file_evidence").update({
      status: data.status,
      comments: data.comments || null,
    }).eq("id", data.evidenceId);

    // Get uploader for notification
    const { data: ev } = await supabaseAdmin
      .from("course_file_evidence")
      .select("course_file_id, uploaded_by, course_files(assignment_id, teaching_assignments(course_id, courses(name)))")
      .eq("id", data.evidenceId)
      .single();

    const courseName = ev?.course_files?.teaching_assignments?.courses?.name ?? "Course";

    await supabaseAdmin.from("notifications").insert({
      user_id: ev.uploaded_by,
      title: `Course File Item ${data.status}`,
      message: `Item in ${courseName} checklist was marked ${data.status.toLowerCase()}. ${data.comments ? `Comment: ${data.comments}` : ""}`,
      link: `/app/course-files/${ev.course_file_id}`,
    });

    return { ok: true };
  });

export const finalizeCourseFileSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ courseFileId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;

    await supabaseAdmin.from("course_files").update({
      status: "Submitted",
      submitted_at: new Date().toISOString(),
    }).eq("id", data.courseFileId);

    // Notify HOD
    const { data: cf } = await supabaseAdmin
      .from("course_files")
      .select("*, teaching_assignments(*, courses(*), profiles(full_name, department_id))")
      .eq("id", data.courseFileId)
      .single();

    const facultyName = cf.teaching_assignments.profiles.full_name;
    const courseName = cf.teaching_assignments.courses.name;
    const deptId = cf.teaching_assignments.profiles.department_id;

    // Fetch HOD for the department
    const { data: hod } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "hod")
      .eq("department_id", deptId)
      .limit(1)
      .maybeSingle();

    if (hod) {
      await supabaseAdmin.from("notifications").insert({
        user_id: hod.user_id,
        title: "Course File Submitted",
        message: `${facultyName} submitted the course file checklist for ${courseName}.`,
        link: `/app/approvals`,
      });
    }

    return { ok: true };
  });

// ---- LEAVE REQUESTS ----
export const submitLeave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    leaveType: z.string(),
    fromDate: z.string(),
    toDate: z.string(),
    halfDay: z.boolean(),
    totalDays: z.number(),
    reason: z.string(),
    attachmentPath: z.string().nullable().optional(),
    continuityPlan: z.array(z.object({
      class: z.string(),
      substituteFacultyId: z.string().uuid(),
      timeSlot: z.string(),
    }).parse(d)),
  }))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;

    const { data: leave, error } = await supabaseAdmin.from("leave_requests").insert({
      faculty_id: actorId,
      leave_type: data.leaveType,
      from_date: data.fromDate,
      to_date: data.toDate,
      half_day: data.halfDay,
      total_days: data.totalDays,
      reason: data.reason,
      attachment_path: data.attachmentPath || null,
      academic_continuity_plan: data.continuityPlan,
      status: "Submitted",
      current_approver_role: "hod",
    }).select().single();

    if (error) throw error;

    // Log approval action
    await supabaseAdmin.from("approval_actions").insert({
      entity_type: "leave",
      entity_id: leave.id,
      actor_id: actorId,
      action: "submit",
      comment: "Leave requested",
    });

    // Notify HOD
    const { data: userProfile } = await supabaseAdmin.from("profiles").select("full_name, department_id").eq("id", actorId).single();
    const { data: hod } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "hod")
      .eq("department_id", userProfile.department_id)
      .limit(1)
      .maybeSingle();

    if (hod) {
      await supabaseAdmin.from("notifications").insert({
        user_id: hod.user_id,
        title: "New Leave Request",
        message: `${userProfile.full_name} submitted a leave request for ${data.totalDays} day(s).`,
        link: `/app/leave`,
      });
    }

    return leave;
  });

export const reviewLeave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    leaveId: z.string().uuid(),
    action: z.enum(["approve", "reject", "forward"]),
    comment: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;
    const { primaryRole } = await getRoleAndDept(actorId);

    const { data: leave } = await supabaseAdmin.from("leave_requests").select("*").eq("id", data.leaveId).single();

    let nextStatus = leave.status;
    let nextApproverRole = leave.current_approver_role;

    if (data.action === "reject") {
      nextStatus = "Rejected";
    } else if (data.action === "approve") {
      if (primaryRole === "hod") {
        nextStatus = "Under HOD Review"; // or if policy says directly HOD can approve short leave:
        if (leave.total_days <= 2) {
          nextStatus = "Approved";
        } else {
          nextStatus = "Submitted"; // moves to Dean
          nextApproverRole = "dean";
        }
      } else if (primaryRole === "dean") {
        if (leave.total_days <= 5) {
          nextStatus = "Approved";
        } else {
          nextStatus = "Submitted";
          nextApproverRole = "principal";
        }
      } else if (primaryRole === "principal" || primaryRole === "super_admin") {
        nextStatus = "Approved";
      }
    } else if (data.action === "forward") {
      if (primaryRole === "hod") {
        nextApproverRole = "dean";
      } else if (primaryRole === "dean") {
        nextApproverRole = "principal";
      }
    }

    await supabaseAdmin.from("leave_requests").update({
      status: nextStatus,
      current_approver_role: nextApproverRole,
    }).eq("id", data.leaveId);

    await supabaseAdmin.from("approval_actions").insert({
      entity_type: "leave",
      entity_id: data.leaveId,
      actor_id: actorId,
      action: data.action,
      comment: data.comment || null,
    });

    // Notify applicant
    await supabaseAdmin.from("notifications").insert({
      user_id: leave.faculty_id,
      title: `Leave Request Update`,
      message: `Your leave request has been ${data.action}d. Status is now ${nextStatus}.`,
      link: `/app/leave`,
    });

    return { ok: true };
  });

// ---- TICKETS ENDPOINTS ----
export const raiseTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    category: z.enum(['Payroll', 'Leave', 'Identity', 'Regulatory', 'Timetable', 'Course File', 'Infrastructure', 'Certificates', 'Grievance', 'Other']),
    subject: z.string(),
    description: z.string(),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
    isConfidential: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;
    const ticketNo = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

    const { data: ticket, error } = await supabaseAdmin.from("tickets").insert({
      ticket_number: ticketNo,
      faculty_id: actorId,
      category: data.category,
      subject: data.subject,
      description: data.description,
      priority: data.priority,
      is_confidential: data.isConfidential,
      status: "Open",
    }).select().single();

    if (error) throw error;

    // Add initial message
    await supabaseAdmin.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: actorId,
      message: data.description,
    });

    // Notify HOD first
    const { data: userProfile } = await supabaseAdmin.from("profiles").select("full_name, department_id").eq("id", actorId).single();
    const { data: hod } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "hod")
      .eq("department_id", userProfile.department_id)
      .limit(1)
      .maybeSingle();

    if (hod) {
      await supabaseAdmin.from("notifications").insert({
        user_id: hod.user_id,
        title: "New Support Ticket",
        message: `${userProfile.full_name} raised a ticket: ${data.subject}.`,
        link: `/app/tickets`,
      });
    }

    return ticket;
  });

export const replyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    ticketId: z.string().uuid(),
    message: z.string(),
    isInternal: z.boolean().default(false),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;

    const { data: msg, error } = await supabaseAdmin.from("ticket_messages").insert({
      ticket_id: data.ticketId,
      sender_id: actorId,
      message: data.message,
      is_internal: data.isInternal,
    }).select().single();

    if (error) throw error;

    // Notify other party
    const { data: tkt } = await supabaseAdmin.from("tickets").select("faculty_id, subject").eq("id", data.ticketId).single();
    const notifyId = actorId === tkt.faculty_id ? (/* find resolver */ null) : tkt.faculty_id;

    if (notifyId) {
      await supabaseAdmin.from("notifications").insert({
        user_id: notifyId,
        title: "New Reply on Ticket",
        message: `Resolver replied to your ticket: "${tkt.subject.substring(0, 30)}..."`,
        link: `/app/tickets`,
      });
    }

    return msg;
  });

export const forwardTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    ticketId: z.string().uuid(),
    department: z.enum(['Accounts', 'HR', 'IT', 'IQAC', 'Exam Branch', 'Infrastructure', 'Other']),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;

    await supabaseAdmin.from("tickets").update({
      assigned_department: data.department,
      status: "Assigned",
    }).eq("id", data.ticketId);

    await supabaseAdmin.from("ticket_messages").insert({
      ticket_id: data.ticketId,
      sender_id: actorId,
      message: `Ticket forwarded to ${data.department} department.`,
      is_internal: true,
    });

    return { ok: true };
  });

// ---- EXIT & HANDOVER WORKFLOW ----
export const initiateExit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    requestType: z.enum(['Resignation', 'Retirement', 'End of Contract', 'Transfer', 'Termination', 'Long-term Separation', 'Other']),
    proposedLastWorkingDate: z.string(),
    reasonCategory: z.string(),
    facultyStatement: z.string(),
    resignationLetterPath: z.string().nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;

    const { data: exit, error } = await supabaseAdmin.from("exit_requests").insert({
      faculty_id: actorId,
      request_type: data.requestType,
      proposed_last_working_date: data.proposedLastWorkingDate,
      reason_category: data.reasonCategory,
      faculty_statement: data.facultyStatement,
      resignation_letter_path: data.resignationLetterPath || null,
      status: "Submitted",
    }).select().single();

    if (error) throw error;

    // Generate handover tasks
    const areas = ['Teaching', 'Course Files', 'Assessment', 'Students', 'Laboratory', 'Department', 'Club', 'IT', 'Finance/HR'] as const;
    const taskInserts = areas.map((a) => ({
      exit_request_id: exit.id,
      area: a,
      task_description: `Complete handover requirements for ${a} section.`,
      status: "Pending" as const,
    }));

    await supabaseAdmin.from("handover_tasks").insert(taskInserts);

    // Notify HOD
    const { data: userProfile } = await supabaseAdmin.from("profiles").select("full_name, department_id").eq("id", actorId).single();
    const { data: hod } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "hod")
      .eq("department_id", userProfile.department_id)
      .limit(1)
      .maybeSingle();

    if (hod) {
      await supabaseAdmin.from("notifications").insert({
        user_id: hod.user_id,
        title: "Exit Request Submitted",
        message: `${userProfile.full_name} has submitted an exit resignation request.`,
        link: `/app/exit`,
      });
    }

    return exit;
  });

export const updateTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    taskId: z.string().uuid(),
    status: z.enum(["Pending", "Completed", "Approved"]),
    comment: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;

    await supabaseAdmin.from("handover_tasks").update({
      status: data.status,
      completed_at: data.status === "Completed" ? new Date().toISOString() : null,
      verifier_comment: data.comment || null,
    }).eq("id", data.taskId);

    return { ok: true };
  });

export const reviewExitRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    exitRequestId: z.string().uuid(),
    action: z.enum(["recommend", "approve", "return"]),
    comment: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;
    const { primaryRole } = await getRoleAndDept(actorId);

    const { data: exit } = await supabaseAdmin.from("exit_requests").select("*").eq("id", data.exitRequestId).single();

    let nextStatus = exit.status;
    if (data.action === "recommend") {
      nextStatus = "Recommended";
    } else if (data.action === "approve") {
      nextStatus = "Approved - Notice Period";
    } else if (data.action === "return") {
      nextStatus = "Returned";
    }

    await supabaseAdmin.from("exit_requests").update({
      status: nextStatus,
    }).eq("id", data.exitRequestId);

    // If final release approved, disable login
    if (nextStatus === "Released" || nextStatus === "Archived") {
      await supabaseAdmin.from("profiles").update({ status: "disabled" }).eq("id", exit.faculty_id);
    }

    return { ok: true };
  });

// ---- COURSE FILE TEMPLATE MANAGEMENT ----
export const getTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: dbData, error } = await supabaseAdmin
      .from("course_file_templates").select("*").order("academic_year", { ascending: false });
    if (error) throw error;
    return dbData ?? [];
  });

export const createTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    name: z.string().min(2),
    type: z.enum(["Theory", "Lab", "Theory+Lab", "Other"]),
    academic_year: z.string(),
    regulation: z.string().optional(),
    is_active: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;
    const { primaryRole } = await getRoleAndDept(actorId);
    if (!["super_admin", "principal", "dean", "iqac_coordinator"].includes(primaryRole))
      throw new Error("Only IQAC/Admin can manage templates");
    const { data: row, error } = await supabaseAdmin.from("course_file_templates").insert({
      name: data.name, type: data.type, academic_year: data.academic_year,
      regulation: data.regulation || null, is_active: data.is_active,
    }).select().single();
    if (error) throw error;
    await supabaseAdmin.from("audit_log").insert({
      actor_id: actorId, action: "template.create",
      entity_type: "course_file_template", entity_id: row.id,
      metadata: { name: data.name, type: data.type },
    });
    return row;
  });

export const getTemplateItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ templateId: z.string().uuid() }).parse(d))
  .handler(async ({ data }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("course_file_template_items").select("*")
      .eq("template_id", data.templateId).order("code", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

export const addTemplateItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    templateId: z.string().uuid(),
    code: z.string().min(1),
    section: z.enum(["Section A", "Section B", "Section C"]),
    document_name: z.string().min(2),
    instructions: z.string().optional(),
    requirement: z.enum(["Mandatory", "Optional"]),
    is_active: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;
    const { primaryRole } = await getRoleAndDept(actorId);
    if (!["super_admin", "principal", "dean", "iqac_coordinator"].includes(primaryRole))
      throw new Error("Only IQAC/Admin can manage template items");
    const { data: row, error } = await supabaseAdmin.from("course_file_template_items").insert({
      template_id: data.templateId, code: data.code, section: data.section,
      document_name: data.document_name, instructions: data.instructions || null,
      requirement: data.requirement, is_active: data.is_active,
    }).select().single();
    if (error) throw error;
    return row;
  });

export const toggleTemplateItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    itemId: z.string().uuid(), is_active: z.boolean(),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;
    const { primaryRole } = await getRoleAndDept(actorId);
    if (!["super_admin", "principal", "dean", "iqac_coordinator"].includes(primaryRole))
      throw new Error("Only IQAC/Admin can toggle template items");
    const { error } = await supabaseAdmin
      .from("course_file_template_items").update({ is_active: data.is_active }).eq("id", data.itemId);
    if (error) throw error;
    await supabaseAdmin.from("audit_log").insert({
      actor_id: actorId,
      action: data.is_active ? "template_item.activate" : "template_item.deactivate",
      entity_type: "course_file_template_item", entity_id: data.itemId, metadata: {},
    });
    return { ok: true };
  });

// ---- NOTIFICATIONS ----
export const getNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: dbData, error } = await supabaseAdmin
      .from("notifications").select("*").eq("user_id", context.userId)
      .order("created_at", { ascending: false }).limit(30);
    if (error) throw error;
    return dbData ?? [];
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()) }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notifications").update({ read: true })
      .in("id", data.ids).eq("user_id", context.userId);
    return { ok: true };
  });

// ---- EXIT: FINALIZE WITH TASK BLOCKING + ACCOUNT DEACTIVATION ----
export const finalizeExit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    exitRequestId: z.string().uuid(), actualReleaseDate: z.string(),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actorId = context.userId;
    const { primaryRole } = await getRoleAndDept(actorId);
    if (!["super_admin", "principal", "admin_staff"].includes(primaryRole))
      throw new Error("Only Principal/Admin can finalize exit releases");
    const { data: tasks } = await supabaseAdmin
      .from("handover_tasks").select("id, status, area").eq("exit_request_id", data.exitRequestId);
    const incomplete = (tasks ?? []).filter((t: any) => t.status !== "Completed" && t.status !== "Approved");
    if (incomplete.length > 0)
      throw new Error(`Cannot release — ${incomplete.length} task(s) pending: ${incomplete.map((t: any) => t.area).join(", ")}`);
    const { data: exit } = await supabaseAdmin.from("exit_requests")
      .update({ status: "Released", actual_release_date: data.actualReleaseDate })
      .eq("id", data.exitRequestId).select().single();
    await supabaseAdmin.from("profiles").update({ status: "disabled" }).eq("id", exit.faculty_id);
    try { await supabaseAdmin.auth.admin.updateUserById(exit.faculty_id, { ban_duration: "876000h" }); } catch (_) {}
    await supabaseAdmin.from("audit_log").insert({
      actor_id: actorId, action: "exit.finalize_release",
      entity_type: "exit_request", entity_id: data.exitRequestId,
      metadata: { faculty_id: exit.faculty_id, actual_release_date: data.actualReleaseDate },
    });
    return { ok: true };
  });

// ---- AUDIT: LOG DOCUMENT DOWNLOAD ----
export const logDocumentDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    documentId: z.string().uuid(), documentTitle: z.string(),
  }).parse(d))
  .handler(async ({ data, context }: any) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_log").insert({
      actor_id: context.userId, action: "document.download",
      entity_type: "document", entity_id: data.documentId,
      metadata: { title: data.documentTitle },
    });
    return { ok: true };
  });







