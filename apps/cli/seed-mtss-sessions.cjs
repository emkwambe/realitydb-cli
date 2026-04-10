/**
 * EduNode — Seed intervention_sessions + student_metric_history
 * 
 * Fills the two tables needed for the MTSS metrics page.
 * Reads existing interventions and students from production.
 * 
 * Usage: node seed-mtss-sessions.cjs
 */

const { Client } = require('pg');
const crypto = require('crypto');
const fs = require('fs');

const CONN = 'postgresql://postgres.cfpongyknrdrudetjhdq:ips5nwzGLL3KpQqP@aws-0-us-west-2.pooler.supabase.com:5432/postgres';
const uuid = () => crypto.randomUUID();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, dec = 3) => parseFloat((Math.random() * (max - min) + min).toFixed(dec));
const randBool = (p = 0.5) => Math.random() < p;

async function run() {
  const client = new Client({ connectionString: CONN });
  await client.connect();
  console.log('Connected to EduNode production');

  // Get existing interventions with their students and schools
  const { rows: interventions } = await client.query(
    `SELECT i.id, i.school_id, i.student_id, i.status, i.type, i.start_date, i.target_end_date,
            i.assigned_to_user_id, i.created_by_user_id
     FROM interventions i WHERE i.status IN ('in_progress', 'completed')`
  );
  console.log(`  Found ${interventions.length} active/completed interventions`);

  // Get all students
  const { rows: students } = await client.query(
    `SELECT id, school_id, grade_level, attendance_rate, proficiency_level, growth_percentile, risk_level
     FROM students WHERE is_active = TRUE`
  );
  console.log(`  Found ${students.length} active students`);

  // Get users per school for delivered_by
  const { rows: memberships } = await client.query(
    `SELECT user_id, school_id FROM school_memberships WHERE is_active = TRUE`
  );
  const usersBySchool = {};
  for (const m of memberships) {
    if (!usersBySchool[m.school_id]) usersBySchool[m.school_id] = [];
    usersBySchool[m.school_id].push(m.user_id);
  }

  // ============================================
  // INTERVENTION SESSIONS
  // ============================================
  console.log('\n  Generating intervention sessions...');
  let sessionCount = 0;
  let sessionErrors = 0;

  for (const intv of interventions) {
    const startDate = intv.start_date ? new Date(intv.start_date) : new Date('2025-09-01');
    const endDate = intv.target_end_date ? new Date(intv.target_end_date) : new Date('2026-03-15');
    const schoolUsers = usersBySchool[intv.school_id] || [];
    const deliveredBy = schoolUsers.length > 0 ? pick(schoolUsers) : intv.assigned_to_user_id;

    // Generate 4-20 sessions per intervention
    const numSessions = intv.status === 'completed' ? randInt(10, 20) : randInt(4, 12);

    for (let s = 0; s < numSessions; s++) {
      const dayOffset = Math.floor((s / numSessions) * (endDate - startDate) / 86400000);
      const schedDate = new Date(startDate.getTime() + dayOffset * 86400000);
      if (schedDate > new Date('2026-03-15')) break;

      const schedDateStr = schedDate.toISOString().split('T')[0];
      const duration = pick([20, 30, 30, 30, 45, 60]);
      const statusWeights = intv.status === 'completed'
        ? ['completed', 'completed', 'completed', 'completed', 'partial', 'cancelled']
        : ['completed', 'completed', 'completed', 'partial', 'cancelled', 'no_show', 'scheduled'];
      const status = pick(statusWeights);

      const actualDate = (status === 'completed' || status === 'partial') ? schedDateStr : null;
      const actualDuration = status === 'completed' ? duration : status === 'partial' ? randInt(10, duration - 5) : null;
      const fidelity = (status === 'completed' || status === 'partial') ? randFloat(0.5, 1.0) : null;
      const modality = pick(['in_person', 'in_person', 'in_person', 'virtual', 'hybrid']);
      const engaged = (status === 'completed') ? randBool(0.85) : null;

      try {
        await client.query(
          `INSERT INTO intervention_sessions (id, intervention_id, school_id, student_id, scheduled_date, scheduled_duration_minutes, actual_date, actual_duration_minutes, status, delivered_by, modality, group_size, fidelity_score, student_engaged, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [uuid(), intv.id, intv.school_id, intv.student_id, schedDateStr, duration, actualDate, actualDuration, status, deliveredBy, modality, randInt(1, 5), fidelity, engaged, deliveredBy]
        );
        sessionCount++;
      } catch (e) {
        sessionErrors++;
      }
    }

    if (sessionCount % 500 === 0 && sessionCount > 0) console.log(`    ${sessionCount} sessions inserted...`);
  }
  console.log(`  Sessions: ${sessionCount} inserted, ${sessionErrors} errors`);

  // ============================================
  // STUDENT METRIC HISTORY (weekly snapshots)
  // ============================================
  console.log('\n  Generating student metric history...');
  let historyCount = 0;
  let historyErrors = 0;

  // Generate 20 weekly snapshots (Aug 2025 → Mar 2026)
  const weeks = [];
  const historyStart = new Date('2025-08-18'); // First Monday of school year
  for (let w = 0; w < 28; w++) {
    const d = new Date(historyStart.getTime() + w * 7 * 86400000);
    if (d > new Date('2026-03-15')) break;
    const weekNum = Math.ceil((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / (7 * 86400000));
    weeks.push({ date: d.toISOString().split('T')[0], week: weekNum, year: d.getFullYear() });
  }

  // Batch: do every 5th student to keep it manageable (~285 students × 28 weeks = ~8,000 rows)
  const sampledStudents = students.filter((_, i) => i % 5 === 0);
  console.log(`  Sampling ${sampledStudents.length} students × ${weeks.length} weeks = ~${sampledStudents.length * weeks.length} snapshots`);

  for (const student of sampledStudents) {
    // Base values that drift slightly each week
    let att = student.attendance_rate ? parseFloat(student.attendance_rate) : randFloat(85, 98);
    let gpa = randFloat(1.8, 3.8, 3);
    let mathPct = randInt(20, 90);
    let readPct = randInt(20, 90);
    let missingRate = randFloat(0.02, 0.3, 3);
    let behaviorCount = student.risk_level === 'critical' ? randInt(1, 4) : randInt(0, 2);
    let proficiency = student.proficiency_level ? parseFloat(student.proficiency_level) : randFloat(30, 85);
    let growth = student.growth_percentile || randInt(20, 80);
    let engagement = randFloat(0.4, 0.9, 3);

    for (const week of weeks) {
      // Small random drift each week
      att = Math.max(70, Math.min(100, att + randFloat(-1.5, 1.5)));
      gpa = Math.max(0.5, Math.min(4.0, gpa + randFloat(-0.1, 0.1, 3)));
      mathPct = Math.max(5, Math.min(100, mathPct + randInt(-3, 3)));
      readPct = Math.max(5, Math.min(100, readPct + randInt(-3, 3)));
      missingRate = Math.max(0, Math.min(0.5, missingRate + randFloat(-0.02, 0.02, 3)));
      behaviorCount = Math.max(0, behaviorCount + (randBool(0.2) ? 1 : randBool(0.3) ? -1 : 0));
      engagement = Math.max(0.2, Math.min(1.0, engagement + randFloat(-0.05, 0.05, 3)));

      try {
        await client.query(
          `INSERT INTO student_metric_history (id, student_id, school_id, snapshot_date, snapshot_week, snapshot_year, attendance_rate, gpa_current, math_assessment_pct, reading_assessment_pct, missing_assignment_rate, behavior_incident_count, proficiency_level, growth_percentile, engagement_score)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [uuid(), student.id, student.school_id, week.date, week.week, week.year, parseFloat(att.toFixed(2)), parseFloat(gpa.toFixed(3)), mathPct, readPct, parseFloat(missingRate.toFixed(3)), behaviorCount, parseFloat(proficiency.toFixed(1)), growth, parseFloat(engagement.toFixed(3))]
        );
        historyCount++;
      } catch (e) {
        historyErrors++;
      }
    }

    if (historyCount % 1000 === 0 && historyCount > 0) console.log(`    ${historyCount} history rows inserted...`);
  }
  console.log(`  History: ${historyCount} inserted, ${historyErrors} errors`);

  // Final counts
  const sessResult = await client.query('SELECT COUNT(*)::int as cnt FROM intervention_sessions');
  const histResult = await client.query('SELECT COUNT(*)::int as cnt FROM student_metric_history');
  console.log(`\n  Final counts:`);
  console.log(`    intervention_sessions: ${sessResult.rows[0].cnt}`);
  console.log(`    student_metric_history: ${histResult.rows[0].cnt}`);

  await client.end();
  console.log('\nDone!');
}

run().catch(e => { console.error(e.message); process.exit(1); });
