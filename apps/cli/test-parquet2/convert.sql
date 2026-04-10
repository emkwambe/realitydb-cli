-- RealityDB → Parquet Conversion
-- Install DuckDB: https://duckdb.org/docs/installation
-- Run: duckdb < convert.sql

COPY (SELECT * FROM read_csv_auto('patients.csv', header=true)) TO 'patients.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('diagnoses.csv', header=true)) TO 'diagnoses.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('genomics.csv', header=true)) TO 'genomics.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('treatments.csv', header=true)) TO 'treatments.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('treatment_cycles.csv', header=true)) TO 'treatment_cycles.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('imaging_results.csv', header=true)) TO 'imaging_results.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('lab_results.csv', header=true)) TO 'lab_results.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('adverse_events.csv', header=true)) TO 'adverse_events.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('progression_events.csv', header=true)) TO 'progression_events.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('outcomes.csv', header=true)) TO 'outcomes.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('biomarkers.csv', header=true)) TO 'biomarkers.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('vital_signs.csv', header=true)) TO 'vital_signs.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('concomitant_medications.csv', header=true)) TO 'concomitant_medications.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('sites.csv', header=true)) TO 'sites.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('clinical_trials.csv', header=true)) TO 'clinical_trials.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('enrollments.csv', header=true)) TO 'enrollments.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('consent_records.csv', header=true)) TO 'consent_records.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('regulatory_submissions.csv', header=true)) TO 'regulatory_submissions.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('audit_logs.csv', header=true)) TO 'audit_logs.parquet' (FORMAT PARQUET);
COPY (SELECT * FROM read_csv_auto('site_monitoring.csv', header=true)) TO 'site_monitoring.parquet' (FORMAT PARQUET);

-- After conversion, delete CSV files:
-- DELETE: patients.csv
-- DELETE: diagnoses.csv
-- DELETE: genomics.csv
-- DELETE: treatments.csv
-- DELETE: treatment_cycles.csv
-- DELETE: imaging_results.csv
-- DELETE: lab_results.csv
-- DELETE: adverse_events.csv
-- DELETE: progression_events.csv
-- DELETE: outcomes.csv
-- DELETE: biomarkers.csv
-- DELETE: vital_signs.csv
-- DELETE: concomitant_medications.csv
-- DELETE: sites.csv
-- DELETE: clinical_trials.csv
-- DELETE: enrollments.csv
-- DELETE: consent_records.csv
-- DELETE: regulatory_submissions.csv
-- DELETE: audit_logs.csv
-- DELETE: site_monitoring.csv