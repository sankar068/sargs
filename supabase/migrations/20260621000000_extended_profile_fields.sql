-- Extended faculty profile fields migration
-- Adds all new personal, identity, and administrative fields

ALTER TABLE public.faculty_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Indian',
  ADD COLUMN IF NOT EXISTS father_name TEXT,
  ADD COLUMN IF NOT EXISTS mother_name TEXT,
  ADD COLUMN IF NOT EXISTS personal_email TEXT,
  ADD COLUMN IF NOT EXISTS alternate_mobile TEXT,
  ADD COLUMN IF NOT EXISTS present_address TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS biometric_id TEXT,
  ADD COLUMN IF NOT EXISTS ugc_vidwan_id TEXT,
  ADD COLUMN IF NOT EXISTS orcid_id TEXT,
  ADD COLUMN IF NOT EXISTS scopus_id TEXT,
  ADD COLUMN IF NOT EXISTS google_scholar_id TEXT,
  ADD COLUMN IF NOT EXISTS probation_period TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_date DATE,
  ADD COLUMN IF NOT EXISTS appointment_order_number TEXT;

-- Fix status constraint to use proper casing (match app expectations)
ALTER TABLE public.faculty_profiles
  DROP CONSTRAINT IF EXISTS faculty_profiles_status_check;

ALTER TABLE public.faculty_profiles
  ADD CONSTRAINT faculty_profiles_status_check
  CHECK (status IN (
    'Invited', 'Onboarding', 'Active', 'On Leave',
    'Notice Period', 'Suspended', 'Exited', 'Retired',
    'Transferred', 'Inactive',
    -- legacy lowercase variants
    'onboarding', 'active', 'on leave', 'notice period',
    'suspended', 'exited', 'retired', 'transferred', 'inactive'
  ));

-- Add register_number and mode columns to qualifications
ALTER TABLE public.qualifications
  ADD COLUMN IF NOT EXISTS register_number TEXT,
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'Regular';

-- Add actual_release_date to exit_requests if not present
ALTER TABLE public.exit_requests
  ADD COLUMN IF NOT EXISTS actual_release_date DATE;

-- Ensure notifications has a read column (already added in base migration, safety check)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false;

-- Add is_active column to course_file_template_items if missing
ALTER TABLE public.course_file_template_items
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add regulation column to course_file_templates if missing
ALTER TABLE public.course_file_templates
  ADD COLUMN IF NOT EXISTS regulation TEXT;

-- Update default demo faculty profile status to Active
UPDATE public.faculty_profiles SET status = 'Active' WHERE status = 'active';
UPDATE public.faculty_profiles SET status = 'Invited' WHERE status IS NULL;
