CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  insurance_provider VARCHAR(255),
  registered_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npi VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  encounter_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  chief_complaint TEXT,
  scheduled_at TIMESTAMP NOT NULL DEFAULT now(),
  checked_in_at TIMESTAMP,
  discharged_at TIMESTAMP
);

CREATE TABLE diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  icd_code VARCHAR(20) NOT NULL,
  description VARCHAR(255) NOT NULL,
  diagnosis_type VARCHAR(50) NOT NULL DEFAULT 'primary',
  diagnosed_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  cpt_code VARCHAR(20) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount_cents INTEGER NOT NULL,
  insurance_covered_cents INTEGER NOT NULL DEFAULT 0,
  patient_responsibility_cents INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  billed_at TIMESTAMP NOT NULL DEFAULT now(),
  paid_at TIMESTAMP
);
