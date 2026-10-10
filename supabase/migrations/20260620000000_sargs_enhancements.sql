-- 1. Create Institutions table
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  policy_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed St. Peter's Engineering College
INSERT INTO public.institutions (name, code, policy_config)
VALUES ('St. Peter''s Engineering College', 'SPEC', '{"vacation_gating": "warning"}'::jsonb)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 2. Alter existing tables to reference institutions
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL;

-- Link existing departments to SPEC
UPDATE public.departments SET institution_id = (SELECT id FROM public.institutions WHERE code = 'SPEC' LIMIT 1) WHERE institution_id IS NULL;

-- 3. Create Faculty Profiles table
CREATE TABLE IF NOT EXISTS public.faculty_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  jntuh_id TEXT UNIQUE,
  aicte_id TEXT UNIQUE,
  pan TEXT,
  aadhaar TEXT,
  passport TEXT,
  date_of_joining DATE,
  date_of_joining_dept DATE,
  designation TEXT,
  employment_type TEXT,
  probation_period_months INT DEFAULT 12,
  confirmation_date DATE,
  pay_scale TEXT,
  reporting_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  teaching_experience_years NUMERIC DEFAULT 0,
  industry_experience_years NUMERIC DEFAULT 0,
  research_experience_years NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Invited' CHECK (status IN ('Invited', 'onboarding', 'active', 'on leave', 'notice period', 'suspended', 'exited', 'retired', 'transferred', 'inactive')),
  exit_notice_submitted_date DATE,
  proposed_last_working_date DATE,
  approved_last_working_date DATE,
  actual_release_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create Qualifications table
CREATE TABLE IF NOT EXISTS public.qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.faculty_profiles(id) ON DELETE CASCADE,
  level TEXT NOT NULL, -- UG, PG, Ph.D.
  degree TEXT NOT NULL,
  specialization TEXT,
  institution TEXT,
  university TEXT,
  start_year INT,
  end_year INT,
  percentage_cgpa NUMERIC,
  certificate_storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'Not Provided' CHECK (status IN ('Not Provided', 'Submitted', 'Verified', 'Returned for Correction', 'Expired')),
  verifier_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create Employment History table
CREATE TABLE IF NOT EXISTS public.employment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.faculty_profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE,
  employment_type TEXT,
  responsibilities TEXT,
  relieving_cert_path TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Not Provided', 'Submitted', 'Verified', 'Returned for Correction', 'Expired')),
  verifier_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create Faculty Document Vault table
CREATE TABLE IF NOT EXISTS public.faculty_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.faculty_profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- Identity, Regulatory, Education, Employment, Service, Exit
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'Submitted' CHECK (verification_status IN ('Not Provided', 'Submitted', 'Verified', 'Returned for Correction', 'Expired')),
  verifier_comment TEXT,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Create Courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  regulation TEXT,
  credits NUMERIC,
  type TEXT DEFAULT 'Theory', -- Theory, Laboratory
  syllabus_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed standard courses
INSERT INTO public.courses (code, name, regulation, credits, type, syllabus_version) VALUES
  ('CS301T', 'Database Management Systems', 'R22', 4, 'Theory', 'v1.0'),
  ('CS301L', 'Database Management Systems Lab', 'R22', 1.5, 'Laboratory', 'v1.0'),
  ('CS302T', 'Design & Analysis of Algorithms', 'R22', 4, 'Theory', 'v1.0'),
  ('CS303T', 'Computer Networks', 'R22', 3, 'Theory', 'v1.0'),
  ('CS303L', 'Computer Networks Lab', 'R22', 1, 'Laboratory', 'v1.0'),
  ('CS401T', 'Machine Learning', 'R22', 4, 'Theory', 'v1.0'),
  ('CS402T', 'Cloud Computing', 'R22', 3, 'Theory', 'v1.0')
ON CONFLICT (code) DO NOTHING;

-- 8. Create Teaching Assignments table
CREATE TABLE IF NOT EXISTS public.teaching_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  sections TEXT[] NOT NULL,
  year_of_study TEXT[] NOT NULL,
  workload_hours NUMERIC DEFAULT 0,
  ownership TEXT NOT NULL DEFAULT 'Primary' CHECK (ownership IN ('Primary', 'Co-Faculty', 'Substitute', 'Reviewer')),
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Create Course File Templates table
CREATE TABLE IF NOT EXISTS public.course_file_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Theory', 'Laboratory')),
  academic_year TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Template Items table
CREATE TABLE IF NOT EXISTS public.course_file_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.course_file_templates(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  section TEXT NOT NULL,
  document_name TEXT NOT NULL,
  requirement TEXT NOT NULL DEFAULT 'Mandatory' CHECK (requirement IN ('Mandatory', 'Conditional', 'Configurable')),
  instructions TEXT,
  allowed_file_types TEXT[] DEFAULT '{"pdf"}',
  max_file_size_mb NUMERIC DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Theory Course File Template
INSERT INTO public.course_file_templates (id, name, type, academic_year, is_active)
VALUES ('77777777-7777-7777-7777-777777777777', 'Standard Theory Template', 'Theory', '2026-2027', true)
ON CONFLICT (id) DO NOTHING;

-- Seed Theory Items
INSERT INTO public.course_file_template_items (template_id, code, section, document_name, requirement, is_active) VALUES
  ('77777777-7777-7777-7777-777777777777', 'A1', 'Section A', 'Vision and Mission of Institute & Department; PEOs, POs and PSOs', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'A2', 'Section A', 'Academic Calendar', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'A3', 'Section A', 'Class Time Table and Faculty Time Table', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'A4', 'Section A', 'List of students enrolled for the course in the academic year', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'B1', 'Section B', 'Course Syllabus', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'B2', 'Section B', 'Bloom''s Taxonomy triangle and action verbs', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'B3', 'Section B', 'Teaching-Learning Plan', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'B4', 'Section B', 'Teaching course materials - module wise', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'B5', 'Section B', 'Tutorial questions with answers for analytical courses', 'Conditional', true),
  ('77777777-7777-7777-7777-777777777777', 'B6', 'Section B', 'Mid-exam question banks', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'B7', 'Section B', 'Model question paper with BT levels', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'B8', 'Section B', 'Previous years'' end semester question papers', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'C1', 'Section C', 'Mid-exam question papers', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'C2', 'Section C', 'Sample answer scripts: best, medium and poor', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'C3', 'Section C', 'Sample assignment solutions: best, medium and poor', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'C4', 'Section C', 'Sample viva/PPT/case study evidence', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'C5', 'Section C', 'Slow learners list, action plan, proof and outcomes', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'C6', 'Section C', 'Fast learners list, action plan, proof and outcomes', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'C7', 'Section C', 'Internal assessment marks', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'C8', 'Section C', 'End-semester question paper with answer key', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'C9', 'Section C', 'End-semester marks/grade', 'Mandatory', true),
  ('77777777-7777-7777-7777-777777777777', 'C10', 'Section C', 'Course-end survey questionnaire for indirect assessment', 'Configurable', false),
  ('77777777-7777-7777-7777-777777777777', 'C11', 'Section C', 'CO attainment chart', 'Configurable', false),
  ('77777777-7777-7777-7777-777777777777', 'C12', 'Section C', 'Three-year result analysis and next-year target COs', 'Configurable', false)
ON CONFLICT DO NOTHING;

-- Seed Laboratory Course File Template
INSERT INTO public.course_file_templates (id, name, type, academic_year, is_active)
VALUES ('88888888-8888-8888-8888-888888888888', 'Standard Lab Template', 'Laboratory', '2026-2027', true)
ON CONFLICT (id) DO NOTHING;

-- Seed Lab Items
INSERT INTO public.course_file_template_items (template_id, code, section, document_name, requirement, is_active) VALUES
  ('88888888-8888-8888-8888-888888888888', 'A1', 'Section A', 'Vision and Mission; PEOs, POs and PSOs', 'Mandatory', true),
  ('88888888-8888-8888-8888-888888888888', 'A2', 'Section A', 'Academic Calendar', 'Mandatory', true),
  ('88888888-8888-8888-8888-888888888888', 'A3', 'Section A', 'Class Time Table and Faculty Time Table', 'Mandatory', true),
  ('88888888-8888-8888-8888-888888888888', 'A4', 'Section A', 'List of students enrolled for the course', 'Mandatory', true),
  ('88888888-8888-8888-8888-888888888888', 'B1', 'Section B', 'Laboratory Syllabus', 'Mandatory', true),
  ('88888888-8888-8888-8888-888888888888', 'B2', 'Section B', 'Bloom''s Taxonomy triangle and action verbs', 'Mandatory', true),
  ('88888888-8888-8888-8888-888888888888', 'B3', 'Section B', 'Teaching-Learning Plan', 'Mandatory', true),
  ('88888888-8888-8888-8888-888888888888', 'B4', 'Section B', 'Laboratory Manual approved by HOD', 'Mandatory', true),
  ('88888888-8888-8888-8888-888888888888', 'C1', 'Section C', 'Rubrics for laboratory presentation/project evaluation', 'Mandatory', true),
  ('88888888-8888-8888-8888-888888888888', 'C2', 'Section C', 'Mid-lab exam question papers', 'Mandatory', true),
  ('88888888-8888-8888-8888-888888888888', 'C3', 'Section C', 'Sample lab mid answer scripts: best, medium and poor', 'Mandatory', true),
  ('88888888-8888-8888-8888-888888888888', 'C4', 'Section C', 'End-semester lab question paper', 'Mandatory', true),
  ('88888888-8888-8888-8888-888888888888', 'C5', 'Section C', 'End-semester marks/grade', 'Mandatory', true),
  ('88888888-8888-8888-8888-888888888888', 'C6', 'Section C', 'Sample project proof: design/software/hardware/app/prototype', 'Mandatory', true),
  ('88888888-8888-8888-8888-888888888888', 'C7', 'Section C', 'Lab course-end survey questionnaires', 'Configurable', false),
  ('88888888-8888-8888-8888-888888888888', 'C8', 'Section C', 'CO attainment chart', 'Configurable', false),
  ('88888888-8888-8888-8888-888888888888', 'C9', 'Section C', 'Three-year result analysis and next-year target COs', 'Configurable', false)
ON CONFLICT DO NOTHING;

-- 10. Create Course Files compiling table
CREATE TABLE IF NOT EXISTS public.course_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.teaching_assignments(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.course_file_templates(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'Draft', 'Submitted', 'Under Review', 'Partially Returned', 'Returned', 'Approved', 'Locked', 'Archived')),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Course File Evidence table
CREATE TABLE IF NOT EXISTS public.course_file_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_file_id UUID NOT NULL REFERENCES public.course_files(id) ON DELETE CASCADE,
  template_item_id UUID NOT NULL REFERENCES public.course_file_template_items(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Verified', 'Returned for Correction')),
  comments TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Create Leave Requests table
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  half_day BOOLEAN DEFAULT false,
  total_days NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  attachment_path TEXT,
  academic_continuity_plan JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Under HOD Review', 'Returned', 'Approved', 'Rejected', 'Availed', 'Cancelled')),
  current_approver_role public.app_role DEFAULT 'hod'::public.app_role,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Create Support Tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('Payroll', 'Leave', 'Identity', 'Regulatory', 'Timetable', 'Course File', 'Infrastructure', 'Certificates', 'Grievance', 'Other')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  is_confidential BOOLEAN DEFAULT false,
  assigned_department TEXT CHECK (assigned_department IN ('Accounts', 'HR', 'IT', 'IQAC', 'Exam Branch', 'Infrastructure', 'Other')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Acknowledged', 'Assigned', 'In Progress', 'Waiting for Faculty', 'Waiting for Department', 'Resolved', 'Closed', 'Reopened')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Ticket Messages table
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachment_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Create Faculty Exit Requests table
CREATE TABLE IF NOT EXISTS public.exit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('Resignation', 'Retirement', 'End of Contract', 'Transfer', 'Termination', 'Long-term Separation', 'Other')),
  notice_submitted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  proposed_last_working_date DATE NOT NULL,
  approved_last_working_date DATE,
  reason_category TEXT,
  faculty_statement TEXT,
  resignation_letter_path TEXT,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'HOD Review', 'Returned', 'Recommended', 'Under Final Approval', 'Notice Period', 'Clearance Pending', 'Released', 'Archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Handover Tasks table
CREATE TABLE IF NOT EXISTS public.handover_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES public.exit_requests(id) ON DELETE CASCADE,
  area TEXT NOT NULL CHECK (area IN ('Teaching', 'Course Files', 'Assessment', 'Students', 'Laboratory', 'Department', 'Club', 'IT', 'Finance/HR')),
  task_description TEXT NOT NULL,
  assigned_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Approved')),
  completed_at TIMESTAMPTZ,
  verifier_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Create Clubs and memberships
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.club_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Coordinator', 'Student Leader', 'Member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);

-- 15. Create general Approval Actions audit log
CREATE TABLE IF NOT EXISTS public.approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('course_file', 'leave', 'ticket', 'exit')),
  entity_id UUID NOT NULL,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- submit, approve, reject, return, lock, reopen, forward
  comment TEXT,
  attachment_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Create Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_file_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_file_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_file_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Dynamic RLS Policies (all authenticated can select, updates restricted by role or owner)
CREATE POLICY "auth_select_institutions" ON public.institutions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_institutions" ON public.institutions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal'));

CREATE POLICY "auth_select_faculty_profiles" ON public.faculty_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_or_admin_update_faculty_profiles" ON public.faculty_profiles FOR ALL TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'dean') OR public.has_role(auth.uid(), 'hod'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'dean') OR public.has_role(auth.uid(), 'hod'));

CREATE POLICY "auth_select_qualifications" ON public.qualifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_manage_qualifications" ON public.qualifications FOR ALL TO authenticated USING (faculty_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'dean') OR public.has_role(auth.uid(), 'hod'));

CREATE POLICY "auth_select_employment_history" ON public.employment_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_manage_employment_history" ON public.employment_history FOR ALL TO authenticated USING (faculty_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'dean') OR public.has_role(auth.uid(), 'hod'));

CREATE POLICY "auth_select_faculty_documents" ON public.faculty_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_manage_faculty_documents" ON public.faculty_documents FOR ALL TO authenticated USING (faculty_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'dean') OR public.has_role(auth.uid(), 'hod'));

CREATE POLICY "auth_select_courses" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_courses" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal'));

CREATE POLICY "auth_select_teaching_assignments" ON public.teaching_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "hod_or_admin_manage_assignments" ON public.teaching_assignments FOR ALL TO authenticated USING (faculty_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'dean') OR public.has_role(auth.uid(), 'hod'));

CREATE POLICY "auth_select_templates" ON public.course_file_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_templates" ON public.course_file_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'iqac_coordinator'));

CREATE POLICY "auth_select_template_items" ON public.course_file_template_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_template_items" ON public.course_file_template_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'iqac_coordinator'));

CREATE POLICY "auth_select_course_files" ON public.course_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_course_files" ON public.course_files FOR ALL TO authenticated USING (true);

CREATE POLICY "auth_select_course_file_evidence" ON public.course_file_evidence FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_evidence" ON public.course_file_evidence FOR ALL TO authenticated USING (true);

CREATE POLICY "auth_select_leaves" ON public.leave_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_or_approver_manage_leaves" ON public.leave_requests FOR ALL TO authenticated USING (faculty_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'dean') OR public.has_role(auth.uid(), 'hod'));

CREATE POLICY "auth_select_tickets" ON public.tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_or_approver_manage_tickets" ON public.tickets FOR ALL TO authenticated USING (faculty_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'dean') OR public.has_role(auth.uid(), 'hod') OR public.has_role(auth.uid(), 'admin_staff'));

CREATE POLICY "auth_select_ticket_messages" ON public.ticket_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "sender_manage_ticket_messages" ON public.ticket_messages FOR ALL TO authenticated USING (true);

CREATE POLICY "auth_select_exits" ON public.exit_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_or_approver_manage_exits" ON public.exit_requests FOR ALL TO authenticated USING (faculty_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'dean') OR public.has_role(auth.uid(), 'hod'));

CREATE POLICY "auth_select_handover_tasks" ON public.handover_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_or_assignee_manage_tasks" ON public.handover_tasks FOR ALL TO authenticated USING (true);

CREATE POLICY "auth_select_clubs" ON public.clubs FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_clubs" ON public.clubs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal') OR public.has_role(auth.uid(), 'hod'));

CREATE POLICY "auth_select_club_members" ON public.club_memberships FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_members" ON public.club_memberships FOR ALL TO authenticated USING (true);

CREATE POLICY "auth_select_approval_actions" ON public.approval_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "actor_insert_approval_actions" ON public.approval_actions FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

CREATE POLICY "owner_select_notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_insert_notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "owner_update_notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- 17. Modify handle_new_user() trigger to automatically create a faculty_profile as well
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept_id uuid;
  v_dept_code text;
  v_inst_id uuid;
BEGIN
  -- Default Institution
  SELECT id INTO v_inst_id FROM public.institutions WHERE code = 'SPEC' LIMIT 1;
  
  v_dept_code := NEW.raw_user_meta_data->>'department_code';
  IF v_dept_code IS NOT NULL THEN
    SELECT id INTO v_dept_id FROM public.departments WHERE code = v_dept_code;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, department, department_id, institution_id, created_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    v_dept_code,
    v_dept_id,
    v_inst_id,
    NULLIF(NEW.raw_user_meta_data->>'created_by','')::uuid
  ) ON CONFLICT (id) DO NOTHING;

  -- Create default faculty profile entry
  INSERT INTO public.faculty_profiles (id, status, designation, employment_type)
  VALUES (
    NEW.id,
    'Invited',
    COALESCE(NEW.raw_user_meta_data->>'designation', 'Assistant Professor'),
    COALESCE(NEW.raw_user_meta_data->>'employment_type', 'Regular')
  ) ON CONFLICT (id) DO NOTHING;

  -- Role assignment
  INSERT INTO public.user_roles (user_id, role, department, department_id)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'faculty'::app_role),
    v_dept_code,
    v_dept_id
  ) ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;
