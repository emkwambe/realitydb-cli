/**
 * EduNode Analytics — Production Demo Data Generator
 * 
 * Generates INSERT-only SQL for the existing EduNode Supabase schema.
 * Uses real school/authorizer/risk_config UUIDs from production.
 * Handles GENERATED columns by excluding them from INSERTs.
 * 
 * Target: 1,427 students (487 + 312 + 628) across 3 schools
 * 
 * Usage:
 *   node generate-edunode-demo.cjs
 *   Then: psql <connection> -f edunode-demo-seed.sql
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const OUTPUT = path.join(__dirname, 'edunode-demo-seed.sql');

// ============================================
// PRODUCTION UUIDs (from Supabase)
// ============================================

const AUTHORIZER_ID = '023da3c1-a4db-4172-bd24-ea15300d7265';

const SCHOOLS = [
  { id: '1e3bee7f-8b7d-4c06-b39f-f376f3e98aec', name: 'Academy Charter School', slug: 'academy-charter', tier: 'pro', studentCount: 487, grades: [6, 7, 8], riskConfigId: '09a0346a-b516-4583-835e-18db8252ca12' },
  { id: '89726bc0-3694-44bf-8fbf-da3942771baa', name: 'Innovation Prep Academy', slug: 'innovation-prep', tier: 'starter', studentCount: 312, grades: [9, 10, 11, 12], riskConfigId: '59420f69-1898-4a57-a9fc-9d5b145ded4f' },
  { id: 'f85e70eb-03fd-4467-b917-e680aee1ae2e', name: 'STEM Scholars Charter', slug: 'stem-scholars', tier: 'enterprise', studentCount: 628, grades: [6, 7, 8, 9, 10, 11, 12], riskConfigId: 'a25d48cd-3379-48dd-93ed-7dae801df66a' },
];

// ============================================
// DATA POOLS
// ============================================

const FIRST_NAMES = [
  'Jayden', 'Aaliyah', 'Mateo', 'Zoe', 'Malik', 'Elena', 'Isaiah', 'Sofia',
  'Marcus', 'Aria', 'DeShawn', 'Luna', 'Xavier', 'Mia', 'Aiden', 'Camila',
  'Elijah', 'Valentina', 'Josiah', 'Gabriella', 'Khalil', 'Stella', 'Damian',
  'Bella', 'Jaxon', 'Natalia', 'Kayden', 'Layla', 'Brandon', 'Penelope',
  'Tyler', 'Riley', 'Jordan', 'Avery', 'Cameron', 'Harper', 'Mason', 'Evelyn',
  'Ethan', 'Abigail', 'Noah', 'Emily', 'Liam', 'Madison', 'Lucas', 'Chloe',
  'Emma', 'Olivia', 'Sophia', 'Charlotte', 'Amelia', 'William', 'Benjamin',
  'Henry', 'Alexander', 'Daniel', 'Michael', 'James', 'Sebastian', 'Jack',
];

const LAST_NAMES = [
  'Smith', 'Garcia', 'Johnson', 'Williams', 'Chen', 'Rodriguez', 'Martinez',
  'Brown', 'Davis', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore',
  'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez',
  'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams',
];

const TEACHERS = [
  'Ms. Johnson', 'Mr. Chen', 'Ms. Rodriguez', 'Mr. Williams', 'Ms. Davis',
  'Mr. Thompson', 'Ms. Martinez', 'Mr. Lee', 'Ms. Adams', 'Mr. Clark',
  'Ms. Rivera', 'Mr. Parker', 'Ms. Turner', 'Mr. Hall', 'Ms. Nelson',
];

const COUNSELORS = ['Ms. Adams', 'Mr. Clark', 'Ms. Rivera', 'Mr. Parker'];

const ETHNICITIES = [
  { value: 'Hispanic/Latino', weight: 30 },
  { value: 'Black/African American', weight: 25 },
  { value: 'White', weight: 20 },
  { value: 'Asian', weight: 10 },
  { value: 'Two or More Races', weight: 10 },
  { value: 'Other', weight: 5 },
];

const INTERVENTION_TITLES = [
  'Reading Fluency Support', 'Math Intervention - Tier 2', 'Attendance Recovery Plan',
  'Behavior Support Plan', 'SEL Check-in Group', 'Tutoring - After School',
  'Family Engagement Plan', 'Academic Recovery - ELA', 'Peer Mentoring',
  'Credit Recovery Program', 'Small Group Instruction', 'One-on-One Tutoring',
  'Positive Behavior Intervention', 'Social Skills Group', 'Executive Function Coaching',
];

const RISK_ALERT_TITLES = [
  'Student at risk of chronic absence', 'Rapid decline in math performance',
  'Behavior incidents increasing', 'Intervention overdue for review',
  'New student identified as at-risk', 'Attendance dropped below 90%',
  'Grade decline detected', '3+ consecutive absences', 'Missing assignment rate above 20%',
];

// ============================================
// HELPERS
// ============================================

const uuid = () => crypto.randomUUID();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickWeighted = (items) => {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
};
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, dec = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(dec));
const randBool = (trueProb = 0.5) => Math.random() < trueProb;
const esc = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

const randomDate = (start, end) => {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString();
};

const ACADEMIC_START = new Date('2025-08-15');
const NOW = new Date('2026-03-15');

// ============================================
// GENERATE DATA
// ============================================

const sql = [];
sql.push('-- ============================================');
sql.push('-- EduNode Analytics — Production Demo Seed');
sql.push(`-- Generated: ${new Date().toISOString()}`);
sql.push('-- Schools: 3 | Students: 1,427 | Full MTSS pipeline');
sql.push('-- ============================================');
sql.push('');
sql.push('-- Clear existing demo data (preserve schools, authorizers, risk_model_configs)');
sql.push('DELETE FROM risk_alerts;');
sql.push('DELETE FROM risk_evaluations;');
sql.push('DELETE FROM intervention_sessions;');
sql.push('DELETE FROM intervention_dosage_metrics;');
sql.push('DELETE FROM interventions;');
sql.push('DELETE FROM student_metric_history;');
sql.push('DELETE FROM student_metrics;');
sql.push('DELETE FROM notifications;');
sql.push('DELETE FROM students;');
sql.push('DELETE FROM audit_logs;');
sql.push('DELETE FROM school_memberships;');
sql.push('DELETE FROM sync_history;');
sql.push('DELETE FROM integration_events;');
sql.push('DELETE FROM integration_usage;');
sql.push('DELETE FROM data_sources;');
sql.push('DELETE FROM ai_usage;');
sql.push('DELETE FROM ai_usage_limits;');
sql.push('DELETE FROM dashboard_configs;');
sql.push('DELETE FROM resource_progress;');
sql.push('DELETE FROM user_preferences;');
sql.push('DELETE FROM users;');
sql.push('');

// Update school student counts
for (const school of SCHOOLS) {
  sql.push(`UPDATE schools SET student_count = ${school.studentCount} WHERE id = '${school.id}';`);
}
sql.push('');

// ---- USERS ----
const users = [];
const usersBySchool = {};

for (const school of SCHOOLS) {
  usersBySchool[school.id] = [];
  const staffCount = Math.floor(school.studentCount / 15); // ~1 staff per 15 students
  
  for (let i = 0; i < staffCount; i++) {
    const id = uuid();
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const roles = ['teacher', 'teacher', 'teacher', 'teacher', 'counselor', 'school_admin', 'data_manager', 'principal'];
    const role = pick(roles);
    
    users.push({ id, firstName, lastName, email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${school.slug}.edu`, role, schoolId: school.id });
    usersBySchool[school.id].push({ id, role });
  }
}

sql.push('-- USERS');
for (const u of users) {
  sql.push(`INSERT INTO users (id, clerk_user_id, email, first_name, last_name, is_active) VALUES (${esc(u.id)}, ${esc('clerk_' + u.id.substring(0, 12))}, ${esc(u.email)}, ${esc(u.firstName)}, ${esc(u.lastName)}, TRUE);`);
}
sql.push('');

// ---- SCHOOL MEMBERSHIPS ----
sql.push('-- SCHOOL MEMBERSHIPS');
for (const u of users) {
  const dept = pick(['Math', 'ELA', 'Science', 'Social Studies', 'Special Education', 'Counseling']);
  sql.push(`INSERT INTO school_memberships (id, user_id, school_id, role, is_primary, department, is_active) VALUES (${esc(uuid())}, ${esc(u.id)}, ${esc(u.schoolId)}, ${esc(u.role)}, TRUE, ${esc(dept)}, TRUE);`);
}
sql.push('');

// ---- STUDENTS ----
const allStudents = [];

sql.push('-- STUDENTS');
for (const school of SCHOOLS) {
  for (let i = 0; i < school.studentCount; i++) {
    const id = uuid();
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const grade = pick(school.grades);
    
    // Correlated metrics
    const attendanceRate = randBool(0.15) ? randFloat(75, 89) : randFloat(90, 99);
    const isChronicallyAbsent = attendanceRate < 90;
    const totalDays = randInt(80, 100);
    const daysPresent = Math.round(totalDays * attendanceRate / 100);
    const daysAbsent = totalDays - daysPresent;
    
    const proficiency = randFloat(20, 95);
    const growthPercentile = randInt(10, 95);
    
    // Risk level based on metrics (correlated)
    let riskLevel, riskScore;
    if (attendanceRate < 80 || proficiency < 30) {
      riskLevel = 'critical'; riskScore = randFloat(0.7, 0.95, 3);
    } else if (attendanceRate < 88 || proficiency < 45) {
      riskLevel = 'at_risk'; riskScore = randFloat(0.5, 0.7, 3);
    } else if (attendanceRate < 93 || proficiency < 60) {
      riskLevel = 'watch'; riskScore = randFloat(0.3, 0.5, 3);
    } else {
      riskLevel = 'on_track'; riskScore = randFloat(0.05, 0.3, 3);
    }
    
    const hasIep = randBool(0.12);
    const has504 = randBool(0.08);
    const isEL = randBool(0.15);
    const isGifted = randBool(0.05);
    const isFRL = randBool(0.65);
    const teacher = pick(TEACHERS);
    const counselor = pick(COUNSELORS);
    const gender = pickWeighted([{ value: 'Male', weight: 48 }, { value: 'Female', weight: 48 }, { value: 'Non-binary', weight: 4 }]);
    const ethnicity = pickWeighted(ETHNICITIES);
    const enrolledAt = randomDate(new Date('2025-08-01'), new Date('2025-09-15'));
    const riskFactors = [];
    if (attendanceRate < 90) riskFactors.push('Low attendance rate');
    if (isChronicallyAbsent) riskFactors.push('Chronically absent');
    if (proficiency < 50) riskFactors.push('Below proficiency');
    if (growthPercentile < 25) riskFactors.push('Low growth trajectory');
    
    const student = { id, schoolId: school.id, firstName, lastName, grade, attendanceRate, riskLevel, riskScore, proficiency, growthPercentile, hasIep };
    allStudents.push(student);
    
    sql.push(`INSERT INTO students (id, school_id, sis_student_id, first_name, last_name, display_name, grade_level, gender, ethnicity, has_iep, has_504_plan, is_english_learner, is_gifted, is_free_reduced_lunch, homeroom_teacher, counselor, attendance_rate, days_present, days_absent, is_chronically_absent, proficiency_level, growth_percentile, risk_level, risk_score, risk_factors, is_active, enrolled_at) VALUES (${esc(id)}, ${esc(school.id)}, ${esc('SIS-' + id.substring(0, 8))}, ${esc(firstName)}, ${esc(lastName)}, ${esc(lastName + ', ' + firstName)}, ${grade}, ${esc(gender)}, ${esc(ethnicity)}, ${hasIep}, ${has504}, ${isEL}, ${isGifted}, ${isFRL}, ${esc(teacher)}, ${esc(counselor)}, ${attendanceRate}, ${daysPresent}, ${daysAbsent}, ${isChronicallyAbsent}, ${proficiency}, ${growthPercentile}, ${esc(riskLevel)}, ${riskScore}, ${esc(riskFactors)}, TRUE, ${esc(enrolledAt.split('T')[0])});`);
  }
}
sql.push('');

// ---- STUDENT METRICS ----
sql.push('-- STUDENT METRICS');
for (const s of allStudents) {
  const gpa = randFloat(1.5, 4.0, 3);
  const mathPct = randInt(15, 95);
  const readingPct = randInt(15, 95);
  const missingRate = randFloat(0, 0.35, 3);
  const behaviorCount = s.riskLevel === 'critical' ? randInt(2, 8) : s.riskLevel === 'at_risk' ? randInt(1, 4) : randInt(0, 2);
  const engagement = s.riskLevel === 'on_track' ? randFloat(0.7, 1.0, 3) : randFloat(0.3, 0.7, 3);
  
  sql.push(`INSERT INTO student_metrics (id, student_id, school_id, attendance_rate, attendance_trend, days_absent_last_30, chronic_absence_flag, gpa_current, gpa_trend, math_assessment_pct, reading_assessment_pct, assessment_trend, proficiency_level, growth_percentile, missing_assignment_rate, missing_assignments_count, total_assignments_count, assignment_trend, behavior_incident_count, behavior_incident_trend, suspensions_count, engagement_score, data_completeness) VALUES (${esc(uuid())}, ${esc(s.id)}, ${esc(s.schoolId)}, ${s.attendanceRate}, ${randFloat(-0.03, 0.03, 4)}, ${randInt(0, 8)}, ${s.attendanceRate < 90}, ${gpa}, ${randFloat(-0.2, 0.2, 4)}, ${mathPct}, ${readingPct}, ${randFloat(-0.05, 0.05, 4)}, ${randFloat(1, 5, 1)}, ${s.growthPercentile}, ${missingRate}, ${randInt(0, 12)}, ${randInt(25, 70)}, ${randFloat(-0.05, 0.05, 4)}, ${behaviorCount}, ${randFloat(-0.03, 0.03, 4)}, ${s.riskLevel === 'critical' ? randInt(0, 2) : 0}, ${engagement}, ${randFloat(0.5, 1.0, 3)});`);
}
sql.push('');

// ---- RISK EVALUATIONS ----
sql.push('-- RISK EVALUATIONS');
const riskEvals = [];
for (const s of allStudents) {
  const school = SCHOOLS.find(sc => sc.id === s.schoolId);
  const id = uuid();
  const prevLevel = pick(['on_track', 'watch', 'at_risk', 'critical']);
  const changed = prevLevel !== s.riskLevel;
  const trajectory = pick(['improving', 'stable', 'declining']);
  
  riskEvals.push({ id, studentId: s.id, schoolId: s.schoolId });
  
  sql.push(`INSERT INTO risk_evaluations (id, student_id, school_id, config_id, risk_score, risk_level, previous_level, level_changed, risk_factors, trajectory, confidence_level, trigger_type) VALUES (${esc(id)}, ${esc(s.id)}, ${esc(s.schoolId)}, ${esc(school.riskConfigId)}, ${s.riskScore}, ${esc(s.riskLevel)}, ${esc(prevLevel)}, ${changed}, ${esc([])}, ${esc(trajectory)}, ${randFloat(0.6, 1.0, 3)}, ${esc(pick(['batch_nightly', 'sync_event', 'manual']))});`);
}
sql.push('');

// ---- INTERVENTIONS (for at_risk and critical students) ----
sql.push('-- INTERVENTIONS');
const interventions = [];
const atRiskStudents = allStudents.filter(s => s.riskLevel === 'at_risk' || s.riskLevel === 'critical' || (s.riskLevel === 'watch' && randBool(0.3)));

for (const s of atRiskStudents) {
  const schoolUsers = usersBySchool[s.schoolId] || [];
  const creator = schoolUsers.length > 0 ? pick(schoolUsers) : null;
  const assignee = schoolUsers.length > 0 ? pick(schoolUsers) : null;
  const id = uuid();
  const type = pickWeighted([
    { value: 'academic', weight: 35 }, { value: 'attendance', weight: 25 },
    { value: 'behavior', weight: 15 }, { value: 'sel', weight: 15 },
    { value: 'family_engagement', weight: 10 }
  ]);
  const status = pickWeighted([
    { value: 'in_progress', weight: 45 }, { value: 'planned', weight: 15 },
    { value: 'completed', weight: 30 }, { value: 'cancelled', weight: 10 }
  ]);
  const priority = pickWeighted([
    { value: 'medium', weight: 45 }, { value: 'high', weight: 30 },
    { value: 'urgent', weight: 15 }, { value: 'low', weight: 10 }
  ]);
  const title = pick(INTERVENTION_TITLES);
  const startDate = randomDate(ACADEMIC_START, NOW).split('T')[0];
  const targetEnd = new Date(new Date(startDate).getTime() + randInt(30, 90) * 86400000).toISOString().split('T')[0];
  const actualEnd = status === 'completed' ? randomDate(new Date(startDate), NOW).split('T')[0] : null;
  const wasSuccessful = status === 'completed' ? randBool(0.7) : null;
  const baseline = randFloat(20, 55);
  const target = randFloat(70, 95);
  const current = status === 'cancelled' ? null : randFloat(baseline, target);
  
  interventions.push({ id, studentId: s.id, schoolId: s.schoolId, status, type });
  
  sql.push(`INSERT INTO interventions (id, school_id, student_id, created_by_user_id, assigned_to_user_id, type, title, status, priority, start_date, target_end_date, actual_end_date, goal, baseline_value, target_value, current_value, was_successful) VALUES (${esc(id)}, ${esc(s.schoolId)}, ${esc(s.id)}, ${creator ? esc(creator.id) : 'NULL'}, ${assignee ? esc(assignee.id) : 'NULL'}, ${esc(type)}, ${esc(title)}, ${esc(status)}, ${esc(priority)}, ${esc(startDate)}, ${esc(targetEnd)}, ${esc(actualEnd)}, ${esc('Improve student outcomes in ' + type)}, ${baseline}, ${target}, ${current !== null ? current : 'NULL'}, ${wasSuccessful !== null ? wasSuccessful : 'NULL'});`);
}
sql.push('');

// ---- INTERVENTION DOSAGE METRICS (exclude GENERATED columns) ----
sql.push('-- INTERVENTION DOSAGE METRICS');
for (const intv of interventions) {
  const sessPerWeek = randFloat(2, 5, 1);
  const minPerSess = pick([20, 30, 30, 45, 60]);
  const totalWeeks = randInt(4, 12);
  const completed = intv.status === 'completed' ? Math.ceil(sessPerWeek * totalWeeks) : randInt(0, Math.ceil(sessPerWeek * totalWeeks * 0.7));
  const dosageStatus = intv.status === 'cancelled' ? 'discontinued' : intv.status === 'completed' ? 'completed' : intv.status === 'planned' ? 'not_started' : pickWeighted([{ value: 'on_track', weight: 50 }, { value: 'behind', weight: 30 }, { value: 'critical', weight: 20 }]);
  
  // Exclude: planned_total_sessions, planned_total_minutes, on_track (GENERATED columns)
  sql.push(`INSERT INTO intervention_dosage_metrics (id, intervention_id, school_id, student_id, planned_sessions_per_week, planned_minutes_per_session, planned_total_weeks, actual_sessions_completed, actual_sessions_partial, actual_sessions_cancelled, actual_sessions_no_show, actual_total_minutes, session_completion_rate, dosage_compliance_rate, attendance_rate, average_fidelity_score, fidelity_trend, weeks_elapsed, sessions_behind_schedule, minutes_behind_schedule, average_engagement_rate, dosage_status) VALUES (${esc(uuid())}, ${esc(intv.id)}, ${esc(intv.schoolId)}, ${esc(intv.studentId)}, ${sessPerWeek}, ${minPerSess}, ${totalWeeks}, ${completed}, ${randInt(0, 3)}, ${randInt(0, 5)}, ${randInt(0, 3)}, ${completed * minPerSess}, ${randFloat(0.4, 1.0, 4)}, ${randFloat(0.3, 1.0, 4)}, ${randFloat(0.5, 1.0, 4)}, ${randFloat(0.5, 1.0, 3)}, ${esc(pick(['improving', 'stable', 'declining']))}, ${randInt(1, totalWeeks)}, ${randInt(0, 5)}, ${randInt(0, 150)}, ${randFloat(0.5, 1.0, 3)}, ${esc(dosageStatus)});`);
}
sql.push('');

// ---- RISK ALERTS (for at_risk/critical students) ----
sql.push('-- RISK ALERTS');
const criticalStudents = allStudents.filter(s => s.riskLevel === 'critical' || s.riskLevel === 'at_risk');
for (const s of criticalStudents) {
  const eval_ = riskEvals.find(e => e.studentId === s.id);
  const intv = interventions.find(i => i.studentId === s.id);
  const schoolUsers = usersBySchool[s.schoolId] || [];
  
  const alertType = pickWeighted([
    { value: 'threshold_breach', weight: 15 }, { value: 'rapid_decline', weight: 10 },
    { value: 'chronic_absence', weight: 15 }, { value: 'intervention_overdue', weight: 10 },
    { value: 'new_risk_detected', weight: 10 }, { value: 'trend_warning', weight: 10 },
    { value: 'attendance_drop', weight: 10 }, { value: 'grade_decline', weight: 10 },
    { value: 'consecutive_absences', weight: 10 }
  ]);
  const severity = s.riskLevel === 'critical' ? pickWeighted([{ value: 'critical', weight: 40 }, { value: 'urgent', weight: 40 }, { value: 'warning', weight: 20 }]) : pickWeighted([{ value: 'warning', weight: 50 }, { value: 'urgent', weight: 30 }, { value: 'info', weight: 20 }]);
  const status = pickWeighted([
    { value: 'new', weight: 25 }, { value: 'acknowledged', weight: 20 },
    { value: 'in_review', weight: 15 }, { value: 'resolved', weight: 30 },
    { value: 'dismissed', weight: 10 }
  ]);
  const ackBy = (status !== 'new') && schoolUsers.length > 0 ? pick(schoolUsers).id : null;
  const resolvedBy = (status === 'resolved') && schoolUsers.length > 0 ? pick(schoolUsers).id : null;
  
  sql.push(`INSERT INTO risk_alerts (id, evaluation_id, student_id, school_id, alert_type, severity, title, message, risk_score, risk_level, status, acknowledged_by, acknowledged_at, resolved_by, resolved_at, intervention_id) VALUES (${esc(uuid())}, ${eval_ ? esc(eval_.id) : 'NULL'}, ${esc(s.id)}, ${esc(s.schoolId)}, ${esc(alertType)}, ${esc(severity)}, ${esc(pick(RISK_ALERT_TITLES))}, ${esc('Review recommended. Multiple risk factors detected for this student.')}, ${s.riskScore}, ${esc(s.riskLevel)}, ${esc(status)}, ${esc(ackBy)}, ${ackBy ? esc(randomDate(ACADEMIC_START, NOW)) : 'NULL'}, ${esc(resolvedBy)}, ${resolvedBy ? esc(randomDate(ACADEMIC_START, NOW)) : 'NULL'}, ${intv ? esc(intv.id) : 'NULL'});`);
}
sql.push('');

// ---- NOTIFICATIONS ----
sql.push('-- NOTIFICATIONS (sample for each school)');
for (const school of SCHOOLS) {
  const schoolUsers = usersBySchool[school.id] || [];
  const schoolStudents = allStudents.filter(s => s.schoolId === school.id);
  const schoolInterventions = interventions.filter(i => i.schoolId === school.id);
  
  for (let i = 0; i < Math.min(50, schoolUsers.length * 3); i++) {
    const user = pick(schoolUsers);
    const student = schoolStudents.length > 0 ? pick(schoolStudents) : null;
    const intv = schoolInterventions.length > 0 ? pick(schoolInterventions) : null;
    const type = pickWeighted([{ value: 'alert', weight: 35 }, { value: 'insight', weight: 25 }, { value: 'system', weight: 20 }, { value: 'action', weight: 20 }]);
    const priority = pickWeighted([{ value: 'medium', weight: 40 }, { value: 'high', weight: 30 }, { value: 'low', weight: 15 }, { value: 'urgent', weight: 15 }]);
    const isRead = randBool(0.6);
    
    sql.push(`INSERT INTO notifications (id, school_id, user_id, type, priority, title, message, related_student_id, related_intervention_id, is_read, read_at) VALUES (${esc(uuid())}, ${esc(school.id)}, ${esc(user.id)}, ${esc(type)}, ${esc(priority)}, ${esc(pick(['New at-risk student identified', 'Attendance alert', 'Intervention review due', 'Weekly risk summary ready', 'Data sync completed', 'Assessment results available']))}, ${esc('Action may be required. Check the dashboard for details.')}, ${student ? esc(student.id) : 'NULL'}, ${intv ? esc(intv.id) : 'NULL'}, ${isRead}, ${isRead ? esc(randomDate(ACADEMIC_START, NOW)) : 'NULL'});`);
  }
}
sql.push('');

// ---- FINAL COUNTS ----
sql.push('-- Update school student counts');
for (const school of SCHOOLS) {
  sql.push(`UPDATE schools SET student_count = (SELECT COUNT(*) FROM students WHERE school_id = '${school.id}' AND is_active = TRUE) WHERE id = '${school.id}';`);
}

sql.push('');
sql.push('-- ============================================');
sql.push('-- SEED COMPLETE');
sql.push(`-- Students: ${allStudents.length}`);
sql.push(`-- Interventions: ${interventions.length}`);
sql.push(`-- Risk Evaluations: ${riskEvals.length}`);
sql.push(`-- Risk Alerts: ${criticalStudents.length}`);
sql.push('-- ============================================');

// Write output
fs.writeFileSync(OUTPUT, sql.join('\n'), 'utf-8');

const fileSize = (fs.statSync(OUTPUT).size / (1024 * 1024)).toFixed(2);
console.log('EduNode Demo Seed Generated');
console.log('─'.repeat(40));
console.log(`  Students: ${allStudents.length} (${SCHOOLS.map(s => s.studentCount).join(' + ')})`);
console.log(`  Users/Staff: ${users.length}`);
console.log(`  Interventions: ${interventions.length}`);
console.log(`  Risk Evaluations: ${riskEvals.length}`);
console.log(`  Risk Alerts: ${criticalStudents.length}`);
console.log(`  Notifications: ${SCHOOLS.length * 50}`);
console.log(`  File: ${OUTPUT} (${fileSize} MB)`);
console.log('');
console.log('Run against Supabase:');
console.log(`  psql "postgresql://postgres.cfpongyknrdrudetjhdq:PASSWORD@aws-0-us-west-2.pooler.supabase.com:5432/postgres" -f "${OUTPUT}"`);
