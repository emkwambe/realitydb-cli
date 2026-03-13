import type { DomainTemplate } from '../types.js';

export const healthcareTemplate: DomainTemplate = {
  name: 'healthcare',
  version: '2.0',
  description: 'Healthcare system with patients, providers, encounters, diagnoses, billing, medications, and vitals',
  targetTables: ['patients', 'providers', 'encounters', 'diagnoses', 'billing', 'medications', 'vitals'],
  tableConfigs: new Map([
    ['patients', {
      tableName: 'patients',
      matchPattern: ['patients', '*patient*'],
      rowCountMultiplier: 1.0,
      columnOverrides: [
        {
          columnName: 'first_name',
          strategy: { kind: 'first_name' },
        },
        {
          columnName: 'last_name',
          strategy: { kind: 'last_name' },
        },
        {
          columnName: 'email',
          strategy: { kind: 'email' },
        },
        {
          columnName: 'phone',
          strategy: { kind: 'phone' },
        },
        {
          columnName: 'gender',
          strategy: {
            kind: 'enum',
            options: {
              values: ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'],
              weights: [0.48, 0.48, 0.02, 0.01, 0.01],
            },
          },
        },
        {
          columnName: 'blood_type',
          strategy: {
            kind: 'enum',
            options: {
              values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
              weights: [0.34, 0.06, 0.09, 0.02, 0.03, 0.01, 0.38, 0.07],
            },
          },
        },
        {
          columnName: 'insurance_provider',
          strategy: {
            kind: 'enum',
            options: {
              values: ['Blue Cross', 'Aetna', 'UnitedHealth', 'Cigna', 'Humana', 'Medicare', 'Medicaid', 'Self-Pay'],
              weights: [0.18, 0.15, 0.15, 0.12, 0.10, 0.12, 0.10, 0.08],
            },
          },
        },
        {
          columnName: 'mrn',
          strategy: { kind: 'text', options: { mode: 'short' } },
        },
        {
          columnName: 'date_of_birth',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
        {
          columnName: 'registered_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
      ],
    }],
    ['providers', {
      tableName: 'providers',
      matchPattern: ['providers', 'doctors', 'physicians', '*provider*'],
      rowCountMultiplier: 0.2,
      columnOverrides: [
        {
          columnName: 'first_name',
          strategy: { kind: 'first_name' },
        },
        {
          columnName: 'last_name',
          strategy: { kind: 'last_name' },
        },
        {
          columnName: 'email',
          strategy: { kind: 'email' },
        },
        {
          columnName: 'specialty',
          strategy: {
            kind: 'enum',
            options: {
              values: ['Family Medicine', 'Internal Medicine', 'Pediatrics', 'Cardiology', 'Orthopedics', 'Dermatology', 'Neurology', 'Psychiatry', 'Emergency Medicine', 'Radiology'],
              weights: [0.18, 0.15, 0.12, 0.10, 0.10, 0.08, 0.08, 0.07, 0.07, 0.05],
            },
          },
        },
        {
          columnName: 'department',
          strategy: {
            kind: 'enum',
            options: {
              values: ['Primary Care', 'Surgery', 'Emergency', 'Specialty', 'Diagnostics'],
              weights: [0.30, 0.20, 0.15, 0.25, 0.10],
            },
          },
        },
        {
          columnName: 'npi',
          strategy: { kind: 'text', options: { mode: 'short' } },
        },
        {
          columnName: 'active',
          strategy: { kind: 'boolean', options: { trueWeight: 0.92 } },
        },
      ],
    }],
    ['encounters', {
      tableName: 'encounters',
      matchPattern: ['encounters', 'visits', 'appointments', '*encounter*', '*visit*'],
      rowCountMultiplier: 2.0,
      columnOverrides: [
        {
          columnName: 'encounter_type',
          strategy: {
            kind: 'enum',
            options: {
              values: ['office_visit', 'emergency', 'telehealth', 'procedure', 'follow_up', 'annual_checkup'],
              weights: [0.35, 0.08, 0.15, 0.12, 0.18, 0.12],
            },
          },
        },
        {
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['completed', 'scheduled', 'in_progress', 'canceled', 'no_show'],
              weights: [0.55, 0.15, 0.10, 0.10, 0.10],
            },
          },
        },
        {
          columnName: 'chief_complaint',
          strategy: {
            kind: 'enum',
            options: {
              values: ['Headache', 'Back pain', 'Cough', 'Chest pain', 'Fatigue', 'Fever', 'Joint pain', 'Shortness of breath', 'Abdominal pain', 'Skin rash', 'Dizziness', 'Annual checkup'],
              weights: [0.10, 0.12, 0.10, 0.06, 0.08, 0.08, 0.09, 0.06, 0.08, 0.07, 0.06, 0.10],
            },
          },
        },
        {
          columnName: 'notes',
          strategy: { kind: 'text', options: { mode: 'medium' } },
        },
        {
          columnName: 'scheduled_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
        {
          columnName: 'checked_in_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
          description: 'Nullable — null for scheduled/canceled encounters',
        },
        {
          columnName: 'discharged_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
          description: 'Nullable — null for non-completed encounters',
        },
      ],
    }],
    ['diagnoses', {
      tableName: 'diagnoses',
      matchPattern: ['diagnoses', '*diagnosis*', '*diagnos*'],
      rowCountMultiplier: 2.5,
      columnOverrides: [
        {
          columnName: 'icd_code',
          strategy: {
            kind: 'enum',
            options: {
              values: ['J06.9', 'M54.5', 'I10', 'E11.9', 'J20.9', 'R51.9', 'M25.50', 'Z00.00', 'K21.0', 'L30.9', 'F41.1', 'E78.5'],
              weights: [0.10, 0.10, 0.12, 0.10, 0.08, 0.08, 0.08, 0.08, 0.07, 0.06, 0.07, 0.06],
            },
          },
        },
        {
          columnName: 'description',
          strategy: {
            kind: 'enum',
            options: {
              values: ['Acute upper respiratory infection', 'Low back pain', 'Essential hypertension', 'Type 2 diabetes', 'Acute bronchitis', 'Headache', 'Joint pain', 'General adult medical exam', 'Gastroesophageal reflux', 'Dermatitis', 'Generalized anxiety disorder', 'Hyperlipidemia'],
              weights: [0.10, 0.10, 0.12, 0.10, 0.08, 0.08, 0.08, 0.08, 0.07, 0.06, 0.07, 0.06],
            },
          },
        },
        {
          columnName: 'diagnosis_type',
          strategy: {
            kind: 'enum',
            options: {
              values: ['primary', 'secondary', 'admitting', 'working'],
              weights: [0.60, 0.25, 0.08, 0.07],
            },
          },
        },
        {
          columnName: 'diagnosed_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
      ],
    }],
    ['billing', {
      tableName: 'billing',
      matchPattern: ['billing', 'claims', '*claim*'],
      rowCountMultiplier: 2.0,
      columnOverrides: [
        {
          columnName: 'cpt_code',
          strategy: {
            kind: 'enum',
            options: {
              values: ['99213', '99214', '99215', '99203', '99204', '99281', '99282', '99283', '99395', '99396'],
              weights: [0.25, 0.20, 0.10, 0.10, 0.08, 0.05, 0.05, 0.05, 0.06, 0.06],
            },
          },
        },
        {
          columnName: 'description',
          strategy: {
            kind: 'enum',
            options: {
              values: ['Office visit - established, low', 'Office visit - established, moderate', 'Office visit - established, high', 'Office visit - new, low', 'Office visit - new, moderate', 'ED visit - low', 'ED visit - moderate', 'ED visit - high', 'Preventive visit 18-39', 'Preventive visit 40-64'],
              weights: [0.25, 0.20, 0.10, 0.10, 0.08, 0.05, 0.05, 0.05, 0.06, 0.06],
            },
          },
        },
        {
          columnName: 'amount_cents',
          strategy: { kind: 'money', options: { min: 5000, max: 150000 } },
        },
        {
          columnName: 'insurance_covered_cents',
          strategy: { kind: 'money', options: { min: 0, max: 120000 } },
        },
        {
          columnName: 'patient_responsibility_cents',
          strategy: { kind: 'money', options: { min: 0, max: 50000 } },
        },
        {
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['paid', 'pending', 'denied', 'appealed', 'partially_paid'],
              weights: [0.50, 0.20, 0.10, 0.05, 0.15],
            },
          },
        },
        {
          columnName: 'billed_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
        {
          columnName: 'paid_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
          description: 'Nullable — null for unpaid bills',
        },
      ],
    }],
    ['medications', {
      tableName: 'medications',
      matchPattern: ['medications', '*medic*', '*prescription*', '*rx*'],
      rowCountMultiplier: 2.5,
      columnOverrides: [
        {
          columnName: 'medication_name',
          strategy: {
            kind: 'enum',
            options: {
              values: ['Lisinopril', 'Metformin', 'Amlodipine', 'Omeprazole', 'Atorvastatin', 'Levothyroxine', 'Metoprolol', 'Albuterol', 'Gabapentin', 'Sertraline', 'Amoxicillin', 'Ibuprofen'],
              weights: [0.10, 0.10, 0.09, 0.09, 0.10, 0.08, 0.08, 0.08, 0.07, 0.07, 0.07, 0.07],
            },
          },
        },
        {
          columnName: 'dosage',
          strategy: {
            kind: 'enum',
            options: {
              values: ['5mg', '10mg', '20mg', '25mg', '40mg', '50mg', '100mg', '250mg', '500mg'],
            },
          },
        },
        {
          columnName: 'frequency',
          strategy: {
            kind: 'enum',
            options: {
              values: ['once daily', 'twice daily', 'three times daily', 'as needed', 'every 6 hours', 'at bedtime'],
              weights: [0.35, 0.25, 0.10, 0.15, 0.05, 0.10],
            },
          },
        },
        {
          columnName: 'route',
          strategy: {
            kind: 'enum',
            options: {
              values: ['oral', 'topical', 'injection', 'inhaled', 'sublingual'],
              weights: [0.75, 0.08, 0.07, 0.06, 0.04],
            },
          },
        },
        {
          columnName: 'prescribed_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
        {
          columnName: 'end_date',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
          description: 'Nullable — null for ongoing medications',
        },
        {
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['active', 'discontinued', 'completed'],
              weights: [0.65, 0.20, 0.15],
            },
          },
        },
      ],
    }],
    ['vitals', {
      tableName: 'vitals',
      matchPattern: ['vitals', '*vital*', '*measurement*'],
      rowCountMultiplier: 3.0,
      columnOverrides: [
        {
          columnName: 'systolic_bp',
          strategy: { kind: 'integer', options: { min: 90, max: 180 } },
        },
        {
          columnName: 'diastolic_bp',
          strategy: { kind: 'integer', options: { min: 55, max: 110 } },
        },
        {
          columnName: 'heart_rate',
          strategy: { kind: 'integer', options: { min: 50, max: 120 } },
        },
        {
          columnName: 'temperature_f',
          strategy: { kind: 'float', options: { min: 96.0, max: 103.0 } },
        },
        {
          columnName: 'weight_lbs',
          strategy: { kind: 'float', options: { min: 100, max: 350 } },
        },
        {
          columnName: 'height_inches',
          strategy: { kind: 'integer', options: { min: 55, max: 78 } },
        },
        {
          columnName: 'recorded_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
      ],
    }],
  ]),
};
