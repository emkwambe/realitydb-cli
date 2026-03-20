#!/usr/bin/env python3
"""Generate enriched healthcare.sql"""
import random
from datetime import datetime, timedelta, date
random.seed(42)

out = []

out.append("""-- Healthcare schema and sample data
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
);""")

def uid(prefix, n):
    return f"{prefix}-0000-0000-0000-{n:012d}"
def esc(s):
    return s.replace("'", "''")
def fmt_ts(dt):
    return dt.strftime('%Y-%m-%d %H:%M:%S')
def fmt_date(d):
    return d.strftime('%Y-%m-%d')

base_date = datetime(2023, 6, 1)
end_date = datetime(2026, 2, 28)
total_days = (end_date - base_date).days

def random_date():
    if random.random() < 0.6:
        d = datetime(2025, 3, 1) + timedelta(days=random.randint(0, 365))
        if d > end_date: d = end_date - timedelta(days=random.randint(0,60))
        return d
    return base_date + timedelta(days=random.randint(0, total_days))

# --- Name pools ---
first_names_f = ['Maria', 'Priya', 'Fatima', 'Sofia', 'Emily', 'Aisha', 'Lisa', 'Grace', 'Mei', 'Ana',
    'Jennifer', 'Sarah', 'Rachel', 'Yuki', 'Carmen', 'Diana', 'Olga', 'Amara', 'Nadia', 'Elena',
    'Rosa', 'Lin', 'Keiko', 'Ingrid', 'Zara', 'Deepa', 'Luz', 'Hana', 'Nia', 'Ava',
    'Isabella', 'Mia', 'Emma', 'Chloe', 'Layla', 'Aaliyah', 'Suki', 'Katarina', 'Bianca', 'Tanya',
    'Margaret', 'Ruth', 'Dorothy', 'Betty', 'Helen', 'Sharon', 'Nancy', 'Linda', 'Susan', 'Patricia',
    'Gabriela', 'Valentina']
first_names_m = ['James', 'Robert', 'David', 'Marcus', 'Carlos', 'Wei', 'Ahmed', 'Thomas', 'Raj',
    'Dmitri', 'Kevin', 'William', 'Kwame', 'Hiroshi', 'Miguel', 'Patrick', 'Ivan', 'Omar', 'Chen',
    'Jamal', 'Alexander', 'Samuel', 'Andrei', 'Ravi', 'Diego', 'Hassan', 'Kofi', 'Liam', 'Noah',
    'Ethan', 'Lucas', 'Mason', 'Elijah', 'Benjamin', 'Daniel', 'Henrik', 'Sanjay', 'Pedro', 'Yusuf',
    'George', 'Arthur', 'Frank', 'Henry', 'Joseph', 'Charles', 'Richard', 'Edward', 'John', 'Paul']
last_names = ['Santos', 'Sharma', 'Al-Rashid', 'Chen', 'Williams', 'Hernandez', 'Kim', 'Nguyen', 'Patel',
    'Mueller', 'Tanaka', 'Rivera', 'Thompson', 'Jackson', 'O''Brien', 'Garcia', 'Martinez', 'Anderson',
    'Taylor', 'Brown', 'Davis', 'Wilson', 'Moore', 'Thomas', 'White', 'Harris', 'Martin', 'Lee',
    'Clark', 'Lewis', 'Robinson', 'Walker', 'Hall', 'Young', 'King', 'Wright', 'Lopez', 'Hill',
    'Scott', 'Green', 'Adams', 'Baker', 'Gonzalez', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts',
    'Okafor', 'Johansson', 'Petrov', 'Nakamura', 'Abbasi', 'Kowalski', 'Dubois', 'Singh', 'Rossi', 'Costa']

blood_dist = ['O+']*37 + ['A+']*30 + ['B+']*12 + ['AB+']*6 + ['O-']*7 + ['A-']*5 + ['B-']*2 + ['AB-']*1
gender_dist = ['Female']*51 + ['Male']*48 + ['Other']*1
insurance_dist = (['Blue Cross Blue Shield']*10 + ['Aetna']*9 + ['UnitedHealthcare']*9 + ['Cigna']*6 +
    ['Kaiser Permanente']*6 + ['Humana']*5 + ['Medicare']*25 + ['Medicaid']*20 + ['Self-Pay']*10)

# Patients (200)
out.append("\n-- Patients (200)")
patient_rows = []
for i in range(1, 201):
    gender = gender_dist[(i-1) % 100]
    if gender == 'Female':
        fn = first_names_f[(i-1) % len(first_names_f)]
    elif gender == 'Male':
        fn = first_names_m[(i-1) % len(first_names_m)]
    else:
        fn = random.choice(first_names_f + first_names_m)
    ln = last_names[(i-1) % len(last_names)]
    mrn = f"MRN-2024-{i:04d}"
    # DOB: varied ages 0-95
    age = random.randint(0, 95)
    dob = date(2026, 1, 1) - timedelta(days=age*365 + random.randint(0, 364))
    blood = random.choice(blood_dist)
    email = f"{fn.lower().replace(' ','')}.{ln.lower().replace(' ','')}@email.com"
    phone = f"(555) {100+i//100:03d}-{i:04d}"
    ins = random.choice(insurance_dist)
    reg = random_date()
    patient_rows.append((i, mrn, fn, ln, fmt_date(dob), gender, blood, email, phone, ins, fmt_ts(reg)))

for bs in range(0, len(patient_rows), 50):
    batch = patient_rows[bs:bs+50]
    vals = []
    for r in batch:
        vals.append(f"('{uid('10000000', r[0])}', '{r[1]}', '{esc(r[2])}', '{esc(r[3])}', '{r[4]}', '{r[5]}', '{r[6]}', '{esc(r[7])}', '{r[8]}', '{esc(r[9])}', '{r[10]}')")
    out.append(f"INSERT INTO patients (id, mrn, first_name, last_name, date_of_birth, gender, blood_type, email, phone, insurance_provider, registered_at) VALUES\n" + ",\n".join(vals) + ";")

# Providers (30)
specialties = (['family_medicine']*8 + ['internal_medicine']*6 + ['pediatrics']*5 + ['cardiology']*3 +
    ['orthopedics']*2 + ['neurology']*2 + ['dermatology']*2 + ['psychiatry']*1 + ['emergency_medicine']*1)
dept_map = {'family_medicine': 'Primary Care', 'internal_medicine': 'Internal Medicine', 'pediatrics': 'Pediatrics',
    'cardiology': 'Cardiology', 'orthopedics': 'Orthopedics', 'neurology': 'Neurosciences',
    'dermatology': 'Dermatology', 'psychiatry': 'Psychiatry', 'emergency_medicine': 'Emergency'}
dr_names = [
    ('Sarah', 'Mitchell'), ('Michael', 'Patel'), ('Jennifer', 'Lee'), ('Ahmed', 'Hassan'),
    ('Rachel', 'Goldstein'), ('Daniel', 'Brooks'), ('Maria', 'Vasquez'), ('David', 'Nakamura'),
    ('Lisa', 'Okonkwo'), ('James', 'Sullivan'), ('Priya', 'Mehta'), ('Robert', 'Johansson'),
    ('Emily', 'Chang'), ('Omar', 'Khalil'), ('Ana', 'Costa'), ('Thomas', 'Wagner'),
    ('Fatima', 'Nouri'), ('Kevin', 'Park'), ('Grace', 'Adeyemi'), ('Benjamin', 'Foster'),
    ('Mei', 'Zhang'), ('Carlos', 'Reyes'), ('Ingrid', 'Larsen'), ('Samuel', 'Osei'),
    ('Diana', 'Popov'), ('Patrick', 'Flynn'), ('Yuki', 'Tanaka'), ('Alexander', 'Petrov'),
    ('Amara', 'Diallo'), ('Henrik', 'Berg'),
]

out.append("\n-- Providers (30)")
prov_rows = []
for i in range(1, 31):
    fn, ln = dr_names[i-1]
    spec = specialties[i-1]
    dept = dept_map[spec]
    npi = str(1234567890 + (i-1))
    email = f"dr.{ln.lower()}@hospital.org"
    active = 'true' if i <= 27 else 'false'
    prov_rows.append((i, npi, fn, ln, spec, dept, email, active))

vals = []
for r in prov_rows:
    vals.append(f"('{uid('20000000', r[0])}', '{r[1]}', '{esc(r[2])}', '{esc(r[3])}', '{r[4]}', '{r[5]}', '{r[6]}', {r[7]})")
out.append(f"INSERT INTO providers (id, npi, first_name, last_name, specialty, department, email, active) VALUES\n" + ",\n".join(vals) + ";")

# Encounters (400)
enc_type_dist = ['office_visit']*200 + ['telehealth']*80 + ['emergency']*60 + ['procedure']*40 + ['follow_up']*20
enc_stat_dist = ['completed']*260 + ['scheduled']*60 + ['cancelled']*40 + ['no_show']*40

complaints = [
    'Annual physical exam', 'Chest tightness and shortness of breath', 'Persistent headache',
    'Numbness in left hand', 'Sore throat and fever', 'Follow-up for hypertension',
    'Knee pain after exercise', 'Severe abdominal pain', 'Anxiety and sleep difficulties',
    'Irregular heartbeat', 'Well-child visit', 'Lower back pain radiating to leg',
    'Diabetes management follow-up', 'Laceration on forearm', 'Recurring migraines',
    'Cough lasting more than 2 weeks', 'Skin rash and itching', 'Joint pain and stiffness',
    'Difficulty breathing during exercise', 'Urinary tract symptoms',
    'Routine blood work review', 'Dizziness and lightheadedness', 'Ear pain and hearing changes',
    'Follow-up after surgery', 'Depression screening', 'Weight management consultation',
    'Allergic reaction', 'Eye irritation and redness', 'Foot pain and swelling',
    'High cholesterol follow-up', 'Prenatal check-up', 'Immunization visit',
    'Chronic fatigue', 'Stomach pain and nausea', 'Shoulder pain',
    'Blood pressure monitoring', 'Asthma management', 'Thyroid follow-up',
    'Sports injury evaluation', 'Medication refill and review',
    'Wound follow-up', 'Cognitive assessment', 'Insomnia evaluation',
    'Cardiac rehabilitation follow-up', 'Post-concussion evaluation',
    'Osteoporosis screening', 'COPD management', 'Anxiety follow-up',
    'Arthritis evaluation', 'Preventive screening',
]

notes_templates = [
    'Patient in stable condition. {plan}', 'Vitals within normal limits. {plan}',
    'Symptoms improving with current treatment. {plan}', 'New symptoms noted. {plan}',
    'Lab results reviewed with patient. {plan}', 'Physical exam unremarkable. {plan}',
]
plans = [
    'Continue current medication regimen.', 'Follow-up in 4 weeks.',
    'Ordered additional lab work.', 'Referral to specialist.',
    'Adjusted medication dosage.', 'Recommended lifestyle modifications.',
    'Scheduled follow-up imaging.', 'No changes to treatment plan.',
    'Prescribed new medication.', 'Physical therapy recommended.',
]

out.append("\n-- Encounters (400)")
enc_rows = []
completed_enc_ids = []
for i in range(1, 401):
    etype = enc_type_dist[i-1]
    estat = enc_stat_dist[i-1]
    pat_id = random.randint(1, 200)
    prov_id = random.randint(1, 30)
    complaint = complaints[(i-1) % len(complaints)]

    sched = random_date()
    if estat == 'completed':
        note = random.choice(notes_templates).format(plan=random.choice(plans))
        checkin = sched - timedelta(minutes=random.randint(2, 15))
        discharged = sched + timedelta(minutes=random.randint(20, 120))
        checkin_str = f"'{fmt_ts(checkin)}'"
        discharged_str = f"'{fmt_ts(discharged)}'"
        note_str = f"'{esc(note)}'"
        completed_enc_ids.append(i)
    elif estat == 'scheduled':
        checkin_str = "NULL"
        discharged_str = "NULL"
        note_str = "NULL"
    else:  # cancelled, no_show
        checkin_str = "NULL"
        discharged_str = "NULL"
        note_str = "NULL"

    enc_rows.append((i, uid('10000000', pat_id), uid('20000000', prov_id), etype, estat, complaint, note_str, fmt_ts(sched), checkin_str, discharged_str))

for bs in range(0, len(enc_rows), 50):
    batch = enc_rows[bs:bs+50]
    vals = []
    for r in batch:
        vals.append(f"('{uid('30000000', r[0])}', '{r[1]}', '{r[2]}', '{r[3]}', '{r[4]}', '{esc(r[5])}', {r[6]}, '{r[7]}', {r[8]}, {r[9]})")
    out.append(f"INSERT INTO encounters (id, patient_id, provider_id, encounter_type, status, chief_complaint, notes, scheduled_at, checked_in_at, discharged_at) VALUES\n" + ",\n".join(vals) + ";")

# Diagnoses (300) - only for completed encounters
icd_codes = [
    ('I10', 'Essential hypertension'), ('E11.9', 'Type 2 diabetes mellitus without complications'),
    ('J06.9', 'Acute upper respiratory infection'), ('M54.5', 'Low back pain'),
    ('F41.1', 'Generalized anxiety disorder'), ('R51.9', 'Headache, unspecified'),
    ('K21.0', 'Gastroesophageal reflux disease with esophagitis'), ('J45.909', 'Unspecified asthma, uncomplicated'),
    ('Z00.00', 'Encounter for general adult medical examination'), ('E78.5', 'Hyperlipidemia, unspecified'),
    ('M79.3', 'Panniculitis, unspecified'), ('R07.9', 'Chest pain, unspecified'),
    ('G43.909', 'Migraine, unspecified, not intractable'), ('E03.9', 'Hypothyroidism, unspecified'),
    ('J20.9', 'Acute bronchitis, unspecified'), ('N39.0', 'Urinary tract infection, site not specified'),
    ('M25.561', 'Pain in right knee'), ('K35.80', 'Unspecified acute appendicitis'),
    ('F32.9', 'Major depressive disorder, single episode, unspecified'), ('R00.1', 'Bradycardia, unspecified'),
    ('L30.9', 'Dermatitis, unspecified'), ('M54.31', 'Sciatica, right side'),
    ('E11.65', 'Type 2 diabetes mellitus with hyperglycemia'), ('J02.0', 'Streptococcal pharyngitis'),
    ('S51.801A', 'Laceration of right forearm, initial encounter'), ('G56.00', 'Carpal tunnel syndrome'),
    ('R10.9', 'Unspecified abdominal pain'), ('J44.1', 'Chronic obstructive pulmonary disease with acute exacerbation'),
    ('M17.11', 'Primary osteoarthritis, right knee'), ('F43.10', 'Post-traumatic stress disorder'),
    ('R42', 'Dizziness and giddiness'), ('E66.01', 'Morbid obesity due to excess calories'),
    ('Z23', 'Encounter for immunization'), ('R05.9', 'Cough, unspecified'),
    ('M62.830', 'Muscle spasm of back'), ('I25.10', 'Atherosclerotic heart disease'),
    ('G47.00', 'Insomnia, unspecified'), ('R73.03', 'Prediabetes'),
    ('M19.011', 'Primary osteoarthritis, right shoulder'), ('B34.9', 'Viral infection, unspecified'),
]

out.append("\n-- Diagnoses (300)")
diag_rows = []
for i in range(1, 301):
    enc_id = completed_enc_ids[(i-1) % len(completed_enc_ids)]
    code, desc = icd_codes[(i-1) % len(icd_codes)]
    dtype = 'primary' if i <= 225 else 'secondary'  # 75% primary
    enc_sched = enc_rows[enc_id-1][7]  # scheduled_at string
    diag_time = datetime.strptime(enc_sched, '%Y-%m-%d %H:%M:%S') + timedelta(minutes=random.randint(10, 45))
    diag_rows.append((i, uid('30000000', enc_id), code, desc, dtype, fmt_ts(diag_time)))

for bs in range(0, len(diag_rows), 50):
    batch = diag_rows[bs:bs+50]
    vals = []
    for r in batch:
        vals.append(f"('{uid('40000000', r[0])}', '{r[1]}', '{r[2]}', '{esc(r[3])}', '{r[4]}', '{r[5]}')")
    out.append(f"INSERT INTO diagnoses (id, encounter_id, icd_code, description, diagnosis_type, diagnosed_at) VALUES\n" + ",\n".join(vals) + ";")

# Billing (350)
cpt_data = [
    ('99213', 'Office visit, established patient, low complexity', 12000, 15000),
    ('99214', 'Office visit, established patient, moderate complexity', 18500, 25000),
    ('99215', 'Office visit, established patient, high complexity', 30000, 40000),
    ('99395', 'Preventive visit, 18-39 years', 22000, 28000),
    ('99396', 'Preventive visit, 40-64 years', 25000, 32000),
    ('99283', 'Emergency department visit, moderate severity', 45000, 65000),
    ('99285', 'Emergency department visit, high severity', 65000, 120000),
    ('99213', 'Telehealth visit, established, low complexity', 10000, 15000),
    ('99214', 'Telehealth visit, established, moderate complexity', 15000, 20000),
    ('73562', 'X-ray, knee, 3 views', 8000, 12000),
    ('93000', 'Electrocardiogram, 12-lead', 7500, 10000),
    ('74177', 'CT abdomen and pelvis with contrast', 30000, 45000),
    ('87880', 'Strep test, rapid antigen', 3500, 5500),
    ('36415', 'Venipuncture for lab work', 2000, 3500),
    ('90715', 'Tdap immunization', 5000, 8000),
]
bill_stat_dist = ['paid']*60 + ['pending']*25 + ['denied']*10 + ['appealing']*5

out.append("\n-- Billing (350)")
bill_rows = []
for i in range(1, 351):
    enc_id = completed_enc_ids[(i-1) % len(completed_enc_ids)]
    cpt = cpt_data[(i-1) % len(cpt_data)]
    code, desc, lo, hi = cpt
    amount = random.randint(lo, hi)
    bstat = bill_stat_dist[(i-1) % 100]

    # Check patient insurance
    pat_idx = int(enc_rows[enc_id-1][1].split('-')[-1]) - 1
    pat_ins = patient_rows[pat_idx][9]
    if pat_ins == 'Self-Pay':
        ins_covered = 0
    else:
        ins_pct = random.uniform(0.70, 0.90)
        ins_covered = int(amount * ins_pct)
    pat_resp = amount - ins_covered

    enc_sched = enc_rows[enc_id-1][7]
    billed = datetime.strptime(enc_sched, '%Y-%m-%d %H:%M:%S') + timedelta(hours=random.randint(1, 48))
    paid_str = "NULL"
    if bstat == 'paid':
        paid = billed + timedelta(days=random.randint(7, 45))
        paid_str = f"'{fmt_ts(paid)}'"

    bill_rows.append((i, uid('30000000', enc_id), code, desc, amount, ins_covered, pat_resp, bstat, fmt_ts(billed), paid_str))

for bs in range(0, len(bill_rows), 50):
    batch = bill_rows[bs:bs+50]
    vals = []
    for r in batch:
        vals.append(f"('{uid('50000000', r[0])}', '{r[1]}', '{r[2]}', '{esc(r[3])}', {r[4]}, {r[5]}, {r[6]}, '{r[7]}', '{r[8]}', {r[9]})")
    out.append(f"INSERT INTO billing (id, encounter_id, cpt_code, description, amount_cents, insurance_covered_cents, patient_responsibility_cents, status, billed_at, paid_at) VALUES\n" + ",\n".join(vals) + ";")

# Medications (250)
meds = [
    ('Lisinopril', '10 mg', 'Once daily', 'oral'), ('Metformin', '500 mg', 'Twice daily', 'oral'),
    ('Atorvastatin', '20 mg', 'Once daily at bedtime', 'oral'), ('Amlodipine', '5 mg', 'Once daily', 'oral'),
    ('Omeprazole', '20 mg', 'Once daily before breakfast', 'oral'), ('Amoxicillin', '500 mg', 'Three times daily', 'oral'),
    ('Ibuprofen', '400 mg', 'Every 6 hours as needed', 'oral'), ('Levothyroxine', '75 mcg', 'Once daily', 'oral'),
    ('Metoprolol', '25 mg', 'Twice daily', 'oral'), ('Albuterol', '90 mcg', 'Every 4-6 hours as needed', 'inhaled'),
    ('Sertraline', '50 mg', 'Once daily', 'oral'), ('Gabapentin', '300 mg', 'Three times daily', 'oral'),
    ('Losartan', '50 mg', 'Once daily', 'oral'), ('Hydrochlorothiazide', '25 mg', 'Once daily', 'oral'),
    ('Prednisone', '10 mg', 'Once daily for 7 days', 'oral'), ('Cetirizine', '10 mg', 'Once daily', 'oral'),
    ('Montelukast', '10 mg', 'Once daily at bedtime', 'oral'), ('Fluticasone', '50 mcg', 'Two sprays each nostril daily', 'inhaled'),
    ('Cephalexin', '500 mg', 'Four times daily', 'oral'), ('Acetaminophen', '500 mg', 'Every 6 hours as needed', 'oral'),
    ('Sumatriptan', '50 mg', 'As needed at onset of migraine', 'oral'), ('Topiramate', '25 mg', 'Once daily', 'oral'),
    ('Amitriptyline', '10 mg', 'Once daily at bedtime', 'oral'), ('Morphine Sulfate', '4 mg', 'Every 4 hours as needed', 'intravenous'),
    ('Cefazolin', '2 g', 'Pre-operative dose', 'intravenous'), ('Insulin Glargine', '20 units', 'Once daily at bedtime', 'subcutaneous'),
    ('Triamcinolone', '0.1%', 'Apply twice daily', 'topical'), ('Mupirocin', '2%', 'Apply three times daily', 'topical'),
    ('Ondansetron', '4 mg', 'Every 8 hours as needed', 'oral'), ('Melatonin', '3 mg', 'Once daily at bedtime', 'oral'),
]
med_stat_dist = ['active']*60 + ['completed']*30 + ['discontinued']*10

out.append("\n-- Medications (250)")
med_rows = []
for i in range(1, 251):
    enc_id = completed_enc_ids[(i-1) % len(completed_enc_ids)]
    med = meds[(i-1) % len(meds)]
    mstat = med_stat_dist[(i-1) % 100]
    enc_sched = enc_rows[enc_id-1][7]
    prescribed = datetime.strptime(enc_sched, '%Y-%m-%d %H:%M:%S') + timedelta(minutes=random.randint(15, 60))

    if mstat == 'completed':
        end = prescribed + timedelta(days=random.randint(7, 90))
        end_str = f"'{fmt_ts(end)}'"
    elif mstat == 'discontinued':
        end = prescribed + timedelta(days=random.randint(3, 30))
        end_str = f"'{fmt_ts(end)}'"
    else:
        end_str = "NULL"

    med_rows.append((i, uid('30000000', enc_id), med[0], med[1], med[2], med[3], fmt_ts(prescribed), end_str, mstat))

for bs in range(0, len(med_rows), 50):
    batch = med_rows[bs:bs+50]
    vals = []
    for r in batch:
        vals.append(f"('{uid('60000000', r[0])}', '{r[1]}', '{esc(r[2])}', '{r[3]}', '{r[4]}', '{r[5]}', '{r[6]}', {r[7]}, '{r[8]}')")
    out.append(f"INSERT INTO medications (id, encounter_id, medication_name, dosage, frequency, route, prescribed_at, end_date, status) VALUES\n" + ",\n".join(vals) + ";")

# Vitals (500)
out.append("\n-- Vitals (500)")
vital_rows = []
for i in range(1, 501):
    enc_id = completed_enc_ids[(i-1) % len(completed_enc_ids)]
    enc_sched = enc_rows[enc_id-1][7]
    recorded = datetime.strptime(enc_sched, '%Y-%m-%d %H:%M:%S') + timedelta(minutes=random.randint(0, 30))

    # Get patient age for realistic vitals
    systolic = random.randint(100, 160)
    diastolic = random.randint(60, 100)
    hr = random.randint(55, 110)
    temp = round(random.uniform(97.0, 99.5), 1)
    if random.random() < 0.08:  # some sick patients
        temp = round(random.uniform(100.0, 103.0), 1)
        hr = random.randint(85, 120)
    weight = round(random.uniform(100, 280), 1)
    if random.random() < 0.05:  # children
        weight = round(random.uniform(20, 80), 1)
    height = random.randint(58, 76)
    if weight < 80:  # children shorter
        height = random.randint(30, 55)

    vital_rows.append((i, uid('30000000', enc_id), systolic, diastolic, hr, temp, weight, height, fmt_ts(recorded)))

for bs in range(0, len(vital_rows), 50):
    batch = vital_rows[bs:bs+50]
    vals = []
    for r in batch:
        vals.append(f"('{uid('70000000', r[0])}', '{r[1]}', {r[2]}, {r[3]}, {r[4]}, {r[5]}, {r[6]}, {r[7]}, '{r[8]}')")
    out.append(f"INSERT INTO vitals (id, encounter_id, systolic_bp, diastolic_bp, heart_rate, temperature_f, weight_lbs, height_inches, recorded_at) VALUES\n" + ",\n".join(vals) + ";")

with open('/home/user/databox/apps/sandbox/public/data/healthcare.sql', 'w') as f:
    f.write('\n\n'.join(out) + '\n')
print("Generated healthcare.sql")
