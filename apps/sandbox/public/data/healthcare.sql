-- Healthcare schema and sample data
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20) NOT NULL,
  blood_type VARCHAR(5),
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
  notes TEXT,
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

CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  route VARCHAR(50) NOT NULL DEFAULT 'oral',
  prescribed_at TIMESTAMP NOT NULL DEFAULT now(),
  end_date TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'active'
);

CREATE TABLE vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  heart_rate INTEGER,
  temperature_f NUMERIC(4,1),
  weight_lbs NUMERIC(5,1),
  height_inches INTEGER,
  recorded_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Patients (15)
INSERT INTO patients (id, mrn, first_name, last_name, date_of_birth, gender, blood_type, email, phone, insurance_provider, registered_at) VALUES
('10000000-0000-0000-0000-000000000001', 'MRN-2024-0001', 'Maria', 'Santos', '1985-03-14', 'Female', 'O+', 'maria.santos@email.com', '(555) 100-0001', 'Blue Cross Blue Shield', '2024-01-10 09:00:00'),
('10000000-0000-0000-0000-000000000002', 'MRN-2024-0002', 'James', 'O''Brien', '1972-07-22', 'Male', 'A+', 'james.obrien@email.com', '(555) 100-0002', 'Aetna', '2024-01-15 10:30:00'),
('10000000-0000-0000-0000-000000000003', 'MRN-2024-0003', 'Priya', 'Sharma', '1990-11-05', 'Female', 'B+', 'priya.sharma@email.com', '(555) 100-0003', 'UnitedHealthcare', '2024-02-01 08:15:00'),
('10000000-0000-0000-0000-000000000004', 'MRN-2024-0004', 'Robert', 'Chen', '1968-01-30', 'Male', 'AB+', 'robert.chen@email.com', '(555) 100-0004', 'Cigna', '2024-02-10 14:00:00'),
('10000000-0000-0000-0000-000000000005', 'MRN-2024-0005', 'Fatima', 'Al-Rashid', '1995-06-18', 'Female', 'O-', 'fatima.alrashid@email.com', '(555) 100-0005', 'Kaiser Permanente', '2024-02-20 11:00:00'),
('10000000-0000-0000-0000-000000000006', 'MRN-2024-0006', 'William', 'Jackson', '1955-09-12', 'Male', 'A-', 'william.jackson@email.com', '(555) 100-0006', 'Medicare', '2024-03-01 09:30:00'),
('10000000-0000-0000-0000-000000000007', 'MRN-2024-0007', 'Sofia', 'Hernandez', '1988-12-25', 'Female', 'B-', 'sofia.hernandez@email.com', '(555) 100-0007', 'Humana', '2024-03-10 13:00:00'),
('10000000-0000-0000-0000-000000000008', 'MRN-2024-0008', 'David', 'Kim', '1979-04-08', 'Male', 'O+', 'david.kim@email.com', '(555) 100-0008', 'Blue Cross Blue Shield', '2024-03-15 10:00:00'),
('10000000-0000-0000-0000-000000000009', 'MRN-2024-0009', 'Emily', 'Nguyen', '1992-08-16', 'Female', 'A+', 'emily.nguyen@email.com', '(555) 100-0009', 'Aetna', '2024-04-01 08:45:00'),
('10000000-0000-0000-0000-000000000010', 'MRN-2024-0010', 'Marcus', 'Williams', '1960-02-28', 'Male', 'AB-', 'marcus.williams@email.com', '(555) 100-0010', 'Medicare', '2024-04-05 15:00:00'),
('10000000-0000-0000-0000-000000000011', 'MRN-2024-0011', 'Aisha', 'Patel', '1997-10-03', 'Female', 'O+', 'aisha.patel@email.com', '(555) 100-0011', 'UnitedHealthcare', '2024-04-15 09:00:00'),
('10000000-0000-0000-0000-000000000012', 'MRN-2024-0012', 'Thomas', 'Mueller', '1983-05-20', 'Male', 'B+', 'thomas.mueller@email.com', '(555) 100-0012', 'Cigna', '2024-05-01 11:30:00'),
('10000000-0000-0000-0000-000000000013', 'MRN-2024-0013', 'Lisa', 'Tanaka', '1975-07-14', 'Female', 'A+', 'lisa.tanaka@email.com', '(555) 100-0013', 'Kaiser Permanente', '2024-05-10 14:15:00'),
('10000000-0000-0000-0000-000000000014', 'MRN-2024-0014', 'Carlos', 'Rivera', '1991-03-09', 'Male', 'O-', 'carlos.rivera@email.com', '(555) 100-0014', 'Humana', '2024-05-20 10:00:00'),
('10000000-0000-0000-0000-000000000015', 'MRN-2024-0015', 'Grace', 'Thompson', '1965-11-22', 'Female', 'AB+', 'grace.thompson@email.com', '(555) 100-0015', 'Blue Cross Blue Shield', '2024-06-01 08:00:00');

-- Providers (6)
INSERT INTO providers (id, npi, first_name, last_name, specialty, department, email, active) VALUES
('20000000-0000-0000-0000-000000000001', '1234567890', 'Sarah', 'Mitchell', 'Internal Medicine', 'Primary Care', 'dr.mitchell@hospital.org', true),
('20000000-0000-0000-0000-000000000002', '1234567891', 'Michael', 'Patel', 'Cardiology', 'Cardiology', 'dr.patel@hospital.org', true),
('20000000-0000-0000-0000-000000000003', '1234567892', 'Jennifer', 'Lee', 'Orthopedics', 'Surgery', 'dr.lee@hospital.org', true),
('20000000-0000-0000-0000-000000000004', '1234567893', 'Ahmed', 'Hassan', 'Neurology', 'Neurosciences', 'dr.hassan@hospital.org', true),
('20000000-0000-0000-0000-000000000005', '1234567894', 'Rachel', 'Goldstein', 'Pediatrics', 'Pediatrics', 'dr.goldstein@hospital.org', true),
('20000000-0000-0000-0000-000000000006', '1234567895', 'Daniel', 'Brooks', 'Emergency Medicine', 'Emergency', 'dr.brooks@hospital.org', true);

-- Encounters (20)
INSERT INTO encounters (id, patient_id, provider_id, encounter_type, status, chief_complaint, notes, scheduled_at, checked_in_at, discharged_at) VALUES
('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'office_visit', 'completed', 'Annual physical exam', 'Patient in good overall health. Recommended dietary changes.', '2024-06-15 09:00:00', '2024-06-15 08:55:00', '2024-06-15 09:45:00'),
('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'office_visit', 'completed', 'Chest tightness and shortness of breath', 'EKG normal. Stress test ordered.', '2024-06-20 10:00:00', '2024-06-20 09:50:00', '2024-06-20 11:00:00'),
('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'telehealth', 'completed', 'Persistent headache for 3 days', 'Advised rest and hydration. Follow-up if symptoms persist.', '2024-07-01 14:00:00', '2024-07-01 14:02:00', '2024-07-01 14:25:00'),
('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'office_visit', 'completed', 'Numbness in left hand', 'Nerve conduction study scheduled. MRI ordered.', '2024-07-10 11:00:00', '2024-07-10 10:55:00', '2024-07-10 12:00:00'),
('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'office_visit', 'completed', 'Sore throat and fever', 'Rapid strep test positive. Antibiotics prescribed.', '2024-07-15 09:30:00', '2024-07-15 09:25:00', '2024-07-15 10:00:00'),
('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', 'office_visit', 'completed', 'Follow-up for hypertension', 'Blood pressure improved with current medication. Continue regimen.', '2024-07-22 10:00:00', '2024-07-22 09:50:00', '2024-07-22 10:30:00'),
('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000003', 'office_visit', 'completed', 'Knee pain after running', 'X-ray shows no fracture. Physical therapy recommended.', '2024-08-01 13:00:00', '2024-08-01 12:55:00', '2024-08-01 13:45:00'),
('30000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000006', 'emergency', 'completed', 'Severe abdominal pain', 'CT scan performed. Appendicitis diagnosed. Surgery consult.', '2024-08-10 02:30:00', '2024-08-10 02:30:00', '2024-08-10 08:00:00'),
('30000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000001', 'telehealth', 'completed', 'Anxiety and difficulty sleeping', 'Discussed sleep hygiene. Referral to behavioral health.', '2024-08-15 15:00:00', '2024-08-15 15:03:00', '2024-08-15 15:35:00'),
('30000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000002', 'office_visit', 'completed', 'Irregular heartbeat', 'Holter monitor ordered for 48-hour monitoring.', '2024-08-22 09:00:00', '2024-08-22 08:55:00', '2024-08-22 09:45:00'),
('30000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000005', 'office_visit', 'completed', 'Well-child visit', 'All immunizations up to date. Growth on track.', '2024-09-01 10:00:00', '2024-09-01 09:55:00', '2024-09-01 10:40:00'),
('30000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000003', 'office_visit', 'completed', 'Lower back pain radiating to leg', 'Possible sciatica. MRI recommended.', '2024-09-10 14:00:00', '2024-09-10 13:55:00', '2024-09-10 14:45:00'),
('30000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000001', 'office_visit', 'completed', 'Diabetes management follow-up', 'HbA1c at 7.2%. Adjusted metformin dosage.', '2024-09-18 11:00:00', '2024-09-18 10:50:00', '2024-09-18 11:30:00'),
('30000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000006', 'emergency', 'completed', 'Laceration on right forearm', 'Wound cleaned and sutured. Tetanus booster administered.', '2024-09-25 18:00:00', '2024-09-25 18:00:00', '2024-09-25 19:30:00'),
('30000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000004', 'office_visit', 'completed', 'Recurring migraines', 'Prescribed sumatriptan. Follow-up in 4 weeks.', '2024-10-01 09:00:00', '2024-10-01 08:50:00', '2024-10-01 09:40:00'),
('30000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'telehealth', 'completed', 'Follow-up on dietary changes', 'Patient reports improved energy levels. Continue plan.', '2024-10-15 14:00:00', '2024-10-15 14:01:00', '2024-10-15 14:20:00'),
('30000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', 'office_visit', 'completed', 'Follow-up for persistent headaches', 'MRI results normal. Tension headache diagnosis.', '2024-10-20 10:00:00', '2024-10-20 09:55:00', '2024-10-20 10:40:00'),
('30000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', 'telehealth', 'completed', 'Blood pressure check-in', 'BP stable at 130/82. No medication changes.', '2024-11-01 11:00:00', '2024-11-01 11:02:00', '2024-11-01 11:20:00'),
('30000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000003', 'office_visit', 'scheduled', 'Post-surgical follow-up', NULL, '2025-01-15 10:00:00', NULL, NULL),
('30000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'office_visit', 'scheduled', 'Stress test results review', NULL, '2025-01-20 09:00:00', NULL, NULL);

-- Diagnoses (15)
INSERT INTO diagnoses (id, encounter_id, icd_code, description, diagnosis_type, diagnosed_at) VALUES
('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Z00.00', 'Encounter for general adult medical examination', 'primary', '2024-06-15 09:30:00'),
('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'R07.9', 'Chest pain, unspecified', 'primary', '2024-06-20 10:30:00'),
('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'R51.9', 'Headache, unspecified', 'primary', '2024-07-01 14:15:00'),
('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', 'G56.00', 'Carpal tunnel syndrome, unspecified upper limb', 'primary', '2024-07-10 11:30:00'),
('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', 'J02.0', 'Streptococcal pharyngitis', 'primary', '2024-07-15 09:40:00'),
('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000006', 'I10', 'Essential hypertension', 'primary', '2024-07-22 10:15:00'),
('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000007', 'M25.561', 'Pain in right knee', 'primary', '2024-08-01 13:20:00'),
('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000008', 'K35.80', 'Unspecified acute appendicitis', 'primary', '2024-08-10 03:30:00'),
('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000009', 'F41.1', 'Generalized anxiety disorder', 'primary', '2024-08-15 15:20:00'),
('40000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000010', 'R00.1', 'Bradycardia, unspecified', 'primary', '2024-08-22 09:20:00'),
('40000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000012', 'M54.5', 'Low back pain', 'primary', '2024-09-10 14:20:00'),
('40000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000012', 'M54.31', 'Sciatica, right side', 'secondary', '2024-09-10 14:20:00'),
('40000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000013', 'E11.65', 'Type 2 diabetes mellitus with hyperglycemia', 'primary', '2024-09-18 11:15:00'),
('40000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000014', 'S51.801A', 'Laceration of right forearm, initial encounter', 'primary', '2024-09-25 18:15:00'),
('40000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000015', 'G43.909', 'Migraine, unspecified, not intractable', 'primary', '2024-10-01 09:20:00');

-- Billing (20)
INSERT INTO billing (id, encounter_id, cpt_code, description, amount_cents, insurance_covered_cents, patient_responsibility_cents, status, billed_at, paid_at) VALUES
('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '99395', 'Preventive visit, 18-39 years', 25000, 22500, 2500, 'paid', '2024-06-15 12:00:00', '2024-07-01 00:00:00'),
('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '99214', 'Office visit, established patient, moderate', 18500, 14800, 3700, 'paid', '2024-06-20 12:00:00', '2024-07-10 00:00:00'),
('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', '93000', 'Electrocardiogram, 12-lead', 8500, 6800, 1700, 'paid', '2024-06-20 12:00:00', '2024-07-10 00:00:00'),
('50000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', '99213', 'Telehealth visit, established, low complexity', 12000, 9600, 2400, 'paid', '2024-07-01 15:00:00', '2024-07-20 00:00:00'),
('50000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000004', '99214', 'Office visit, established patient, moderate', 18500, 14800, 3700, 'paid', '2024-07-10 13:00:00', '2024-07-30 00:00:00'),
('50000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000005', '99213', 'Office visit, established patient, low', 12000, 10200, 1800, 'paid', '2024-07-15 11:00:00', '2024-08-01 00:00:00'),
('50000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000005', '87880', 'Strep test, rapid antigen', 4500, 3600, 900, 'paid', '2024-07-15 11:00:00', '2024-08-01 00:00:00'),
('50000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000006', '99213', 'Office visit, established patient, low', 12000, 10800, 1200, 'paid', '2024-07-22 11:00:00', '2024-08-05 00:00:00'),
('50000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000007', '99214', 'Office visit, established patient, moderate', 18500, 14800, 3700, 'paid', '2024-08-01 14:00:00', '2024-08-20 00:00:00'),
('50000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000007', '73562', 'X-ray, knee, 3 views', 9500, 7600, 1900, 'paid', '2024-08-01 14:00:00', '2024-08-20 00:00:00'),
('50000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000008', '99285', 'Emergency department visit, high severity', 65000, 45500, 19500, 'paid', '2024-08-10 08:30:00', '2024-09-01 00:00:00'),
('50000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000008', '74177', 'CT abdomen and pelvis with contrast', 35000, 24500, 10500, 'paid', '2024-08-10 08:30:00', '2024-09-01 00:00:00'),
('50000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000009', '99213', 'Telehealth visit, established, low complexity', 12000, 9600, 2400, 'paid', '2024-08-15 16:00:00', '2024-09-05 00:00:00'),
('50000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000010', '99214', 'Office visit, established patient, moderate', 18500, 16650, 1850, 'paid', '2024-08-22 10:00:00', '2024-09-10 00:00:00'),
('50000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000011', '99393', 'Well-child visit, 5-11 years', 22000, 22000, 0, 'paid', '2024-09-01 11:00:00', '2024-09-15 00:00:00'),
('50000000-0000-0000-0000-000000000016', '30000000-0000-0000-0000-000000000012', '99214', 'Office visit, established patient, moderate', 18500, 14800, 3700, 'pending', '2024-09-10 15:00:00', NULL),
('50000000-0000-0000-0000-000000000017', '30000000-0000-0000-0000-000000000013', '99214', 'Office visit, established patient, moderate', 18500, 16650, 1850, 'paid', '2024-09-18 12:00:00', '2024-10-05 00:00:00'),
('50000000-0000-0000-0000-000000000018', '30000000-0000-0000-0000-000000000014', '99283', 'Emergency department visit, moderate severity', 45000, 31500, 13500, 'pending', '2024-09-25 20:00:00', NULL),
('50000000-0000-0000-0000-000000000019', '30000000-0000-0000-0000-000000000015', '99214', 'Office visit, established patient, moderate', 18500, 14800, 3700, 'pending', '2024-10-01 10:00:00', NULL),
('50000000-0000-0000-0000-000000000020', '30000000-0000-0000-0000-000000000016', '99213', 'Telehealth visit, established, low complexity', 12000, 9600, 2400, 'paid', '2024-10-15 15:00:00', '2024-11-01 00:00:00');

-- Medications (15)
INSERT INTO medications (id, encounter_id, medication_name, dosage, frequency, route, prescribed_at, end_date, status) VALUES
('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'Amoxicillin', '500 mg', 'Three times daily', 'oral', '2024-07-15 09:45:00', '2024-07-25 00:00:00', 'completed'),
('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000006', 'Lisinopril', '10 mg', 'Once daily', 'oral', '2024-07-22 10:20:00', NULL, 'active'),
('60000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000006', 'Hydrochlorothiazide', '25 mg', 'Once daily', 'oral', '2024-07-22 10:20:00', NULL, 'active'),
('60000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000007', 'Ibuprofen', '400 mg', 'Every 6 hours as needed', 'oral', '2024-08-01 13:30:00', '2024-08-15 00:00:00', 'completed'),
('60000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000008', 'Morphine Sulfate', '4 mg', 'Every 4 hours as needed', 'intravenous', '2024-08-10 03:00:00', '2024-08-10 08:00:00', 'completed'),
('60000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000008', 'Cefazolin', '2 g', 'Pre-operative dose', 'intravenous', '2024-08-10 05:00:00', '2024-08-10 06:00:00', 'completed'),
('60000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000009', 'Melatonin', '3 mg', 'Once daily at bedtime', 'oral', '2024-08-15 15:25:00', NULL, 'active'),
('60000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000010', 'Metoprolol', '25 mg', 'Twice daily', 'oral', '2024-08-22 09:30:00', NULL, 'active'),
('60000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000013', 'Metformin', '1000 mg', 'Twice daily', 'oral', '2024-09-18 11:20:00', NULL, 'active'),
('60000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000013', 'Glipizide', '5 mg', 'Once daily before breakfast', 'oral', '2024-09-18 11:20:00', NULL, 'active'),
('60000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000014', 'Cephalexin', '500 mg', 'Four times daily', 'oral', '2024-09-25 18:30:00', '2024-10-05 00:00:00', 'completed'),
('60000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000014', 'Acetaminophen', '500 mg', 'Every 6 hours as needed', 'oral', '2024-09-25 18:30:00', '2024-10-02 00:00:00', 'completed'),
('60000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000015', 'Sumatriptan', '50 mg', 'As needed at onset of migraine', 'oral', '2024-10-01 09:25:00', NULL, 'active'),
('60000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000015', 'Topiramate', '25 mg', 'Once daily', 'oral', '2024-10-01 09:25:00', NULL, 'active'),
('60000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000017', 'Amitriptyline', '10 mg', 'Once daily at bedtime', 'oral', '2024-10-20 10:20:00', NULL, 'active');

-- Vitals (20)
INSERT INTO vitals (id, encounter_id, systolic_bp, diastolic_bp, heart_rate, temperature_f, weight_lbs, height_inches, recorded_at) VALUES
('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 118, 76, 72, 98.6, 145.0, 64, '2024-06-15 08:58:00'),
('70000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 142, 88, 82, 98.4, 210.5, 70, '2024-06-20 09:52:00'),
('70000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000004', 124, 80, 68, 98.2, 175.0, 68, '2024-07-10 10:58:00'),
('70000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000005', 120, 78, 88, 101.2, 132.0, 63, '2024-07-15 09:28:00'),
('70000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000006', 138, 86, 74, 98.6, 195.0, 71, '2024-07-22 09:52:00'),
('70000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000007', 116, 74, 70, 98.4, 155.0, 65, '2024-08-01 12:58:00'),
('70000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000008', 152, 94, 110, 99.8, 180.0, 72, '2024-08-10 02:35:00'),
('70000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000010', 130, 82, 58, 98.0, 200.0, 69, '2024-08-22 08:58:00'),
('70000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000011', 108, 68, 90, 98.6, 72.0, 52, '2024-09-01 09:58:00'),
('70000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000012', 126, 80, 76, 98.4, 190.0, 73, '2024-09-10 13:58:00'),
('70000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000013', 134, 84, 78, 98.8, 168.0, 62, '2024-09-18 10:55:00'),
('70000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000014', 128, 82, 92, 98.6, 175.0, 70, '2024-09-25 18:05:00'),
('70000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000015', 122, 78, 70, 98.2, 158.0, 64, '2024-10-01 08:55:00'),
('70000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000016', 116, 74, 70, 98.6, 142.0, 64, '2024-10-15 14:05:00'),
('70000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000017', 120, 76, 74, 98.4, 132.0, 63, '2024-10-20 09:58:00'),
('70000000-0000-0000-0000-000000000016', '30000000-0000-0000-0000-000000000018', 130, 82, 72, 98.6, 194.0, 71, '2024-11-01 11:05:00'),
('70000000-0000-0000-0000-000000000017', '30000000-0000-0000-0000-000000000001', 120, 78, 74, 98.6, 146.0, 64, '2024-06-15 09:00:00'),
('70000000-0000-0000-0000-000000000018', '30000000-0000-0000-0000-000000000002', 140, 86, 80, 98.4, 210.0, 70, '2024-06-20 10:05:00'),
('70000000-0000-0000-0000-000000000019', '30000000-0000-0000-0000-000000000006', 132, 84, 72, 98.6, 194.0, 71, '2024-07-22 10:25:00'),
('70000000-0000-0000-0000-000000000020', '30000000-0000-0000-0000-000000000010', 128, 80, 60, 98.2, 199.0, 69, '2024-08-22 09:40:00');
