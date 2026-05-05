-- Insmile AI V2 — Initial Schema with RLS
-- Multi-tenant dental SaaS for Kenya

-- ============================================================
-- COMPANIES (tenants)
-- ============================================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  brand_config JSONB DEFAULT '{}',
  address TEXT,
  phone TEXT,
  email TEXT,
  kmpdb_license TEXT,
  operating_hours JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PROFILES (extends auth.users, links to company)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'dentist' CHECK (role IN ('super_admin', 'clinic_admin', 'dentist', 'hygienist', 'receptionist')),
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  specialization TEXT,
  kmpdb_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PATIENTS
-- ============================================================
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  phone TEXT,
  email TEXT,
  national_id TEXT,

  -- Insurance (Kenya-specific)
  sha_number TEXT,
  nhif_number TEXT,
  insurance_provider TEXT,
  insurance_member_number TEXT,

  -- Medical
  allergies TEXT[],
  medical_history TEXT,
  medications TEXT[],
  preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'sw')),

  -- Dental
  last_visit DATE,
  referral_source TEXT,
  notes TEXT,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SCANS
-- ============================================================
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT,
  scan_type TEXT DEFAULT 'unknown' CHECK (scan_type IN ('xray', 'panoramic', 'intraoral', 'cbct', 'unknown')),
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ANALYSES (AI findings)
-- ============================================================
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  findings JSONB DEFAULT '[]',
  summary TEXT,
  model_used TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- TREATMENT PLANS
-- ============================================================
CREATE TABLE treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id),
  analysis_id UUID REFERENCES analyses(id),
  steps JSONB DEFAULT '[]',
  pricing_mode TEXT DEFAULT 'private_mid' CHECK (pricing_mode IN ('public', 'private_mid', 'private_premium')),
  total_kes NUMERIC,
  sha_covered BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'in_progress', 'completed')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CHAT SESSIONS
-- ============================================================
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  context_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INVITATIONS (for clinic_admin to invite team members)
-- ============================================================
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'dentist' CHECK (role IN ('clinic_admin', 'dentist', 'hygienist', 'receptionist')),
  invited_by UUID REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_company ON profiles(company_id);
CREATE INDEX idx_patients_company ON patients(company_id);
CREATE INDEX idx_patients_name ON patients(company_id, full_name);
CREATE INDEX idx_scans_patient ON scans(patient_id);
CREATE INDEX idx_scans_company ON scans(company_id);
CREATE INDEX idx_analyses_scan ON analyses(scan_id);
CREATE INDEX idx_analyses_company ON analyses(company_id);
CREATE INDEX idx_treatment_plans_patient ON treatment_plans(patient_id);
CREATE INDEX idx_treatment_plans_company ON treatment_plans(company_id);
CREATE INDEX idx_chat_sessions_company ON chat_sessions(company_id);
CREATE INDEX idx_chat_sessions_patient ON chat_sessions(patient_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_invitations_email ON invitations(email);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's company_id
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS POLICIES — Companies
-- ============================================================
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id = get_my_company_id());

CREATE POLICY "Clinic admins can update their company"
  ON companies FOR UPDATE
  USING (id = get_my_company_id() AND get_my_role() IN ('clinic_admin', 'super_admin'));

-- ============================================================
-- RLS POLICIES — Profiles
-- ============================================================
CREATE POLICY "Users can view profiles in their company"
  ON profiles FOR SELECT
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Clinic admins can manage profiles in their company"
  ON profiles FOR ALL
  USING (company_id = get_my_company_id() AND get_my_role() IN ('clinic_admin', 'super_admin'));

-- ============================================================
-- RLS POLICIES — Patients
-- ============================================================
CREATE POLICY "Users can view patients in their company"
  ON patients FOR SELECT
  USING (company_id = get_my_company_id());

CREATE POLICY "Dentists+ can create patients"
  ON patients FOR INSERT
  WITH CHECK (company_id = get_my_company_id() AND get_my_role() IN ('dentist', 'hygienist', 'clinic_admin', 'super_admin', 'receptionist'));

CREATE POLICY "Dentists+ can update patients in their company"
  ON patients FOR UPDATE
  USING (company_id = get_my_company_id() AND get_my_role() IN ('dentist', 'hygienist', 'clinic_admin', 'super_admin', 'receptionist'));

CREATE POLICY "Clinic admins can delete patients"
  ON patients FOR DELETE
  USING (company_id = get_my_company_id() AND get_my_role() IN ('clinic_admin', 'super_admin'));

-- ============================================================
-- RLS POLICIES — Scans
-- ============================================================
CREATE POLICY "Users can view scans in their company"
  ON scans FOR SELECT
  USING (company_id = get_my_company_id());

CREATE POLICY "Dentists+ can upload scans"
  ON scans FOR INSERT
  WITH CHECK (company_id = get_my_company_id() AND get_my_role() IN ('dentist', 'hygienist', 'clinic_admin', 'super_admin'));

CREATE POLICY "Clinic admins can delete scans"
  ON scans FOR DELETE
  USING (company_id = get_my_company_id() AND get_my_role() IN ('clinic_admin', 'super_admin'));

-- ============================================================
-- RLS POLICIES — Analyses
-- ============================================================
CREATE POLICY "Users can view analyses in their company"
  ON analyses FOR SELECT
  USING (company_id = get_my_company_id());

CREATE POLICY "System can insert analyses"
  ON analyses FOR INSERT
  WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "System can update analyses"
  ON analyses FOR UPDATE
  USING (company_id = get_my_company_id());

-- ============================================================
-- RLS POLICIES — Treatment Plans
-- ============================================================
CREATE POLICY "Users can view treatment plans in their company"
  ON treatment_plans FOR SELECT
  USING (company_id = get_my_company_id());

CREATE POLICY "Dentists+ can create treatment plans"
  ON treatment_plans FOR INSERT
  WITH CHECK (company_id = get_my_company_id() AND get_my_role() IN ('dentist', 'clinic_admin', 'super_admin'));

CREATE POLICY "Dentists+ can update treatment plans"
  ON treatment_plans FOR UPDATE
  USING (company_id = get_my_company_id() AND get_my_role() IN ('dentist', 'clinic_admin', 'super_admin'));

-- ============================================================
-- RLS POLICIES — Chat Sessions
-- ============================================================
CREATE POLICY "Users can view their own chat sessions"
  ON chat_sessions FOR SELECT
  USING (company_id = get_my_company_id());

CREATE POLICY "Users can create chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (company_id = get_my_company_id() AND user_id = auth.uid());

-- ============================================================
-- RLS POLICIES — Chat Messages
-- ============================================================
CREATE POLICY "Users can view messages in their company sessions"
  ON chat_messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE company_id = get_my_company_id()
    )
  );

CREATE POLICY "Users can insert messages to their sessions"
  ON chat_messages FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- RLS POLICIES — Invitations
-- ============================================================
CREATE POLICY "Clinic admins can manage invitations"
  ON invitations FOR ALL
  USING (company_id = get_my_company_id() AND get_my_role() IN ('clinic_admin', 'super_admin'));

CREATE POLICY "Anyone can view their own invitation by email"
  ON invitations FOR SELECT
  USING (email = auth.jwt()->>'email');

-- ============================================================
-- TRIGGERS — auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_treatment_plans_updated_at
  BEFORE UPDATE ON treatment_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTION: handle new user signup (creates profile + optional company)
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _company_id UUID;
  _role TEXT;
  _full_name TEXT;
  _invitation RECORD;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

  -- Check if there's a pending invitation for this email
  SELECT * INTO _invitation
  FROM invitations
  WHERE email = NEW.email
    AND accepted_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF _invitation IS NOT NULL THEN
    -- Join existing company via invitation
    _company_id := _invitation.company_id;
    _role := _invitation.role;

    -- Mark invitation as accepted
    UPDATE invitations SET accepted_at = now() WHERE id = _invitation.id;
  ELSE
    -- Create a new company for this user
    INSERT INTO companies (name, slug)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'clinic_name', _full_name || '''s Clinic'),
      LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'clinic_name', NEW.id::text), ' ', '-'))
    )
    RETURNING id INTO _company_id;

    _role := 'clinic_admin';
  END IF;

  -- Create profile
  INSERT INTO profiles (id, company_id, role, full_name)
  VALUES (NEW.id, _company_id, _role, _full_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- STORAGE BUCKET for scan files
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('scans', 'scans', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can only access scans in their company's folder
CREATE POLICY "Company members can view scans"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'scans'
    AND (storage.foldername(name))[1] = get_my_company_id()::text
  );

CREATE POLICY "Dentists can upload scans"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'scans'
    AND (storage.foldername(name))[1] = get_my_company_id()::text
    AND get_my_role() IN ('dentist', 'hygienist', 'clinic_admin', 'super_admin')
  );

CREATE POLICY "Clinic admins can delete scans"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'scans'
    AND (storage.foldername(name))[1] = get_my_company_id()::text
    AND get_my_role() IN ('clinic_admin', 'super_admin')
  );
