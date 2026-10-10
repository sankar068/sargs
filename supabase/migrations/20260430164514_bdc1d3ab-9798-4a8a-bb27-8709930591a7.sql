
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

-- user_roles (separate table, no role on profile)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, department)
);

-- Security-definer role checker
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.get_primary_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'principal' THEN 2
    WHEN 'dean' THEN 3
    WHEN 'hod' THEN 4
    WHEN 'iqac_coordinator' THEN 5
    WHEN 'admin_staff' THEN 6
    WHEN 'faculty' THEN 7
    WHEN 'student' THEN 8
  END
  LIMIT 1;
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
  regulation TEXT, -- R20/R22/R25 etc.
  tags TEXT[] DEFAULT '{}',
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  file_hash TEXT, -- tamper detection
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
  action TEXT NOT NULL, -- submitted, approved, rejected, locked
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
  authority TEXT NOT NULL, -- NAAC/NBA/AICTE/JNTU
  category public.doc_category NOT NULL,
  due_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- New-user -> profile + default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'faculty'); -- default role; super_admin assigns real roles
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_deadlines ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_all_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_super_admin_all" ON public.profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- user_roles policies
CREATE POLICY "roles_select_self_or_admin" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal'));
CREATE POLICY "roles_admin_manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- Documents policies
CREATE POLICY "docs_select_authenticated" ON public.documents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "docs_insert_staff" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND (
      public.has_role(auth.uid(),'faculty') OR
      public.has_role(auth.uid(),'hod') OR
      public.has_role(auth.uid(),'dean') OR
      public.has_role(auth.uid(),'principal') OR
      public.has_role(auth.uid(),'super_admin') OR
      public.has_role(auth.uid(),'admin_staff') OR
      public.has_role(auth.uid(),'iqac_coordinator')
    )
  );
CREATE POLICY "docs_update_owner_or_approver" ON public.documents
  FOR UPDATE TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    public.has_role(auth.uid(),'hod') OR
    public.has_role(auth.uid(),'dean') OR
    public.has_role(auth.uid(),'principal') OR
    public.has_role(auth.uid(),'super_admin')
  );
CREATE POLICY "docs_delete_admin" ON public.documents
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal'));

-- Approvals policies
CREATE POLICY "approvals_select_auth" ON public.document_approvals
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "approvals_insert_auth" ON public.document_approvals
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

-- Audit log policies
CREATE POLICY "audit_select_privileged" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'super_admin') OR
    public.has_role(auth.uid(),'principal') OR
    public.has_role(auth.uid(),'dean') OR
    public.has_role(auth.uid(),'iqac_coordinator') OR
    actor_id = auth.uid()
  );
CREATE POLICY "audit_insert_auth" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

-- Compliance
CREATE POLICY "compliance_select_auth" ON public.compliance_deadlines
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "compliance_manage_admin" ON public.compliance_deadlines
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'iqac_coordinator'))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal') OR public.has_role(auth.uid(),'iqac_coordinator'));

-- Storage bucket for documents (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('sargs-documents','sargs-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can read; only staff roles can upload; owner/admin can update/delete
CREATE POLICY "sargs_read_auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'sargs-documents');

CREATE POLICY "sargs_insert_staff" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'sargs-documents' AND (
      public.has_role(auth.uid(),'faculty') OR
      public.has_role(auth.uid(),'hod') OR
      public.has_role(auth.uid(),'dean') OR
      public.has_role(auth.uid(),'principal') OR
      public.has_role(auth.uid(),'super_admin') OR
      public.has_role(auth.uid(),'admin_staff') OR
      public.has_role(auth.uid(),'iqac_coordinator')
    )
  );

CREATE POLICY "sargs_update_owner_admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'sargs-documents' AND (
      owner = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal')
    )
  );

CREATE POLICY "sargs_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'sargs-documents' AND (
      public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'principal')
    )
  );

-- Seed a few compliance deadlines
INSERT INTO public.compliance_deadlines (title, authority, category, due_date, notes) VALUES
  ('AQAR Annual Report Submission', 'NAAC', 'accreditation', (now() + interval '60 days')::date, 'Submit AQAR with supporting evidence'),
  ('AICTE EOA Renewal', 'AICTE', 'compliance', (now() + interval '120 days')::date, 'Extension of Approval documents'),
  ('NBA SAR Review', 'NBA', 'accreditation', (now() + interval '90 days')::date, 'Self Assessment Report'),
  ('JNTU Affiliation Continuation', 'JNTU', 'compliance', (now() + interval '45 days')::date, 'Affiliation paperwork');
