-- 1. Departments table
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "departments_select_auth" ON public.departments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_manage_admin" ON public.departments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal'));

CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed standard departments
INSERT INTO public.departments (code, name) VALUES
  ('CSE',   'Computer Science & Engineering'),
  ('ECE',   'Electronics & Communication Engineering'),
  ('EEE',   'Electrical & Electronics Engineering'),
  ('MECH',  'Mechanical Engineering'),
  ('CIVIL', 'Civil Engineering'),
  ('IT',    'Information Technology'),
  ('AIML',  'Artificial Intelligence & Machine Learning'),
  ('MBA',   'Master of Business Administration'),
  ('HS',    'Humanities & Sciences'),
  ('ADMIN', 'Administration');

-- 2. Extend profiles with status + tracking
ALTER TABLE public.profiles
  ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  ADD COLUMN last_login timestamptz,
  ADD COLUMN created_by uuid,
  ADD COLUMN department_id uuid REFERENCES public.departments(id);

-- Add department_id to user_roles too (keep existing text 'department' for back-compat)
ALTER TABLE public.user_roles
  ADD COLUMN department_id uuid REFERENCES public.departments(id);

-- 3. Hierarchy: who can create which role
CREATE OR REPLACE FUNCTION public.can_create_role(_creator uuid, _target_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(_creator, 'super_admin') THEN true
    WHEN public.has_role(_creator, 'principal') AND _target_role IN
      ('dean','hod','faculty','admin_staff','iqac_coordinator','student') THEN true
    WHEN public.has_role(_creator, 'dean') AND _target_role IN
      ('hod','faculty','student') THEN true
    WHEN public.has_role(_creator, 'hod') AND _target_role IN
      ('faculty','student') THEN true
    ELSE false
  END;
$$;

-- 4. Add policy so privileged roles can update profile status/dept of users below them
CREATE POLICY "profiles_update_privileged" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'principal')
    OR public.has_role(auth.uid(), 'dean')
    OR public.has_role(auth.uid(), 'hod')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'principal')
    OR public.has_role(auth.uid(), 'dean')
    OR public.has_role(auth.uid(), 'hod')
  );

-- 5. Academic year + system settings (simple kv)
CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_select_auth" ON public.system_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_manage_admin" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'principal'));

INSERT INTO public.system_settings (key, value) VALUES
  ('academic_year', '"2025-2026"'::jsonb),
  ('institution_name', '"SARGS Engineering College"'::jsonb),
  ('enforce_2fa', 'false'::jsonb),
  ('password_min_length', '8'::jsonb),
  ('allow_public_signup', 'true'::jsonb);

-- 6. Helper to update handle_new_user to record created_by if provided in metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept_id uuid;
  v_dept_code text;
BEGIN
  v_dept_code := NEW.raw_user_meta_data->>'department_code';
  IF v_dept_code IS NOT NULL THEN
    SELECT id INTO v_dept_id FROM public.departments WHERE code = v_dept_code;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, department, department_id, created_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    v_dept_code,
    v_dept_id,
    NULLIF(NEW.raw_user_meta_data->>'created_by','')::uuid
  );

  -- If an explicit role was passed in metadata, use it; else default to faculty
  INSERT INTO public.user_roles (user_id, role, department, department_id)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'faculty'::app_role),
    v_dept_code,
    v_dept_id
  );
  RETURN NEW;
END;
$$;

-- 7. Trigger to create profile on new auth user (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Trigger for profiles updated_at
DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 9. Allow users to see departments list + helper view for user management
CREATE OR REPLACE VIEW public.v_users_admin AS
SELECT
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.employee_id,
  p.department,
  p.department_id,
  d.code  AS dept_code,
  d.name  AS dept_name,
  p.status,
  p.last_login,
  p.created_at,
  p.created_by,
  COALESCE(
    ARRAY(SELECT role::text FROM public.user_roles ur WHERE ur.user_id = p.id ORDER BY 1),
    ARRAY[]::text[]
  ) AS roles
FROM public.profiles p
LEFT JOIN public.departments d ON d.id = p.department_id;

GRANT SELECT ON public.v_users_admin TO authenticated;