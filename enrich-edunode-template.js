// EduNode Analytics — Domain Enrichment Overrides
// Apply these to the auto-generated edunode-template.json
// This transforms 30% low-confidence fields into domain-accurate distributions

const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, 'edunode-template.json');
const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

// Update metadata
template.name = 'edunode-analytics';
template.description = 'EduNode Analytics MTSS Early Warning System — domain-enriched template for K-12 charter schools';
template.version = '2.0';

// ═══════════════════════════════════════
// AUTHORIZERS
// ═══════════════════════════════════════
const authorizers = template.tables.authorizers.columns;
authorizers.name = {
  strategy: 'enum',
  options: {
    values: ['NC DPI', 'CSAB - Charlotte', 'CSAB - Raleigh', 'OCS - Office of Charter Schools', 'State Board of Education', 'Innovative School District', 'UNC System Charter Board', 'KIPP Foundation'],
    weights: [0.20, 0.15, 0.12, 0.15, 0.10, 0.08, 0.10, 0.10]
  }
};
authorizers.is_active = { strategy: 'boolean', options: { trueWeight: 0.85 } };

// ═══════════════════════════════════════
// SCHOOLS
// ═══════════════════════════════════════
const schools = template.tables.schools.columns;
schools.name = {
  strategy: 'enum',
  options: {
    values: ['Union Day School', 'Cornerstone Charter Academy', 'KIPP Charlotte', 'Sugar Creek Charter', 'Queen City STEM', 'Piedmont Community Charter', 'Lake Norman Charter', 'Commonwealth High', 'Charlotte Lab School', 'Socrates Academy', 'Thomas Jefferson Classical', 'Research Triangle High', 'Endeavor Charter', 'Pine Lake Prep', 'Lincoln Charter'],
    weights: [0.08, 0.07, 0.07, 0.07, 0.07, 0.07, 0.07, 0.07, 0.07, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06]
  }
};
schools.legal_name = { strategy: 'company_name' };
schools.domain = { strategy: 'text', options: { mode: 'short' } };
schools.primary_color = {
  strategy: 'enum',
  options: {
    values: ['#1a365d', '#2d3748', '#1e40af', '#065f46', '#7c2d12', '#4c1d95', '#831843', '#115e59'],
    weights: [0.15, 0.15, 0.12, 0.12, 0.12, 0.12, 0.11, 0.11]
  }
};
schools.secondary_color = {
  strategy: 'enum',
  options: {
    values: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'],
    weights: [0.15, 0.15, 0.12, 0.12, 0.12, 0.12, 0.11, 0.11]
  }
};
schools.accent_color = {
  strategy: 'enum',
  options: {
    values: ['#fbbf24', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#f472b6', '#22d3ee', '#fb923c'],
    weights: [0.15, 0.15, 0.12, 0.12, 0.12, 0.12, 0.11, 0.11]
  }
};
schools.subscription_tier = {
  strategy: 'enum',
  options: {
    values: ['free', 'starter', 'professional', 'enterprise'],
    weights: [0.15, 0.35, 0.35, 0.15]
  }
};
schools.subscription_status = {
  strategy: 'enum',
  options: {
    values: ['active', 'trialing', 'past_due', 'canceled', 'paused'],
    weights: [0.55, 0.15, 0.10, 0.12, 0.08]
  }
};
schools.timezone = {
  strategy: 'enum',
  options: {
    values: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix'],
    weights: [0.40, 0.25, 0.12, 0.15, 0.08]
  }
};
schools.academic_year_start_month = {
  strategy: 'enum',
  options: {
    values: [7, 8, 9],
    weights: [0.15, 0.60, 0.25]
  }
};
schools.student_count = { strategy: 'integer', options: { min: 80, max: 1200 } };
schools.is_active = { strategy: 'boolean', options: { trueWeight: 0.85 } };
schools.bigquery_dataset_id = { strategy: 'text', options: { mode: 'short' } };
schools.clever_district_id = { strategy: 'text', options: { mode: 'short' } };
schools.classlink_tenant_id = { strategy: 'text', options: { mode: 'short' } };
schools.stripe_customer_id = { strategy: 'text', options: { mode: 'short' } };
schools.stripe_subscription_id = { strategy: 'text', options: { mode: 'short' } };

// ═══════════════════════════════════════
// STUDENTS (the most critical table)
// ═══════════════════════════════════════
const students = template.tables.students.columns;
students.sis_student_id = {
  strategy: 'custom',
  options: { name: 'sequential', prefix: 'STU-', padLength: 6 }
};
students.grade_level = {
  strategy: 'enum',
  options: {
    values: ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    weights: [0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.07, 0.07, 0.07, 0.07]
  }
};
students.gender = {
  strategy: 'enum',
  options: {
    values: ['Male', 'Female', 'Non-binary'],
    weights: [0.49, 0.49, 0.02]
  }
};
students.ethnicity = {
  strategy: 'enum',
  options: {
    values: ['Black or African American', 'White', 'Hispanic or Latino', 'Asian', 'Two or More Races', 'American Indian', 'Pacific Islander'],
    weights: [0.35, 0.28, 0.18, 0.06, 0.08, 0.03, 0.02]
  }
};
students.has_iep = { strategy: 'boolean', options: { trueWeight: 0.14 } };
students.has_504_plan = { strategy: 'boolean', options: { trueWeight: 0.06 } };
students.is_english_learner = { strategy: 'boolean', options: { trueWeight: 0.10 } };
students.is_gifted = { strategy: 'boolean', options: { trueWeight: 0.08 } };
students.is_free_reduced_lunch = { strategy: 'boolean', options: { trueWeight: 0.52 } };
students.homeroom_teacher = { strategy: 'full_name' };
students.counselor = { strategy: 'full_name' };
students.attendance_rate = { strategy: 'float', options: { min: 45.0, max: 100.0 } };
students.days_present = { strategy: 'integer', options: { min: 80, max: 180 } };
students.days_absent = { strategy: 'integer', options: { min: 0, max: 60 } };
students.is_chronically_absent = { strategy: 'boolean', options: { trueWeight: 0.16 } };
students.proficiency_level = {
  strategy: 'enum',
  options: {
    values: ['Level 1 - Not Proficient', 'Level 2 - Not Proficient', 'Level 3 - Proficient', 'Level 4 - Proficient', 'Level 5 - Superior'],
    weights: [0.12, 0.22, 0.35, 0.22, 0.09]
  }
};
students.risk_level = {
  strategy: 'enum',
  options: {
    values: ['on_track', 'watch', 'at_risk', 'critical'],
    weights: [0.45, 0.25, 0.20, 0.10]
  }
};
students.risk_score = { strategy: 'float', options: { min: 0.0, max: 5.0 } };
students.risk_factors = { strategy: 'text', options: { mode: 'short' } };
students.reading_scores = { strategy: 'float', options: { min: 100, max: 800 } };
students.math_scores = { strategy: 'float', options: { min: 100, max: 800 } };
students.is_active = { strategy: 'boolean', options: { trueWeight: 0.88 } };

// ═══════════════════════════════════════
// USERS
// ═══════════════════════════════════════
const users = template.tables.users.columns;
users.clerk_user_id = {
  strategy: 'custom',
  options: { name: 'sequential', prefix: 'user_', padLength: 8 }
};
users.platform_role = {
  strategy: 'enum',
  options: {
    values: ['super_admin', 'school_admin', 'teacher', 'counselor', 'specialist', 'viewer'],
    weights: [0.03, 0.10, 0.50, 0.15, 0.12, 0.10]
  }
};
users.is_active = { strategy: 'boolean', options: { trueWeight: 0.90 } };

// ═══════════════════════════════════════
// SCHOOL MEMBERSHIPS
// ═══════════════════════════════════════
const memberships = template.tables.school_memberships.columns;
memberships.role = {
  strategy: 'enum',
  options: {
    values: ['admin', 'teacher', 'counselor', 'interventionist', 'data_coach', 'viewer'],
    weights: [0.10, 0.45, 0.15, 0.12, 0.08, 0.10]
  }
};
memberships.department = {
  strategy: 'enum',
  options: {
    values: ['Math', 'ELA', 'Science', 'Social Studies', 'Special Education', 'Counseling', 'Administration', 'Electives', 'PE/Health'],
    weights: [0.16, 0.16, 0.12, 0.12, 0.10, 0.10, 0.08, 0.08, 0.08]
  }
};
memberships.grade_levels = {
  strategy: 'enum',
  options: {
    values: ['K-2', '3-5', '6-8', '9-12', 'K-5', '6-12', 'K-12'],
    weights: [0.15, 0.15, 0.20, 0.20, 0.10, 0.10, 0.10]
  }
};
memberships.sis_staff_id = {
  strategy: 'custom',
  options: { name: 'sequential', prefix: 'STAFF-', padLength: 5 }
};
memberships.is_active = { strategy: 'boolean', options: { trueWeight: 0.88 } };

// ═══════════════════════════════════════
// INTERVENTIONS (MTSS core)
// ═══════════════════════════════════════
const interventions = template.tables.interventions.columns;
interventions.type = {
  strategy: 'enum',
  options: {
    values: ['academic', 'behavioral', 'attendance', 'social_emotional', 'speech_language', 'occupational_therapy'],
    weights: [0.30, 0.25, 0.18, 0.15, 0.07, 0.05]
  }
};
interventions.title = {
  strategy: 'enum',
  options: {
    values: ['Reading Fluency Support', 'Math Fact Mastery', 'Behavior Check-In/Check-Out', 'Attendance Mentoring', 'Social Skills Group', 'Phonics Intervention', 'Written Expression Support', 'Self-Regulation Coaching', 'Peer Tutoring - Math', 'Guided Reading Small Group', 'Anger Management Skills', 'Homework Completion Plan', 'Counselor Check-Ins', 'Number Sense Intervention', 'Restorative Circles'],
    weights: [0.10, 0.09, 0.09, 0.08, 0.08, 0.07, 0.06, 0.06, 0.06, 0.06, 0.05, 0.05, 0.05, 0.05, 0.05]
  }
};
interventions.status = {
  strategy: 'enum',
  options: {
    values: ['active', 'completed', 'paused', 'discontinued', 'scheduled'],
    weights: [0.40, 0.25, 0.10, 0.10, 0.15]
  }
};
interventions.priority = {
  strategy: 'enum',
  options: {
    values: ['low', 'medium', 'high', 'critical'],
    weights: [0.15, 0.40, 0.30, 0.15]
  }
};
interventions.baseline_value = { strategy: 'float', options: { min: 0, max: 100 } };
interventions.target_value = { strategy: 'float', options: { min: 30, max: 100 } };
interventions.current_value = { strategy: 'float', options: { min: 0, max: 100 } };
interventions.was_successful = { strategy: 'boolean', options: { trueWeight: 0.45 } };
interventions.is_stale = { strategy: 'boolean', options: { trueWeight: 0.12 } };

// ═══════════════════════════════════════
// INTERVENTION SESSIONS
// ═══════════════════════════════════════
const sessions = template.tables.intervention_sessions.columns;
sessions.scheduled_duration_minutes = { strategy: 'enum', options: { values: [15, 20, 25, 30, 45, 60], weights: [0.10, 0.20, 0.15, 0.30, 0.15, 0.10] } };
sessions.actual_duration_minutes = { strategy: 'enum', options: { values: [10, 15, 20, 25, 30, 45, 60], weights: [0.05, 0.12, 0.18, 0.15, 0.30, 0.12, 0.08] } };
sessions.status = {
  strategy: 'enum',
  options: {
    values: ['completed', 'partial', 'cancelled', 'no_show', 'scheduled', 'in_progress'],
    weights: [0.55, 0.10, 0.08, 0.07, 0.15, 0.05]
  }
};
sessions.cancellation_reason = {
  strategy: 'enum',
  options: {
    values: ['student_absent', 'teacher_absent', 'schedule_conflict', 'testing_day', 'field_trip', 'behavior_incident', 'early_dismissal', null],
    weights: [0.25, 0.10, 0.15, 0.12, 0.08, 0.10, 0.05, 0.15]
  }
};
sessions.location = {
  strategy: 'enum',
  options: {
    values: ['Classroom', 'Resource Room', 'Media Center', 'Counselor Office', 'Hallway Pull-Out', 'Computer Lab', 'Small Group Room'],
    weights: [0.30, 0.20, 0.10, 0.12, 0.10, 0.08, 0.10]
  }
};
sessions.modality = {
  strategy: 'enum',
  options: {
    values: ['individual', 'small_group', 'whole_class', 'virtual', 'hybrid'],
    weights: [0.30, 0.40, 0.10, 0.12, 0.08]
  }
};
sessions.group_size = { strategy: 'integer', options: { min: 1, max: 8 } };
sessions.fidelity_score = { strategy: 'float', options: { min: 1.0, max: 5.0 } };
sessions.student_engaged = { strategy: 'boolean', options: { trueWeight: 0.72 } };
sessions.parent_communication = { strategy: 'boolean', options: { trueWeight: 0.25 } };
sessions.scheduled_start_time = {
  strategy: 'enum',
  options: {
    values: ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:30', '13:00', '13:30', '14:00', '14:30'],
    weights: [0.08, 0.10, 0.10, 0.10, 0.10, 0.08, 0.08, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06]
  }
};
sessions.actual_start_time = sessions.scheduled_start_time;

// ═══════════════════════════════════════
// INTERVENTION DOSAGE METRICS
// ═══════════════════════════════════════
const dosage = template.tables.intervention_dosage_metrics.columns;
dosage.planned_sessions_per_week = { strategy: 'enum', options: { values: [1, 2, 3, 4, 5], weights: [0.10, 0.25, 0.35, 0.20, 0.10] } };
dosage.planned_minutes_per_session = { strategy: 'enum', options: { values: [15, 20, 25, 30, 45], weights: [0.10, 0.20, 0.15, 0.35, 0.20] } };
dosage.planned_total_weeks = { strategy: 'integer', options: { min: 4, max: 36 } };
dosage.planned_total_sessions = { strategy: 'integer', options: { min: 8, max: 180 } };
dosage.planned_total_minutes = { strategy: 'integer', options: { min: 200, max: 5400 } };
dosage.actual_sessions_completed = { strategy: 'integer', options: { min: 0, max: 150 } };
dosage.actual_sessions_partial = { strategy: 'integer', options: { min: 0, max: 20 } };
dosage.actual_sessions_cancelled = { strategy: 'integer', options: { min: 0, max: 25 } };
dosage.actual_sessions_no_show = { strategy: 'integer', options: { min: 0, max: 15 } };
dosage.actual_total_minutes = { strategy: 'integer', options: { min: 0, max: 4500 } };
dosage.weeks_elapsed = { strategy: 'integer', options: { min: 0, max: 36 } };
dosage.sessions_behind_schedule = { strategy: 'integer', options: { min: 0, max: 20 } };
dosage.minutes_behind_schedule = { strategy: 'integer', options: { min: 0, max: 600 } };
dosage.on_track = { strategy: 'boolean', options: { trueWeight: 0.60 } };
dosage.dosage_status = {
  strategy: 'enum',
  options: {
    values: ['on_track', 'behind', 'ahead', 'critical', 'not_started'],
    weights: [0.45, 0.25, 0.10, 0.10, 0.10]
  }
};
dosage.fidelity_trend = {
  strategy: 'enum',
  options: {
    values: ['improving', 'stable', 'declining'],
    weights: [0.30, 0.45, 0.25]
  }
};

// ═══════════════════════════════════════
// RISK EVALUATIONS
// ═══════════════════════════════════════
const riskEval = template.tables.risk_evaluations.columns;
riskEval.risk_level = {
  strategy: 'enum',
  options: {
    values: ['on_track', 'watch', 'at_risk', 'critical'],
    weights: [0.40, 0.25, 0.22, 0.13]
  }
};
riskEval.previous_level = {
  strategy: 'enum',
  options: {
    values: ['on_track', 'watch', 'at_risk', 'critical'],
    weights: [0.42, 0.26, 0.20, 0.12]
  }
};
riskEval.level_changed = { strategy: 'boolean', options: { trueWeight: 0.20 } };
riskEval.trajectory = {
  strategy: 'enum',
  options: {
    values: ['improving', 'stable', 'declining', 'volatile'],
    weights: [0.25, 0.35, 0.30, 0.10]
  }
};
riskEval.confidence_level = {
  strategy: 'enum',
  options: {
    values: ['high', 'medium', 'low'],
    weights: [0.35, 0.45, 0.20]
  }
};
riskEval.trigger_type = {
  strategy: 'enum',
  options: {
    values: ['scheduled', 'threshold_breach', 'manual', 'data_sync', 'intervention_review'],
    weights: [0.35, 0.25, 0.15, 0.15, 0.10]
  }
};

// ═══════════════════════════════════════
// RISK ALERTS
// ═══════════════════════════════════════
const riskAlerts = template.tables.risk_alerts.columns;
riskAlerts.alert_type = {
  strategy: 'enum',
  options: {
    values: ['attendance_drop', 'grade_decline', 'behavior_spike', 'chronic_absence', 'assessment_below', 'risk_level_change', 'intervention_stale', 'missing_data'],
    weights: [0.18, 0.15, 0.12, 0.12, 0.12, 0.12, 0.10, 0.09]
  }
};
riskAlerts.severity = {
  strategy: 'enum',
  options: {
    values: ['info', 'warning', 'critical', 'urgent'],
    weights: [0.20, 0.40, 0.25, 0.15]
  }
};
riskAlerts.risk_level = riskEval.risk_level;
riskAlerts.status = {
  strategy: 'enum',
  options: {
    values: ['active', 'acknowledged', 'resolved', 'dismissed', 'expired'],
    weights: [0.30, 0.20, 0.25, 0.15, 0.10]
  }
};
riskAlerts.risk_score = { strategy: 'float', options: { min: 0.0, max: 5.0 } };

// ═══════════════════════════════════════
// RISK MODEL CONFIGS
// ═══════════════════════════════════════
const riskConfig = template.tables.risk_model_configs.columns;
riskConfig.name = {
  strategy: 'enum',
  options: {
    values: ['Default MTSS Model', 'Attendance-Weighted', 'Academic Focus', 'Behavior-Sensitive', 'Balanced Composite', 'Elementary Model', 'Middle School Model', 'High School Model'],
    weights: [0.20, 0.12, 0.12, 0.12, 0.12, 0.12, 0.10, 0.10]
  }
};
riskConfig.weight_attendance = { strategy: 'float', options: { min: 0.10, max: 0.40 } };
riskConfig.weight_academic = { strategy: 'float', options: { min: 0.15, max: 0.40 } };
riskConfig.weight_assignments = { strategy: 'float', options: { min: 0.05, max: 0.25 } };
riskConfig.weight_behavior = { strategy: 'float', options: { min: 0.05, max: 0.25 } };
riskConfig.weight_trend = { strategy: 'float', options: { min: 0.05, max: 0.20 } };
riskConfig.threshold_on_track = { strategy: 'float', options: { min: 0.0, max: 1.5 } };
riskConfig.threshold_watch = { strategy: 'float', options: { min: 1.5, max: 2.5 } };
riskConfig.threshold_at_risk = { strategy: 'float', options: { min: 2.5, max: 3.5 } };
riskConfig.attendance_floor = { strategy: 'float', options: { min: 85, max: 95 } };
riskConfig.attendance_critical = { strategy: 'float', options: { min: 70, max: 85 } };
riskConfig.assignment_missing_warn = { strategy: 'float', options: { min: 0.15, max: 0.35 } };
riskConfig.behavior_incident_cap = { strategy: 'integer', options: { min: 3, max: 10 } };
riskConfig.trend_lookback_weeks = { strategy: 'enum', options: { values: [4, 6, 8, 12], weights: [0.20, 0.35, 0.30, 0.15] } };
riskConfig.trend_decline_threshold = { strategy: 'float', options: { min: 0.05, max: 0.20 } };
riskConfig.is_active = { strategy: 'boolean', options: { trueWeight: 0.70 } };

// ═══════════════════════════════════════
// STUDENT METRICS
// ═══════════════════════════════════════
const metrics = template.tables.student_metrics.columns;
metrics.attendance_trend = { strategy: 'float', options: { min: -15, max: 15 } };
metrics.days_absent_last_30 = { strategy: 'integer', options: { min: 0, max: 15 } };
metrics.chronic_absence_flag = { strategy: 'boolean', options: { trueWeight: 0.16 } };
metrics.gpa_current = { strategy: 'float', options: { min: 0.0, max: 4.0 } };
metrics.gpa_trend = { strategy: 'float', options: { min: -1.0, max: 1.0 } };
metrics.assessment_trend = { strategy: 'float', options: { min: -20, max: 20 } };
metrics.proficiency_level = students.proficiency_level;
metrics.missing_assignments_count = { strategy: 'integer', options: { min: 0, max: 25 } };
metrics.total_assignments_count = { strategy: 'integer', options: { min: 10, max: 120 } };
metrics.assignment_trend = { strategy: 'float', options: { min: -10, max: 10 } };
metrics.behavior_incident_count = { strategy: 'integer', options: { min: 0, max: 15 } };
metrics.behavior_incident_trend = { strategy: 'float', options: { min: -5, max: 5 } };
metrics.suspensions_count = { strategy: 'integer', options: { min: 0, max: 5 } };
metrics.data_completeness = { strategy: 'float', options: { min: 0.40, max: 1.0 } };

// ═══════════════════════════════════════
// STUDENT METRIC HISTORY
// ═══════════════════════════════════════
const history = template.tables.student_metric_history.columns;
history.snapshot_week = { strategy: 'integer', options: { min: 1, max: 52 } };
history.snapshot_year = { strategy: 'enum', options: { values: [2023, 2024, 2025, 2026], weights: [0.15, 0.30, 0.35, 0.20] } };
history.gpa_current = { strategy: 'float', options: { min: 0.0, max: 4.0 } };
history.behavior_incident_count = { strategy: 'integer', options: { min: 0, max: 10 } };
history.proficiency_level = students.proficiency_level;

// ═══════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════
const notifications = template.tables.notifications.columns;
notifications.type = {
  strategy: 'enum',
  options: {
    values: ['risk_alert', 'intervention_update', 'attendance_warning', 'assessment_result', 'system_update', 'report_ready', 'data_sync_complete', 'intervention_due'],
    weights: [0.18, 0.15, 0.15, 0.12, 0.10, 0.10, 0.10, 0.10]
  }
};
notifications.priority = {
  strategy: 'enum',
  options: {
    values: ['low', 'medium', 'high', 'urgent'],
    weights: [0.20, 0.40, 0.25, 0.15]
  }
};
notifications.is_read = { strategy: 'boolean', options: { trueWeight: 0.65 } };
notifications.is_dismissed = { strategy: 'boolean', options: { trueWeight: 0.30 } };

// ═══════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════
const payments = template.tables.payments.columns;
payments.status = {
  strategy: 'enum',
  options: {
    values: ['paid', 'pending', 'failed', 'refunded', 'void'],
    weights: [0.70, 0.10, 0.08, 0.07, 0.05]
  }
};
payments.subscription_tier = schools.subscription_tier;
payments.student_count = schools.student_count;
payments.stripe_invoice_id = { strategy: 'text', options: { mode: 'short' } };
payments.stripe_subscription_id = { strategy: 'text', options: { mode: 'short' } };
payments.stripe_payment_intent_id = { strategy: 'text', options: { mode: 'short' } };
payments.stripe_charge_id = { strategy: 'text', options: { mode: 'short' } };
payments.invoice_number = {
  strategy: 'custom',
  options: { name: 'sequential', prefix: 'INV-', padLength: 6 }
};

// ═══════════════════════════════════════
// DATA SOURCES
// ═══════════════════════════════════════
const dataSources = template.tables.data_sources.columns;
dataSources.name = {
  strategy: 'enum',
  options: {
    values: ['PowerSchool SIS', 'Clever Sync', 'ClassLink Roster', 'Google Classroom', 'Canvas LMS', 'iReady Assessments', 'NWEA MAP', 'Renaissance Star', 'Infinite Campus', 'Skyward SIS'],
    weights: [0.18, 0.14, 0.10, 0.12, 0.10, 0.10, 0.08, 0.06, 0.06, 0.06]
  }
};
dataSources.type = {
  strategy: 'enum',
  options: {
    values: ['sis', 'lms', 'assessment', 'roster_sync', 'behavior', 'custom_csv'],
    weights: [0.25, 0.20, 0.20, 0.15, 0.10, 0.10]
  }
};
dataSources.provider = {
  strategy: 'enum',
  options: {
    values: ['clever', 'classlink', 'google', 'canvas', 'powerschool', 'custom'],
    weights: [0.25, 0.15, 0.15, 0.12, 0.18, 0.15]
  }
};
dataSources.sync_status = {
  strategy: 'enum',
  options: {
    values: ['active', 'syncing', 'error', 'paused', 'disconnected'],
    weights: [0.55, 0.10, 0.10, 0.12, 0.13]
  }
};
dataSources.sync_frequency_hours = { strategy: 'enum', options: { values: [1, 4, 6, 12, 24], weights: [0.10, 0.15, 0.25, 0.30, 0.20] } };
dataSources.records_synced = { strategy: 'integer', options: { min: 0, max: 5000 } };
dataSources.last_record_count = { strategy: 'integer', options: { min: 0, max: 2000 } };
dataSources.sync_enabled = { strategy: 'boolean', options: { trueWeight: 0.75 } };
dataSources.is_active = { strategy: 'boolean', options: { trueWeight: 0.70 } };

// ═══════════════════════════════════════
// SYNC HISTORY
// ═══════════════════════════════════════
const syncHist = template.tables.sync_history.columns;
syncHist.sync_type = {
  strategy: 'enum',
  options: {
    values: ['full', 'incremental', 'manual', 'retry'],
    weights: [0.20, 0.50, 0.15, 0.15]
  }
};
syncHist.status = {
  strategy: 'enum',
  options: {
    values: ['completed', 'failed', 'partial', 'running', 'cancelled'],
    weights: [0.65, 0.12, 0.08, 0.08, 0.07]
  }
};
syncHist.records_processed = { strategy: 'integer', options: { min: 0, max: 5000 } };
syncHist.records_created = { strategy: 'integer', options: { min: 0, max: 500 } };
syncHist.records_updated = { strategy: 'integer', options: { min: 0, max: 2000 } };
syncHist.records_deleted = { strategy: 'integer', options: { min: 0, max: 50 } };
syncHist.records_skipped = { strategy: 'integer', options: { min: 0, max: 100 } };
syncHist.duration_ms = { strategy: 'integer', options: { min: 500, max: 120000 } };

// ═══════════════════════════════════════
// AI USAGE
// ═══════════════════════════════════════
const aiUsage = template.tables.ai_usage.columns;
aiUsage.provider = {
  strategy: 'enum',
  options: {
    values: ['anthropic', 'openai'],
    weights: [0.70, 0.30]
  }
};
aiUsage.model = {
  strategy: 'enum',
  options: {
    values: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001', 'gpt-4o-mini'],
    weights: [0.50, 0.30, 0.20]
  }
};
aiUsage.feature = {
  strategy: 'enum',
  options: {
    values: ['risk_analysis', 'intervention_recommendation', 'report_generation', 'data_summary', 'parent_communication', 'progress_monitoring'],
    weights: [0.25, 0.20, 0.18, 0.15, 0.12, 0.10]
  }
};
aiUsage.input_tokens = { strategy: 'integer', options: { min: 100, max: 4000 } };
aiUsage.output_tokens = { strategy: 'integer', options: { min: 50, max: 2000 } };
aiUsage.total_tokens = { strategy: 'integer', options: { min: 150, max: 6000 } };
aiUsage.cost_cents = { strategy: 'integer', options: { min: 1, max: 50 } };
aiUsage.latency_ms = { strategy: 'integer', options: { min: 200, max: 15000 } };
aiUsage.success = { strategy: 'boolean', options: { trueWeight: 0.94 } };
aiUsage.anonymization_level = {
  strategy: 'enum',
  options: {
    values: ['full', 'partial', 'none'],
    weights: [0.60, 0.30, 0.10]
  }
};
aiUsage.student_count = { strategy: 'integer', options: { min: 1, max: 50 } };
aiUsage.pii_detected = { strategy: 'boolean', options: { trueWeight: 0.05 } };

// ═══════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════
const audit = template.tables.audit_logs.columns;
audit.action = {
  strategy: 'enum',
  options: {
    values: ['create', 'update', 'delete', 'view', 'export', 'login', 'logout', 'bulk_update', 'import'],
    weights: [0.15, 0.25, 0.05, 0.20, 0.08, 0.10, 0.07, 0.05, 0.05]
  }
};
audit.resource_type = {
  strategy: 'enum',
  options: {
    values: ['student', 'intervention', 'risk_alert', 'report', 'user', 'school', 'data_source', 'dashboard'],
    weights: [0.25, 0.18, 0.15, 0.12, 0.10, 0.08, 0.07, 0.05]
  }
};

// ═══════════════════════════════════════
// SCHEDULED & GENERATED REPORTS
// ═══════════════════════════════════════
const schedReports = template.tables.scheduled_reports.columns;
schedReports.report_type = {
  strategy: 'enum',
  options: {
    values: ['risk_summary', 'attendance_report', 'intervention_progress', 'grade_analysis', 'behavior_report', 'comprehensive_mtss', 'data_quality'],
    weights: [0.20, 0.18, 0.18, 0.14, 0.12, 0.10, 0.08]
  }
};
schedReports.format = {
  strategy: 'enum',
  options: {
    values: ['pdf', 'csv', 'xlsx'],
    weights: [0.50, 0.25, 0.25]
  }
};
schedReports.frequency = {
  strategy: 'enum',
  options: {
    values: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly'],
    weights: [0.10, 0.35, 0.20, 0.25, 0.10]
  }
};
schedReports.day_of_week = { strategy: 'integer', options: { min: 0, max: 6 } };
schedReports.day_of_month = { strategy: 'integer', options: { min: 1, max: 28 } };
schedReports.timezone = schools.timezone;

const genReports = template.tables.generated_reports.columns;
genReports.report_type = schedReports.report_type;
genReports.format = schedReports.format;
genReports.generation_time_ms = { strategy: 'integer', options: { min: 500, max: 60000 } };
genReports.file_size_bytes = { strategy: 'integer', options: { min: 5000, max: 5000000 } };
genReports.delivery_status = {
  strategy: 'enum',
  options: {
    values: ['delivered', 'pending', 'failed', 'expired'],
    weights: [0.70, 0.10, 0.10, 0.10]
  }
};
genReports.record_count = { strategy: 'integer', options: { min: 10, max: 2000 } };

// ═══════════════════════════════════════
// DASHBOARD CONFIGS
// ═══════════════════════════════════════
const dashboards = template.tables.dashboard_configs.columns;
dashboards.name = {
  strategy: 'enum',
  options: {
    values: ['MTSS Overview', 'Attendance Dashboard', 'Risk Monitor', 'Intervention Tracker', 'Grade Analytics', 'Behavior Insights', 'My Caseload', 'School Summary'],
    weights: [0.18, 0.14, 0.14, 0.14, 0.12, 0.10, 0.10, 0.08]
  }
};
dashboards.is_default = { strategy: 'boolean', options: { trueWeight: 0.15 } };
dashboards.is_shared = { strategy: 'boolean', options: { trueWeight: 0.40 } };
dashboards.refresh_interval_seconds = { strategy: 'enum', options: { values: [30, 60, 300, 600, 3600], weights: [0.10, 0.20, 0.35, 0.25, 0.10] } };

// ═══════════════════════════════════════
// RESOURCE PROGRESS
// ═══════════════════════════════════════
const resources = template.tables.resource_progress.columns;
resources.module_slug = {
  strategy: 'enum',
  options: {
    values: ['getting-started', 'mtss-framework', 'risk-scoring', 'intervention-planning', 'data-interpretation', 'progress-monitoring', 'family-engagement', 'report-building', 'advanced-analytics'],
    weights: [0.18, 0.14, 0.12, 0.12, 0.10, 0.10, 0.08, 0.08, 0.08]
  }
};
resources.module_category = {
  strategy: 'enum',
  options: {
    values: ['onboarding', 'mtss_training', 'data_literacy', 'intervention_skills', 'platform_features'],
    weights: [0.25, 0.25, 0.20, 0.15, 0.15]
  }
};
resources.total_sections = { strategy: 'integer', options: { min: 3, max: 12 } };
resources.sections_completed = { strategy: 'integer', options: { min: 0, max: 12 } };
resources.current_section = { strategy: 'integer', options: { min: 0, max: 12 } };
resources.time_spent_minutes = { strategy: 'integer', options: { min: 0, max: 180 } };
resources.is_started = { strategy: 'boolean', options: { trueWeight: 0.70 } };
resources.is_completed = { strategy: 'boolean', options: { trueWeight: 0.35 } };
resources.is_bookmarked = { strategy: 'boolean', options: { trueWeight: 0.20 } };

// ═══════════════════════════════════════
// USER PREFERENCES
// ═══════════════════════════════════════
const prefs = template.tables.user_preferences.columns;
prefs.digest_frequency = {
  strategy: 'enum',
  options: {
    values: ['realtime', 'daily', 'weekly', 'never'],
    weights: [0.15, 0.40, 0.35, 0.10]
  }
};
prefs.theme = {
  strategy: 'enum',
  options: {
    values: ['light', 'dark', 'system'],
    weights: [0.40, 0.25, 0.35]
  }
};
prefs.date_format = {
  strategy: 'enum',
  options: {
    values: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
    weights: [0.70, 0.15, 0.15]
  }
};
prefs.number_format = {
  strategy: 'enum',
  options: {
    values: ['1,234.56', '1.234,56', '1 234.56'],
    weights: [0.80, 0.10, 0.10]
  }
};
prefs.email_notifications = { strategy: 'boolean', options: { trueWeight: 0.80 } };
prefs.push_notifications = { strategy: 'boolean', options: { trueWeight: 0.55 } };
prefs.alert_critical_students = { strategy: 'boolean', options: { trueWeight: 0.85 } };
prefs.alert_attendance_drops = { strategy: 'boolean', options: { trueWeight: 0.75 } };
prefs.alert_assessment_results = { strategy: 'boolean', options: { trueWeight: 0.60 } };
prefs.alert_intervention_updates = { strategy: 'boolean', options: { trueWeight: 0.70 } };
prefs.alert_system_updates = { strategy: 'boolean', options: { trueWeight: 0.40 } };
prefs.compact_mode = { strategy: 'boolean', options: { trueWeight: 0.30 } };
prefs.show_student_photos = { strategy: 'boolean', options: { trueWeight: 0.65 } };
prefs.reduce_motion = { strategy: 'boolean', options: { trueWeight: 0.08 } };
prefs.high_contrast = { strategy: 'boolean', options: { trueWeight: 0.05 } };
prefs.share_usage_data = { strategy: 'boolean', options: { trueWeight: 0.55 } };

// ═══════════════════════════════════════
// WEBHOOK EVENTS
// ═══════════════════════════════════════
const webhooks = template.tables.webhook_events.columns;
webhooks.event_type = {
  strategy: 'enum',
  options: {
    values: ['invoice.paid', 'invoice.payment_failed', 'customer.subscription.updated', 'customer.subscription.deleted', 'checkout.session.completed', 'customer.created'],
    weights: [0.30, 0.10, 0.20, 0.10, 0.20, 0.10]
  }
};
webhooks.status = {
  strategy: 'enum',
  options: {
    values: ['processed', 'failed', 'pending', 'skipped'],
    weights: [0.75, 0.08, 0.10, 0.07]
  }
};
webhooks.retry_count = { strategy: 'integer', options: { min: 0, max: 5 } };

// ═══════════════════════════════════════
// AI USAGE LIMITS
// ═══════════════════════════════════════
const aiLimits = template.tables.ai_usage_limits.columns;
aiLimits.monthly_token_limit = { strategy: 'enum', options: { values: [50000, 100000, 250000, 500000, 1000000], weights: [0.15, 0.25, 0.30, 0.20, 0.10] } };
aiLimits.monthly_cost_limit_cents = { strategy: 'enum', options: { values: [500, 1000, 2500, 5000, 10000], weights: [0.15, 0.25, 0.30, 0.20, 0.10] } };
aiLimits.current_month_tokens = { strategy: 'integer', options: { min: 0, max: 500000 } };
aiLimits.current_month_cost_cents = { strategy: 'integer', options: { min: 0, max: 5000 } };

// Write enriched template
fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
console.log('✅ EduNode template enriched — all 26 tables updated');
console.log(`   File: ${templatePath}`);
console.log(`   Size: ${(fs.statSync(templatePath).size / 1024).toFixed(1)} KB`);
