-- ============================================================
-- SARGS GOVERNANCE — COMPLETE DATABASE SETUP
-- Run this ONE file in Supabase SQL Editor to set up everything
-- https://supabase.com/dashboard/project/spvqusxarcfuyiuydwyr/sql/new
-- ============================================================

-- ============================================================
-- MIGRATION 1: Core enums, profiles, documents, audit
-- ============================================================

-- Roles enum
CREATE TYPE public.app_role AS ENUM (
  'super_admin','principal','dean','hod','faculty','admin_staff','iqac_coordinator','student'
);

-- Document status enum
CREATE TYPE public.doc_status AS ENUM (
  'draft','pending_hod','pending_dean','pending_principal','approved','locked','rejected'
);

-- Document category enum
CREATE TYPE public.doc_category AS ENUM (
  'academic','student_records','faculty_records','accreditation','administrative','research','infrastructure','compliance'
);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  employee_id TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, department)
);

-- Helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.get_primary_role(_user_id UUID)
RETURNS public.app_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'super_admin' THEN 1 WHEN 'principal' THEN 2 WHEN 'dean' THEN 3
    WHEN 'hod' THEN 4 WHEN 'iqac_coordinator' THEN 5 WHEN 'admin_staff' THEN 6
    WHEN 'faculty' THEN 7 WHEN 'student' THEN 8
  END LIMIT 1;
$$;

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category public.doc_category NOT NULL,
  subcategory TEXT,
  department TEXT,
  academic_year TEXT,
  regulation TEXT,
  tags TEXT[] DEFAULT '{}',
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  file_hash TEXT,
  version INT NOT NULL DEFAULT 1,
  status public.doc_status NOT NULL DEFAULT 'draft',
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  current_approver UUID REFERENCES auth.users(id),
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON public.documents (category);
CREATE INDEX ON public.documents (status);
CREATE INDEX ON public.documents (department);
CREATE INDEX ON public.documents (uploaded_by);

-- Approvals trail
CREATE TABLE public.document_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  from_status public.doc_status,
  to_status public.doc_status,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.document_approvals (document_id);

-- Audit log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.audit_log (entity_type, entity_id);
CREATE INDEX ON public.audit_log (actor_id);

-- Compliance deadlines
CREATE TABLE public.compliance_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  authority TEXT NOT NULL,
  category public.doc_category NOT NULL,
  due_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_all_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_super_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal'));
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "docs_select_authenticated" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "docs_insert_staff" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND (
    public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'hod') OR
    public.has_role(auth.uid(),'dean') OR public.has_role(auth.uid(),'principal') OR
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin_staff') OR
    public.has_role(auth.uid(),'iqac_coordinator')));
CREATE POLICY "docs_update_owner_or_approver" ON public.documents FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(),'hod') OR
    public.has_role(auth.uid(),'dean') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "docs_delete_admin" ON public.documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal'));
CREATE POLICY "approvals_select_auth" ON public.document_approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "approvals_insert_auth" ON public.document_approvals FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());
CREATE POLICY "audit_select_privileged" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR
    public.has_role(auth.uid(),'dean') OR public.has_role(auth.uid(),'iqac_coordinator') OR actor_id = auth.uid());
CREATE POLICY "audit_insert_auth" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());
CREATE POLICY "compliance_select_auth" ON public.compliance_deadlines FOR SELECT TO authenticated USING (true);
CREATE POLICY "compliance_manage_admin" ON public.compliance_deadlines FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'iqac_coordinator'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'iqac_coordinator'));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('sargs-documents','sargs-documents', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "sargs_read_auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'sargs-documents');
CREATE POLICY "sargs_insert_staff" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sargs-documents' AND (
    public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'hod') OR
    public.has_role(auth.uid(),'dean') OR public.has_role(auth.uid(),'principal') OR
    public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin_staff') OR
    public.has_role(auth.uid(),'iqac_coordinator')));
CREATE POLICY "sargs_update_owner_admin" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'sargs-documents' AND (owner = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal')));
CREATE POLICY "sargs_delete_admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'sargs-documents' AND (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal')));

-- Seed compliance deadlines
INSERT INTO public.compliance_deadlines (title, authority, category, due_date, notes) VALUES
  ('AQAR Annual Report Submission', 'NAAC', 'accreditation', (now() + interval '60 days')::date, 'Submit AQAR with supporting evidence'),
  ('AICTE EOA Renewal', 'AICTE', 'compliance', (now() + interval '120 days')::date, 'Extension of Approval documents'),
  ('NBA SAR Review', 'NBA', 'accreditation', (now() + interval '90 days')::date, 'Self Assessment Report'),
  ('JNTU Affiliation Continuation', 'JNTU', 'compliance', (now() + interval '45 days')::date, 'Affiliation paperwork');

-- ============================================================
-- MIGRATION 2: Function permissions
-- ============================================================
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_primary_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_primary_role(uuid) TO authenticated;

-- ============================================================
-- MIGRATION 3: Departments, extended profiles, role hierarchy
-- ============================================================
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_select_auth" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_manage_admin" ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal'));
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.departments (code, name) VALUES
  ('CSE','Computer Science & Engineering'), ('ECE','Electronics & Communication Engineering'),
  ('EEE','Electrical & Electronics Engineering'), ('MECH','Mechanical Engineering'),
  ('CIVIL','Civil Engineering'), ('IT','Information Technology'),
  ('AIML','Artificial Intelligence & Machine Learning'), ('MBA','Master of Business Administration'),
  ('HS','Humanities & Sciences'), ('ADMIN','Administration');

ALTER TABLE public.profiles
  ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  ADD COLUMN last_login timestamptz,
  ADD COLUMN created_by uuid,
  ADD COLUMN department_id uuid REFERENCES public.departments(id);

ALTER TABLE public.user_roles ADD COLUMN department_id uuid REFERENCES public.departments(id);

CREATE OR REPLACE FUNCTION public.can_create_role(_creator uuid, _target_role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.has_role(_creator, 'super_admin') THEN true
    WHEN public.has_role(_creator, 'principal') AND _target_role IN ('dean','hod','faculty','admin_staff','iqac_coordinator','student') THEN true
    WHEN public.has_role(_creator, 'dean') AND _target_role IN ('hod','faculty','student') THEN true
    WHEN public.has_role(_creator, 'hod') AND _target_role IN ('faculty','student') THEN true
    ELSE false END;
$$;

CREATE POLICY "profiles_update_privileged" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR
    public.has_role(auth.uid(),'dean') OR public.has_role(auth.uid(),'hod'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR
    public.has_role(auth.uid(),'dean') OR public.has_role(auth.uid(),'hod'));

CREATE TABLE public.system_settings (
  key text PRIMARY KEY, value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_select_auth" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_manage_admin" ON public.system_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal'));
INSERT INTO public.system_settings (key, value) VALUES
  ('academic_year', '"2025-2026"'::jsonb), ('institution_name', '"St. Peter''s Engineering College"'::jsonb),
  ('enforce_2fa', 'false'::jsonb), ('password_min_length', '8'::jsonb), ('allow_public_signup', 'true'::jsonb);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_primary_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_create_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_primary_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_role(uuid, app_role) TO authenticated;

-- ============================================================
-- MIGRATION 4: Institutions + all governance tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE, policy_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.institutions (name, code, policy_config)
VALUES ('St. Peter''s Engineering College', 'SPEC', '{"vacation_gating": "warning"}'::jsonb)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL;
UPDATE public.departments SET institution_id = (SELECT id FROM public.institutions WHERE code = 'SPEC' LIMIT 1) WHERE institution_id IS NULL;

CREATE TABLE IF NOT EXISTS public.faculty_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  jntuh_id TEXT UNIQUE, aicte_id TEXT UNIQUE, pan TEXT, aadhaar TEXT, passport TEXT,
  date_of_joining DATE, date_of_joining_dept DATE, designation TEXT, employment_type TEXT,
  probation_period TEXT, confirmation_date DATE, pay_scale TEXT,
  reporting_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  teaching_experience_years NUMERIC DEFAULT 0, industry_experience_years NUMERIC DEFAULT 0,
  research_experience_years NUMERIC DEFAULT 0,
  -- Extended personal fields
  date_of_birth DATE, gender TEXT, nationality TEXT DEFAULT 'Indian',
  father_name TEXT, mother_name TEXT, personal_email TEXT, alternate_mobile TEXT,
  present_address TEXT, emergency_contact_name TEXT, emergency_contact_phone TEXT,
  biometric_id TEXT, ugc_vidwan_id TEXT, orcid_id TEXT, scopus_id TEXT,
  google_scholar_id TEXT, appointment_order_number TEXT,
  status TEXT NOT NULL DEFAULT 'Invited' CHECK (status IN (
    'Invited','Onboarding','Active','On Leave','Notice Period',
    'Suspended','Exited','Retired','Transferred','Inactive',
    'onboarding','active','on leave','notice period','suspended','exited','retired','transferred','inactive'
  )),
  exit_notice_submitted_date DATE, proposed_last_working_date DATE,
  approved_last_working_date DATE, actual_release_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.faculty_profiles(id) ON DELETE CASCADE,
  level TEXT NOT NULL, degree TEXT NOT NULL, specialization TEXT,
  institution TEXT, university TEXT, register_number TEXT, mode TEXT DEFAULT 'Regular',
  start_year INT, end_year INT, percentage_cgpa NUMERIC, certificate_storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'Not Provided' CHECK (status IN ('Not Provided','Submitted','Verified','Returned for Correction','Expired')),
  verifier_comment TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.faculty_profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL, designation TEXT NOT NULL, from_date DATE NOT NULL, to_date DATE,
  employment_type TEXT, responsibilities TEXT, relieving_cert_path TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Not Provided','Submitted','Verified','Returned for Correction','Expired')),
  verifier_comment TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faculty_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.faculty_profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL, name TEXT NOT NULL, storage_path TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'Submitted' CHECK (verification_status IN ('Not Provided','Submitted','Verified','Returned for Correction','Expired')),
  verifier_comment TEXT, expires_at DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL, regulation TEXT, credits NUMERIC, type TEXT DEFAULT 'Theory',
  syllabus_version TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.courses (code, name, regulation, credits, type) VALUES
  ('CS301T','Database Management Systems','R22',4,'Theory'),
  ('CS301L','Database Management Systems Lab','R22',1.5,'Laboratory'),
  ('CS302T','Design & Analysis of Algorithms','R22',4,'Theory'),
  ('CS303T','Computer Networks','R22',3,'Theory'),
  ('CS401T','Machine Learning','R22',4,'Theory'),
  ('CS402T','Cloud Computing','R22',3,'Theory')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.teaching_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  academic_year TEXT NOT NULL, semester TEXT NOT NULL,
  sections TEXT[] NOT NULL, year_of_study TEXT[] NOT NULL,
  workload_hours NUMERIC DEFAULT 0,
  ownership TEXT NOT NULL DEFAULT 'Primary' CHECK (ownership IN ('Primary','Co-Faculty','Substitute','Reviewer')),
  start_date DATE, end_date DATE, status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_file_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Theory','Laboratory','Lab','Theory+Lab','Other')),
  academic_year TEXT NOT NULL, regulation TEXT, is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_file_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.course_file_templates(id) ON DELETE CASCADE,
  code TEXT NOT NULL, section TEXT NOT NULL, document_name TEXT NOT NULL,
  requirement TEXT NOT NULL DEFAULT 'Mandatory' CHECK (requirement IN ('Mandatory','Conditional','Optional','Configurable')),
  instructions TEXT, allowed_file_types TEXT[] DEFAULT '{"pdf"}',
  max_file_size_mb NUMERIC DEFAULT 10, is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Theory Template
INSERT INTO public.course_file_templates (id, name, type, academic_year, is_active)
VALUES ('77777777-7777-7777-7777-777777777777','Standard Theory Template','Theory','2026-2027',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_file_template_items (template_id, code, section, document_name, requirement, is_active) VALUES
  ('77777777-7777-7777-7777-777777777777','A1','Section A','Vision and Mission of Institute & Department; PEOs, POs and PSOs','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','A2','Section A','Academic Calendar','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','A3','Section A','Class Time Table and Faculty Time Table','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','A4','Section A','List of students enrolled for the course','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','B1','Section B','Course Syllabus','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','B2','Section B','Bloom''s Taxonomy triangle and action verbs','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','B3','Section B','Teaching-Learning Plan','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','B4','Section B','Teaching course materials - module wise','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','B5','Section B','Tutorial questions with answers','Conditional',true),
  ('77777777-7777-7777-7777-777777777777','B6','Section B','Mid-exam question banks','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','B7','Section B','Model question paper with BT levels','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','B8','Section B','Previous years'' end semester question papers','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','C1','Section C','Mid-exam question papers','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','C2','Section C','Sample answer scripts: best, medium and poor','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','C3','Section C','Sample assignment solutions: best, medium and poor','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','C4','Section C','Sample viva/PPT/case study evidence','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','C5','Section C','Slow learners list, action plan, proof and outcomes','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','C6','Section C','Fast learners list, action plan, proof and outcomes','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','C7','Section C','Internal assessment marks','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','C8','Section C','End-semester question paper with answer key','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','C9','Section C','End-semester marks/grade','Mandatory',true),
  ('77777777-7777-7777-7777-777777777777','C10','Section C','Course-end survey questionnaire','Configurable',false),
  ('77777777-7777-7777-7777-777777777777','C11','Section C','CO attainment chart','Configurable',false),
  ('77777777-7777-7777-7777-777777777777','C12','Section C','Three-year result analysis and next-year target COs','Configurable',false)
ON CONFLICT DO NOTHING;

-- Seed Lab Template
INSERT INTO public.course_file_templates (id, name, type, academic_year, is_active)
VALUES ('88888888-8888-8888-8888-888888888888','Standard Lab Template','Laboratory','2026-2027',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_file_template_items (template_id, code, section, document_name, requirement, is_active) VALUES
  ('88888888-8888-8888-8888-888888888888','A1','Section A','Vision and Mission; PEOs, POs and PSOs','Mandatory',true),
  ('88888888-8888-8888-8888-888888888888','A2','Section A','Academic Calendar','Mandatory',true),
  ('88888888-8888-8888-8888-888888888888','A3','Section A','Class Time Table and Faculty Time Table','Mandatory',true),
  ('88888888-8888-8888-8888-888888888888','A4','Section A','List of students enrolled for the course','Mandatory',true),
  ('88888888-8888-8888-8888-888888888888','B1','Section B','Laboratory Syllabus','Mandatory',true),
  ('88888888-8888-8888-8888-888888888888','B2','Section B','Bloom''s Taxonomy triangle and action verbs','Mandatory',true),
  ('88888888-8888-8888-8888-888888888888','B3','Section B','Teaching-Learning Plan','Mandatory',true),
  ('88888888-8888-8888-8888-888888888888','B4','Section B','Laboratory Manual approved by HOD','Mandatory',true),
  ('88888888-8888-8888-8888-888888888888','C1','Section C','Rubrics for lab evaluation','Mandatory',true),
  ('88888888-8888-8888-8888-888888888888','C2','Section C','Mid-lab exam question papers','Mandatory',true),
  ('88888888-8888-8888-8888-888888888888','C3','Section C','Sample lab answer scripts: best, medium and poor','Mandatory',true),
  ('88888888-8888-8888-8888-888888888888','C4','Section C','End-semester lab question paper','Mandatory',true),
  ('88888888-8888-8888-8888-888888888888','C5','Section C','End-semester marks/grade','Mandatory',true),
  ('88888888-8888-8888-8888-888888888888','C6','Section C','Sample project proof: design/software/hardware','Mandatory',true),
  ('88888888-8888-8888-8888-888888888888','C7','Section C','Lab course-end survey questionnaires','Configurable',false),
  ('88888888-8888-8888-8888-888888888888','C8','Section C','CO attainment chart','Configurable',false),
  ('88888888-8888-8888-8888-888888888888','C9','Section C','Three-year result analysis','Configurable',false)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.course_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.teaching_assignments(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.course_file_templates(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'Not Started',
  submitted_at TIMESTAMPTZ, approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_file_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_file_id UUID NOT NULL REFERENCES public.course_files(id) ON DELETE CASCADE,
  template_item_id UUID NOT NULL REFERENCES public.course_file_template_items(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, file_name TEXT NOT NULL, file_size BIGINT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted','Verified','Returned for Correction')),
  comments TEXT, version INT DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL, from_date DATE NOT NULL, to_date DATE NOT NULL,
  half_day BOOLEAN DEFAULT false, total_days NUMERIC NOT NULL, reason TEXT NOT NULL,
  attachment_path TEXT, academic_continuity_plan JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Draft',
  current_approver_role public.app_role DEFAULT 'hod'::public.app_role,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL, subject TEXT NOT NULL, description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Medium', is_confidential BOOLEAN DEFAULT false,
  assigned_department TEXT, status TEXT NOT NULL DEFAULT 'Open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL, is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL, notice_submitted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  proposed_last_working_date DATE NOT NULL, approved_last_working_date DATE,
  actual_release_date DATE, reason_category TEXT, faculty_statement TEXT,
  resignation_letter_path TEXT, status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.handover_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_request_id UUID NOT NULL REFERENCES public.exit_requests(id) ON DELETE CASCADE,
  area TEXT NOT NULL, task_description TEXT NOT NULL,
  assigned_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Completed','Approved')),
  completed_at TIMESTAMPTZ, verifier_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, entity_id UUID NOT NULL,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL, comment TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL, message TEXT NOT NULL,
  read BOOLEAN DEFAULT false, link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
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
ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for all tables
CREATE POLICY "auth_select_institutions" ON public.institutions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_institutions" ON public.institutions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal'));
CREATE POLICY "auth_select_faculty_profiles" ON public.faculty_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_or_admin_update_faculty_profiles" ON public.faculty_profiles FOR ALL TO authenticated
  USING (id=auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'dean') OR public.has_role(auth.uid(),'hod'))
  WITH CHECK (id=auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'dean') OR public.has_role(auth.uid(),'hod'));
CREATE POLICY "auth_select_qualifications" ON public.qualifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_manage_qualifications" ON public.qualifications FOR ALL TO authenticated
  USING (faculty_id=auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'dean') OR public.has_role(auth.uid(),'hod'));
CREATE POLICY "auth_select_employment_history" ON public.employment_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_manage_employment_history" ON public.employment_history FOR ALL TO authenticated
  USING (faculty_id=auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'dean') OR public.has_role(auth.uid(),'hod'));
CREATE POLICY "auth_select_faculty_documents" ON public.faculty_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_manage_faculty_documents" ON public.faculty_documents FOR ALL TO authenticated
  USING (faculty_id=auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'dean') OR public.has_role(auth.uid(),'hod'));
CREATE POLICY "auth_select_courses" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_courses" ON public.courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal'));
CREATE POLICY "auth_select_teaching_assignments" ON public.teaching_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "hod_or_admin_manage_assignments" ON public.teaching_assignments FOR ALL TO authenticated
  USING (faculty_id=auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'dean') OR public.has_role(auth.uid(),'hod'));
CREATE POLICY "auth_select_templates" ON public.course_file_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_templates" ON public.course_file_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'iqac_coordinator'));
CREATE POLICY "auth_select_template_items" ON public.course_file_template_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_template_items" ON public.course_file_template_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'iqac_coordinator'));
CREATE POLICY "auth_select_course_files" ON public.course_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_course_files" ON public.course_files FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_select_course_file_evidence" ON public.course_file_evidence FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_manage_evidence" ON public.course_file_evidence FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_select_leaves" ON public.leave_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_or_approver_manage_leaves" ON public.leave_requests FOR ALL TO authenticated
  USING (faculty_id=auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'dean') OR public.has_role(auth.uid(),'hod'));
CREATE POLICY "auth_select_tickets" ON public.tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_or_approver_manage_tickets" ON public.tickets FOR ALL TO authenticated
  USING (faculty_id=auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'dean') OR public.has_role(auth.uid(),'hod') OR public.has_role(auth.uid(),'admin_staff'));
CREATE POLICY "auth_select_ticket_messages" ON public.ticket_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "sender_manage_ticket_messages" ON public.ticket_messages FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_select_exits" ON public.exit_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_or_approver_manage_exits" ON public.exit_requests FOR ALL TO authenticated
  USING (faculty_id=auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'dean') OR public.has_role(auth.uid(),'hod'));
CREATE POLICY "auth_select_handover_tasks" ON public.handover_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_or_assignee_manage_tasks" ON public.handover_tasks FOR ALL TO authenticated USING (true);
CREATE POLICY "auth_select_approval_actions" ON public.approval_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "actor_insert_approval_actions" ON public.approval_actions FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());
CREATE POLICY "owner_select_notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_insert_notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "owner_update_notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- FINAL: handle_new_user trigger (auto-creates faculty_profile)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_dept_id uuid; v_dept_code text; v_inst_id uuid;
BEGIN
  SELECT id INTO v_inst_id FROM public.institutions WHERE code = 'SPEC' LIMIT 1;
  v_dept_code := NEW.raw_user_meta_data->>'department_code';
  IF v_dept_code IS NOT NULL THEN SELECT id INTO v_dept_id FROM public.departments WHERE code = v_dept_code; END IF;
  INSERT INTO public.profiles (id, full_name, email, department, department_id, institution_id, created_by)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email, v_dept_code, v_dept_id, v_inst_id, NULLIF(NEW.raw_user_meta_data->>'created_by','')::uuid)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.faculty_profiles (id, status, designation, employment_type)
  VALUES (NEW.id, 'Invited',
    COALESCE(NEW.raw_user_meta_data->>'designation','Assistant Professor'),
    COALESCE(NEW.raw_user_meta_data->>'employment_type','Regular'))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role, department, department_id)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role,'faculty'::app_role), v_dept_code, v_dept_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Done! All tables, RLS, triggers, and seed data created.
-- ============================================================
