-- Add new columns to patients table
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS patient_id TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
ADD COLUMN IF NOT EXISTS date_of_birth TIMESTAMP NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT 'other',
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS last_visit TIMESTAMP,
ADD COLUMN IF NOT EXISTS next_steps TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact JSONB,
ADD COLUMN IF NOT EXISTS medical_history JSONB,
ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS current_medications JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS insurance_info JSONB,
ADD COLUMN IF NOT EXISTS communication_preferences JSONB,
ADD COLUMN IF NOT EXISTS assigned_dentist_id INTEGER REFERENCES users(id);

-- Create scans table
CREATE TABLE IF NOT EXISTS scans (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  tokens_used INTEGER,
  analysis JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create treatment_plans table
CREATE TABLE IF NOT EXISTS treatment_plans (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  dentist_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  estimated_cost INTEGER,
  procedures JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  dentist_id INTEGER NOT NULL REFERENCES users(id),
  date_time TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_assigned_dentist ON patients(assigned_dentist_id);
CREATE INDEX IF NOT EXISTS idx_scans_patient_id ON scans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient_id ON treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_dentist_id ON treatment_plans(dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_id ON appointments(dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(date_time);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scans_updated_at
    BEFORE UPDATE ON scans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_treatment_plans_updated_at
    BEFORE UPDATE ON treatment_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 