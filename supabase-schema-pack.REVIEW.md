# RealityDB Scan — Review Manifest

> Generated: 2026-05-11T11:45:38.858Z
> Tables: 124
> Total columns: 1604

## Summary

- **Tier 1** (auto-applied, high confidence): 650 columns
- **Tier 2** (heuristic, flagged for review): 534 columns
- **Tier 3** (needs developer input): 420 columns

- **Lifecycle rules detected**: 5
- **Temporal pairs detected**: 75

## Items to Review

### Tier 2 — Heuristic Inferences (applied, verify correctness)

- **admin_impersonation_sessions.started_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **ai_chat_conversations.title**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **ai_chat_conversations.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **ai_chat_conversations.message_count**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **ai_chat_conversations.last_message_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **ai_chat_conversations**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **ai_chat_messages.role**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [admin, user, editor, viewer]. Adjust to match your domain.
- **ai_chat_messages.tokens_used**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **api_keys.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **api_keys.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **api_keys.rate_limit_per_minute**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **api_keys.last_used_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **api_keys.usage_count**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **api_keys.expires_at**: Strategy "future_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **applied_fees.amount_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **applied_fees.waived**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_attempts.attempt_number**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_attempts.started_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_attempts.submitted_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_attempts.time_spent_seconds**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_attempts.raw_score**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_attempts.max_possible_score**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_attempts.percentage_score**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_attempts.passed**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_attempts.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **assessment_attempts.graded_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_questions.points**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_questions.partial_credit**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_questions.difficulty**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_questions.display_order**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_questions**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **assessment_responses.started_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_responses.answered_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_responses.time_spent_seconds**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_responses.points_earned**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_responses.max_points**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_responses.flagged_for_review**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **assessment_responses**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **atomic_concepts.title**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **atomic_concepts.sort_order**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **atomic_concepts.estimated_minutes**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **audit_logs.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **audit_logs.occurred_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **audit_logs.retention_days**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **auth_rate_limits.attempts**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **auth_rate_limits.window_start**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **auth_rate_limits.locked_until**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **auth_rate_limits**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **availability_exceptions.exception_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **availability_rules.day_of_week**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **availability_rules**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **bookings.start_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **bookings.end_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **bookings.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **bookings.notes**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **bookings.canceled_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **bookings.calendar_invite_sent**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **bookings.package_session_number**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **bookings.max_students**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **bookings**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **calendar_sync.last_synced_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **calendar_sync_log.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **calendar_sync_tokens.token_expires_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **calendar_sync_tokens.last_synced_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **calendar_sync_tokens**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **career_pathways.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **career_pathways.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **career_pathways.target_grades**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **career_pathways.order_index**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **career_pathways**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **certification_assessments.title**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments.time_limit_minutes**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments.available_from**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments.available_until**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments.max_attempts**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments.cooldown_hours**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments.passing_score**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments.max_score**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments.question_count**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments.randomize_questions**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments.randomize_options**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments.show_correct_answers**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments.show_explanations**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments.requires_proctoring**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments.requires_webcam**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments.allows_calculator**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments.allows_notes**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_assessments**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **certification_programs.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_programs.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_programs.level**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [basic, standard, premium]. Adjust to match your domain.
- **certification_programs.estimated_hours**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_programs.difficulty_rating**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_programs.min_age**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_programs.max_age**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_programs.grade_level_min**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_programs.grade_level_max**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_programs.validity_months**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_programs.price_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_programs.display_order**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_programs**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **certification_requirements.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_requirements.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_requirements.weight**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_requirements.display_order**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **certification_verifications.verified_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **classroom_sync.sync_enabled**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **classroom_sync.last_synced_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coach_earnings.period_start**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coach_earnings.period_end**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coach_earnings.total_revenue_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coach_earnings.coach_share_percent**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coach_earnings.coach_earnings_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coach_earnings.active_students**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coach_earnings.sessions_delivered**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coach_earnings.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **coach_earnings.paid_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coach_earnings.notes**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coach_earnings**: Temporal: approved_at after created_at (+0-14 days)
  - Action: Verify offset range matches your domain.
- **coach_earnings**: Temporal: paid_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **coaching_programs.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coaching_programs.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coaching_programs.monthly_price_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coaching_programs.sessions_per_month**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coaching_programs.max_students_per_coach**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coaching_programs.min_enrollment_months**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coaching_programs.grade_range_start**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coaching_programs.grade_range_end**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **coaching_programs**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **code_problems.title**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **code_problems.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **code_problems.time_limit_ms**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **code_problems.memory_limit_mb**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **code_problems**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **code_submissions.tests_passed**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **code_submissions.tests_total**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **code_submissions.execution_time_ms**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **code_submissions.score**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competition_registrations.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **competition_registrations.registered_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competition_results.score**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competition_results.max_possible_score**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competition_results.placement**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competition_results.percentile**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competition_results.notes**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competition_rounds.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competition_rounds.round_number**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competition_rounds.time_limit_minutes**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competition_rounds.max_score**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competition_rounds.sort_order**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competition_team_members.role**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [admin, user, editor, viewer]. Adjust to match your domain.
- **competition_team_members.joined_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competition_teams.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competitions.team_size_min**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competitions.team_size_max**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competitions.num_rounds**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competitions.time_limit_minutes**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **competitions.max_score**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **consent_templates.title**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **consent_templates.requires_signature**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **consent_templates.requires_checkbox**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **consent_templates.min_age_without_parent**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **consent_templates.effective_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **consent_templates.expiry_days**: Strategy "future_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **courses.title**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **courses.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **credit_ledger.balance_after**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **credit_ledger.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **csv_import_jobs.total_rows**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **csv_import_jobs.processed_rows**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **csv_import_jobs.success_rows**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **csv_import_jobs.error_rows**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **csv_import_jobs.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **csv_import_jobs**: Lifecycle: status controls completed_at (null when "pending")
  - Action: Verify "pending" is the correct active status value.
- **csv_import_jobs**: Temporal: completed_at after created_at (+1-60 days)
  - Action: Verify offset range matches your domain.
- **curriculum_units.title**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **curriculum_units.sort_order**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **custom_roles.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **custom_roles.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **desmos_states.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **desmos_states**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **diagnostics.administered_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **diagnostics.score**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **diagnostics.max_score**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **diagnostics.notes**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **drop_in_attendance.check_in_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **drop_in_attendance.check_out_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **drop_in_slots.title**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **drop_in_slots.subject**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **drop_in_slots.day_of_week**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **drop_in_slots.max_concurrent**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **drop_in_slots**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **equipment_assignments.assigned_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **equipment_assignments.due_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **equipment_assignments.returned_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **equipment_assignments.deposit_collected**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **equipment_assignments.deposit_returned**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **equipment_inventory.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **equipment_inventory.purchase_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **equipment_inventory.warranty_expiry**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **equipment_inventory.last_maintenance_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **equipment_inventory**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **equipment_types.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **equipment_types.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **equipment_types.purchase_price_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **equipment_types.rental_price_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **equipment_types.deposit_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **equipment_types.total_quantity**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **equipment_types.available_quantity**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **equipment_types**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **events.occurred_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **external_exam_scores.exam_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **external_exam_scores.score**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **external_exam_scores.max_score**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **external_exam_scores.percentile**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **external_exam_scores.verified**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **external_exam_scores.verified_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **external_exam_scores**: Temporal: verified_at after created_at (+0-7 days)
  - Action: Verify offset range matches your domain.
- **families.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **families.credit_balance**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **families**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **family_subscriptions.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **family_subscriptions.current_period_start**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **family_subscriptions.current_period_end**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **family_subscriptions.credits_remaining**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **family_subscriptions.credits_used_this_period**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **family_subscriptions.started_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **family_subscriptions.canceled_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **family_subscriptions.paused_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **family_subscriptions**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **fee_policies.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **fee_policies.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **fee_policies.amount_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **fee_policies.percentage**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **fee_policies.window_hours**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **fee_policies**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **group_session_students.enrolled_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **group_session_students.canceled_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_compensation_plans.base_rate_per_hour**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_compensation_plans.commission_percent**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_compensation_plans.session_bonus**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_compensation_plans.retention_bonus**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_compensation_plans.health_stipend**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_compensation_plans.training_budget**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_compensation_plans.technology_allowance**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_compensation_plans.effective_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_compensation_plans.expiration_date**: Strategy "future_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_compensation_plans**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **guide_levels.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_levels.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_levels.coach_focus_percent**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_levels.mentor_focus_percent**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_levels.min_experience_years**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_levels.hourly_rate_min**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_levels.hourly_rate_max**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_levels.max_students**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_levels.training_hours_required**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_levels.display_order**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **guide_levels**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **homework_items.title**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **homework_items.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **homework_items.due_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **homework_items.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **homework_items.submitted_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **homework_items.reviewed_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **homework_items**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **intake_diagnostics.student_grade**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **intake_diagnostics.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **intake_diagnostics.score**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **intake_diagnostics.max_score**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **intake_diagnostics.started_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **intake_diagnostics.expires_at**: Strategy "future_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **intake_diagnostics**: Lifecycle: status controls completed_at (null when "pending")
  - Action: Verify "pending" is the correct active status value.
- **intake_diagnostics**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **intake_diagnostics**: Temporal: completed_at after created_at (+1-60 days)
  - Action: Verify offset range matches your domain.
- **invoice_line_items.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **invoice_line_items.unit_price_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **invoice_line_items.amount_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **invoices.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **invoices.subtotal_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **invoices.tax_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **invoices.discount_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **invoices.total_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **invoices.due_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **invoices.issued_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **invoices.paid_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **invoices.voided_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **invoices.notes**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **invoices**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **invoices**: Temporal: paid_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **lead_activities.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **lead_source_stats.period_start**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **lead_source_stats.period_end**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **lead_source_stats.total_leads**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **lead_source_stats.qualified_leads**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **lead_source_stats.trials_scheduled**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **lead_source_stats.conversions**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **lead_source_stats.conversion_rate**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **lead_source_stats.avg_time_to_convert_days**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **leads.student_grade**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **leads.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **leads.notes**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **leads.score**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **leads.converted_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **leads.last_contacted_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **leads.next_follow_up_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **leads**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **learning_analytics.metric_value**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **learning_analytics.period_start**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **learning_analytics.period_end**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **math_competitions.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **math_competitions.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **math_competitions.grade_range_start**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **math_competitions.grade_range_end**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **math_competitions.registration_opens_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **math_competitions.registration_closes_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **math_competitions.competition_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **math_competitions.max_participants**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **math_competitions.entry_fee_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **math_competitions.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **math_competitions**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **message_threads.subject**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **message_threads.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **message_threads.last_message_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **message_threads**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **messages.body**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **messages.read_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **notification_preferences**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **notifications.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **notifications.scheduled_for**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **notifications.sent_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **notifications.retry_count**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **notifications.title**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **notifications.read_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **notifications**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **organization_members.joined_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **organizations.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **organizations.sso_enabled**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **organizations.sso_auto_provision**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **organizations.max_students**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **organizations.max_tutors**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **organizations.onboarded_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **organizations**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **parent_child_permissions.requires_student_approval**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **parent_child_permissions.granted_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **parent_child_permissions.expires_at**: Strategy "future_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **parent_child_permissions.revoked_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **parental_consents.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **parental_consents.student_age_at_consent**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **parental_consents.requested_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **parental_consents.responded_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **parental_consents.expires_at**: Strategy "future_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **parental_consents.revoked_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **parental_consents**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **payout_line_items.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **payout_line_items.rate_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **payout_line_items.amount_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **payout_periods.period_start**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **payout_periods.period_end**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **permissions.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **permissions.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **permissions.requires_audit**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **practice_logs.practice_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **practice_logs.duration_minutes**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **practice_logs.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **practice_logs.verified_by_coach**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **products.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **products.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **products.credits**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **products.price_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **products**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **program_attendance.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **program_attendance.check_in_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_attendance.check_out_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_attendance.notes**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_enrollments.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **program_enrollments.enrolled_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_enrollments.paused_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_enrollments.notes**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_enrollments.target_sessions_per_month**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_enrollments.target_practice_days_per_week**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_enrollments**: Lifecycle: status controls cancelled_at (null when "active")
  - Action: Verify "active" is the correct active status value.
- **program_enrollments**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **program_enrollments**: Temporal: cancelled_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **program_guides.min_guides_required**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_guides.max_guides_allowed**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_guides.guide_student_ratio**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_registrations.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **program_registrations.waitlist_position**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_registrations.amount_paid_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_registrations.consent_signed**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_registrations.consent_signed_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_registrations.equipment_returned**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_registrations.sessions_attended**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_registrations.registered_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_registrations.confirmed_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_registrations.canceled_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_sessions.session_number**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_sessions.title**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_sessions.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_sessions.start_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **program_sessions.end_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **programs.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **programs.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **programs.end_date**: Strategy "future_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **programs.min_participants**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **programs.max_participants**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **programs.current_enrollment**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **programs.waitlist_enabled**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **programs.price_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **programs.early_bird_price_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **programs.early_bird_deadline**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **programs.member_discount_percent**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **programs.min_grade**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **programs.max_grade**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **programs.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **programs.featured**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **programs.min_eligibility_score**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **programs.target_grades**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **programs**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **programs**: Temporal: end_date after start_date (+7-365 days)
  - Action: Verify offset range matches your domain.
- **purchases.amount_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **purchases.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **purchases.paid_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **purchases**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **purchases**: Temporal: paid_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **question_bank_categories.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **question_bank_categories.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **question_bank_categories.display_order**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **recurring_series.day_of_week**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **recurring_series.max_students**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **recurring_series.subject**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **recurring_series.title**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **recurring_series.starts_on**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **recurring_series.ends_on**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **recurring_series.total_generated**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **recurring_series.notes**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **recurring_series**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **referral_codes.total_referrals**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **referral_codes.total_conversions**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **referral_codes.total_reward_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **referral_reward_policies.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **referral_reward_policies.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **referral_reward_policies.referrer_reward_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **referral_reward_policies.referred_reward_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **referral_reward_policies.min_sessions_to_qualify**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **referral_reward_policies.expires_after_days**: Strategy "future_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **referrals.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **referrals.referrer_reward_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **referrals.referred_reward_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **referrals.reward_applied_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **referrals.converted_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **referrals.expired_at**: Strategy "future_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **referrals**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **referrals**: Temporal: expired_at after created_at (+30-365 days)
  - Action: Verify offset range matches your domain.
- **rooms.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **rooms.capacity**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **rooms.notes**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **rooms**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **scheduling_suggestions.suggested_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **scheduling_suggestions.score**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **scheduling_suggestions.expires_at**: Strategy "future_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **service_packages.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **service_packages.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **service_packages.price_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **service_packages.credits_per_period**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **service_packages.rollover_credits**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **service_packages.max_rollover**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **service_packages.session_duration_minutes**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **service_packages.requires_diagnostic**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **service_packages.display_order**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **service_packages**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **session_attachments.file_size**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **session_attendance.scheduled_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **session_attendance.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **session_attendance.notes**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **session_attendance**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **session_feedback.attendance_confirmed**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **session_feedback.submitted_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **session_skills.notes**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **session_whiteboards.version**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **session_whiteboards**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **sessions.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **sessions.started_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **sessions**: Lifecycle: status controls completed_at (null when "pending")
  - Action: Verify "pending" is the correct active status value.
- **sessions**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **sessions**: Temporal: completed_at after created_at (+1-60 days)
  - Action: Verify offset range matches your domain.
- **skills.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **skills.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **skills.order_index**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **skills**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **sso_sessions.token_expires_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **sso_sessions.started_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **sso_sessions.last_activity_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **stripe_webhook_events**: Temporal: processed_at after created_at (+0-7 days)
  - Action: Verify offset range matches your domain.
- **student_concept_mastery.assessed_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **student_concept_mastery.notes**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **student_concept_mastery**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **student_eligibility_profiles.assessment_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **student_eligibility_profiles.academic_performance**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **student_eligibility_profiles.math_passion**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **student_eligibility_profiles.achievement_level**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **student_eligibility_profiles.career_direction**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **student_eligibility_profiles.personal_qualities**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **student_eligibility_profiles.total_score**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **student_eligibility_profiles.notes**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **student_eligibility_profiles.next_assessment_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **student_eligibility_profiles**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **student_pathway_recommendations.confidence_score**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **student_pathway_recommendations.recommended_start_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **student_pathway_recommendations.estimated_completion_months**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **student_pathway_recommendations**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **student_skill_mastery.last_practiced_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **student_skill_mastery**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **students_profile.grade**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [basic, standard, premium]. Adjust to match your domain.
- **students_profile.notes**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **students_profile.age_verified**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **students_profile.age_verified_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **students_profile**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **trial_lessons.student_grade**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **trial_lessons.subject**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **trial_lessons.scheduled_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **trial_lessons.duration_minutes**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **trial_lessons.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **trial_lessons.tutor_rating**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **trial_lessons.parent_rating**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **trial_lessons**: Lifecycle: status controls completed_at (null when "pending")
  - Action: Verify "pending" is the correct active status value.
- **trial_lessons**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **trial_lessons**: Temporal: completed_at after created_at (+1-60 days)
  - Action: Verify offset range matches your domain.
- **trust_events.delta**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **trust_events.note**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **trust_scores.score**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **trust_scores.level**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [basic, standard, premium]. Adjust to match your domain.
- **trust_scores.sessions_completed**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **trust_scores.positive_reports**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **trust_scores.concerns_raised**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **trust_scores.last_session_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **trust_scores**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **tutor_certifications.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_certifications.issue_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_certifications.expiry_date**: Strategy "future_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_certifications.verified**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_certifications.verified_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_certifications**: Temporal: verified_at after created_at (+0-7 days)
  - Action: Verify offset range matches your domain.
- **tutor_pay_rates.rate_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_pay_rates.effective_until**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_pay_rates**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **tutor_payouts.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **tutor_payouts.sessions_count**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_payouts.total_hours**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_payouts.base_amount_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_payouts.bonus_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_payouts.deduction_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_payouts.total_amount_cents**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_payouts.notes**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_payouts.paid_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_payouts**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **tutor_payouts**: Temporal: approved_at after created_at (+0-14 days)
  - Action: Verify offset range matches your domain.
- **tutor_payouts**: Temporal: paid_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **tutor_verifications.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **tutor_verifications.passed**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_verifications.score**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_verifications.reviewed_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_verifications.verified_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_verifications.expires_at**: Strategy "future_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_verifications.submitted_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutor_verifications**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **tutor_verifications**: Temporal: verified_at after created_at (+0-7 days)
  - Action: Verify offset range matches your domain.
- **tutors_profile.hourly_rate**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutors_profile.verification_completed_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutors_profile.background_check_clear**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutors_profile.background_check_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutors_profile.identity_verified**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutors_profile.credentials_verified**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutors_profile.eligible_grades**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutors_profile.max_concurrent_students**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutors_profile.guide_certified_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutors_profile.guide_certification_expires_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **tutors_profile**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **user_certification_progress.started_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **user_certification_progress.last_activity_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **user_certification_progress.completion_percentage**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **user_certification_progress.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **user_certifications.earned_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **user_certifications.score**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **user_certifications.valid_from**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **user_certifications.valid_until**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **user_certifications.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **user_certifications.revoked_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **user_certifications.certificate_generated_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **user_certifications.shared_to_linkedin**: Strategy "boolean" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **user_certifications**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **user_integrations.token_expiry**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **user_integrations.connected_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **user_role_assignments.granted_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **user_role_assignments.expires_at**: Strategy "future_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **users_profile.role**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [admin, user, editor, viewer]. Adjust to match your domain.
- **users_profile.full_name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **users_profile**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **waitlist.preferred_date**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **waitlist.status**: Strategy "enum" inferred from column name/type
  - Action: Review enum values: [active, inactive, suspended]. Adjust to match your domain.
- **waitlist.notes**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **waitlist**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.
- **weekly_reports.week_start**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **weekly_reports.week_end**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **weekly_reports.sessions_count**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **weekly_reports.attendance_rate**: Strategy "decimal" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **weekly_reports.generated_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **weekly_reports.sent_at**: Strategy "past_date" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **whiteboards.name**: Strategy "fullName" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **whiteboards.description**: Strategy "sentence" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **whiteboards.version**: Strategy "integer" inferred from column name/type
  - Action: Verify strategy is correct for your domain.
- **whiteboards**: Temporal: updated_at after created_at (+0-30 days)
  - Action: Verify offset range matches your domain.

### Tier 3 — Needs Developer Input

- **admin_impersonation_sessions.reason**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **admin_impersonation_sessions.pages_visited**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **admin_impersonation_sessions.actions_taken**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **admin_impersonation_sessions.ip_address**: Low confidence: "word" — Unknown type "INET" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **admin_impersonation_sessions.user_agent**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **ai_chat_conversations.metadata**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **ai_chat_messages.content**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **ai_chat_messages.skill_references**: Low confidence: "word" — Unknown type "_UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **ai_chat_messages.metadata**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **api_keys.key_prefix**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **api_keys.key_hash**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **api_keys.scopes**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **api_keys.allowed_ips**: Low confidence: "word" — Unknown type "_INET" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **applied_fees.fee_type**: Low confidence: "word" — Unknown type "FEE_TYPE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **applied_fees.reason**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **applied_fees.waived_by**: Low confidence: "word" — Unknown type "UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **applied_fees.waived_reason**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_attempts.question_order**: Low confidence: "word" — Unknown type "_UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_attempts.proctoring_notes**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_attempts.proctoring_flags**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_attempts.graded_by**: Low confidence: "word" — Unknown type "UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_attempts.grading_notes**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_attempts.user_agent**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_attempts.ip_address**: Low confidence: "word" — Unknown type "INET" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_attempts.metadata**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_questions.question_type**: Low confidence: "word" — Unknown type "QUESTION_TYPE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_questions.question_text**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_questions.question_html**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_questions.question_image_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_questions.latex_content**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_questions.desmos_state**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_questions.options**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_questions.correct_answer**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_questions.partial_credit_rules**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_questions.hint**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_questions.explanation**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_questions.explanation_video_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_questions.skill_ids**: Low confidence: "word" — Unknown type "_UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_questions.tags**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_questions.question_group**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_responses.response**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_responses.response_text**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_responses.response_file_urls**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_responses.auto_feedback**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_responses.manual_feedback**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_responses.graded_by**: Low confidence: "word" — Unknown type "UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **assessment_responses.flag_reason**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **atomic_concepts.lesson_number**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **atomic_concepts.key_skills**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **atomic_concepts.standard_code**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **atomic_concepts.common_misconceptions**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **atomic_concepts.teaching_notes**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **atomic_concepts.prerequisite_concepts**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **atomic_concepts.career_connections**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **atomic_concepts.difficulty_level**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **audit_logs.actor_role**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **audit_logs.action**: Low confidence: "word" — Unknown type "AUDIT_ACTION" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **audit_logs.resource_type**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **audit_logs.old_values**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **audit_logs.new_values**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **audit_logs.metadata**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **audit_logs.ip_address**: Low confidence: "word" — Unknown type "INET" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **audit_logs.user_agent**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **audit_logs.data_categories**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **auth_rate_limits.identifier**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **auth_rate_limits.action**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **availability_exceptions.start_time**: Low confidence: "word" — Unknown type "TIME" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **availability_exceptions.end_time**: Low confidence: "word" — Unknown type "TIME" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **availability_exceptions.reason**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **availability_rules.start_time**: Low confidence: "word" — Unknown type "TIME" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **availability_rules.end_time**: Low confidence: "word" — Unknown type "TIME" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **bookings.modality**: Low confidence: "word" — Unknown type "MODALITY" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **bookings.canceled_by**: Low confidence: "word" — Unknown type "UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **bookings.cancel_reason**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **bookings.video_link**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **calendar_sync.provider**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **calendar_sync.sync_status**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **calendar_sync_log.provider**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **calendar_sync_log.action**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **calendar_sync_log.error_message**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **calendar_sync_tokens.provider**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **calendar_sync_tokens.access_token**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **calendar_sync_tokens.refresh_token**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **calendar_sync_tokens.sync_direction**: Low confidence: "word" — Unknown type "SYNC_DIRECTION" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **career_pathways.code**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **career_pathways.icon_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **career_pathways.color**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **career_pathways.prerequisite_tracks**: Low confidence: "word" — Unknown type "_COURSE_TRACK" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **career_pathways.career_outcomes**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **career_pathways.certifications**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **career_pathways.guide_specializations**: Low confidence: "word" — Unknown type "_GUIDE_LEVEL" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **career_pathways.min_guide_level**: Low confidence: "word" — Unknown type "GUIDE_LEVEL" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_assessments.code**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_assessments.instructions**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_assessments.assessment_type**: Low confidence: "word" — Unknown type "ASSESSMENT_TYPE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_assessments.rubric**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_assessments.metadata**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_programs.code**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_programs.short_description**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_programs.cert_type**: Low confidence: "word" — Unknown type "CERTIFICATION_TYPE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_programs.category**: Low confidence: "enum" — Inferred enum from column name "category"
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_programs.icon_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_programs.badge_image_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_programs.badge_color**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_programs.target_audience**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_programs.prerequisite_program_ids**: Low confidence: "word" — Unknown type "_UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_programs.metadata**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_requirements.requirement_type**: Low confidence: "word" — Unknown type "REQUIREMENT_TYPE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_requirements.parameters**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_verifications.verifier_name**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_verifications.verifier_email**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_verifications.verifier_organization**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_verifications.ip_address**: Low confidence: "word" — Unknown type "INET" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **certification_verifications.user_agent**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **classroom_sync.course_name**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **coach_earnings.payout_reference**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **coaching_programs.slug**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **coaching_programs.track_level**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **code_problems.difficulty**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **code_problems.language**: Low confidence: "word" — Unknown type "CODE_LANGUAGE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **code_problems.starter_code**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **code_problems.solution_code**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **code_problems.test_cases**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **code_problems.topic**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **code_problems.hints**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **code_problems.created_by**: Low confidence: "word" — Unknown type "UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **code_submissions.language**: Low confidence: "word" — Unknown type "CODE_LANGUAGE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **code_submissions.source_code**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **code_submissions.verdict**: Low confidence: "word" — Unknown type "SUBMISSION_VERDICT" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **code_submissions.test_results**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **code_submissions.ai_feedback**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **code_submissions.tutor_feedback**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **competition_registrations.payment_status**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **competition_registrations.team_name**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **competition_results.badge_earned**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **competition_rounds.round_type**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **competition_rounds.concept_ids**: Low confidence: "word" — Unknown type "_UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **competitions.format**: Low confidence: "word" — Unknown type "COMPETITION_FORMAT" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **competitions.scoring_rules**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **competitions.tiebreaker_rules**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **competitions.prizes**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **competitions.rules_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **competitions.allowed_resources**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **competitions.prohibited_items**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **consent_templates.consent_type**: Low confidence: "word" — Unknown type "CONSENT_TYPE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **consent_templates.version**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **consent_templates.summary**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **consent_templates.full_text**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **courses.code**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **courses.grade_level**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **courses.state_standard**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **credit_ledger.transaction_type**: Low confidence: "word" — Unknown type "CREDIT_TRANSACTION_TYPE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **credit_ledger.reference_type**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **csv_import_jobs.entity_type**: Low confidence: "word" — Unknown type "IMPORT_ENTITY" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **csv_import_jobs.file_name**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **csv_import_jobs.errors**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **csv_import_jobs.imported_by**: Low confidence: "word" — Unknown type "UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **custom_roles.permissions**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **desmos_states.state_json**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **desmos_states.screenshot_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **diagnostics.course_track**: Low confidence: "word" — Unknown type "COURSE_TRACK" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **diagnostics.results_json**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **drop_in_attendance.topics_covered**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **drop_in_attendance.tutor_notes**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **drop_in_slots.start_time**: Low confidence: "word" — Unknown type "TIME" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **drop_in_slots.end_time**: Low confidence: "word" — Unknown type "TIME" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **drop_in_slots.modality**: Low confidence: "word" — Unknown type "MODALITY" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **equipment_assignments.condition_at_checkout**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **equipment_assignments.condition_at_return**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **equipment_assignments.damage_notes**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **equipment_inventory.serial_number**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **equipment_inventory.asset_tag**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **equipment_inventory.condition**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **equipment_inventory.condition_notes**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **equipment_inventory.current_location**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **equipment_types.manufacturer**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **equipment_types.model_number**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **equipment_types.category**: Low confidence: "enum" — Inferred enum from column name "category"
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **equipment_types.kit_contents**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **equipment_types.image_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **equipment_types.manual_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **events.type**: Low confidence: "enum" — Inferred enum from column name "type"
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **events.subject_type**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **events.data**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **external_exam_scores.exam_type**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **external_exam_scores.verified_by**: Low confidence: "word" — Unknown type "UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **external_exam_scores.verification_document_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **external_exam_scores.metadata**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **family_members.member_role**: Low confidence: "word" — Unknown type "FAMILY_MEMBER_ROLE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **family_subscriptions.cancel_reason**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **fee_policies.fee_type**: Low confidence: "word" — Unknown type "FEE_TYPE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **group_session_students.attendance_status**: Low confidence: "word" — Unknown type "ATTENDANCE_STATUS" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **guide_compensation_plans.outcome_bonus_rules**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **guide_levels.level_code**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **guide_levels.required_certifications**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **homework_items.submission_text**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **homework_items.submission_file_path**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **homework_items.review_notes**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **homework_items.reviewed_by**: Low confidence: "word" — Unknown type "UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **intake_diagnostics.student_goals**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **intake_diagnostics.current_challenges**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **intake_diagnostics.course_track**: Low confidence: "word" — Unknown type "COURSE_TRACK" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **intake_diagnostics.questions_json**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **intake_diagnostics.responses_json**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **intake_diagnostics.gap_analysis_json**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **intake_diagnostics.strength_areas**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **intake_diagnostics.weakness_areas**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **intake_diagnostics.recommended_tier**: Low confidence: "word" — Unknown type "SERVICE_TIER" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **intake_diagnostics.recommendation_reasoning**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **invoice_line_items.line_type**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **invoices.invoice_number**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **invoices.metadata**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **lead_activities.activity_type**: Low confidence: "word" — Unknown type "LEAD_ACTIVITY_TYPE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **lead_activities.metadata**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **lead_activities.created_by**: Low confidence: "word" — Unknown type "UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **lead_source_stats.source**: Low confidence: "enum" — Inferred enum from column name "source"
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **leads.parent_name**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **leads.parent_email**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **leads.parent_phone**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **leads.student_name**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **leads.source**: Low confidence: "enum" — Inferred enum from column name "source"
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **leads.source_detail**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **leads.subjects_interested**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **leads.goals**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **leads.budget_range**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **leads.preferred_modality**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **leads.preferred_schedule**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **leads.assigned_to**: Low confidence: "word" — Unknown type "UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **leads.lost_reason**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **learning_analytics.metric_type**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **learning_analytics.details**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **math_competitions.slug**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **math_competitions.competition_type**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **math_competitions.location**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **message_threads.participant_a**: Low confidence: "word" — Unknown type "UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **message_threads.participant_b**: Low confidence: "word" — Unknown type "UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **notification_preferences.channel**: Low confidence: "enum" — Inferred enum from column name "channel"
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **notification_preferences.notification_type**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **notifications.channel**: Low confidence: "enum" — Inferred enum from column name "channel"
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **notifications.template_key**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **notifications.payload_json**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **notifications.error_message**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **notifications.type**: Low confidence: "enum" — Inferred enum from column name "type"
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **notifications.message**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **notifications.data**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **organization_members.org_role**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **organization_members.external_email**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **organizations.slug**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **organizations.type**: Low confidence: "enum" — Inferred enum from column name "type"
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **organizations.address_line1**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **organizations.address_line2**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **organizations.sso_provider**: Low confidence: "word" — Unknown type "SSO_PROVIDER" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **organizations.sso_config**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **organizations.sso_domain**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **organizations.logo_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **organizations.primary_color**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **organizations.billing_email**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **organizations.subscription_tier**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **parent_child_permissions.permissions**: Low confidence: "word" — Unknown type "_PARENT_PERMISSION" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **parent_child_permissions.relationship**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **parental_consents.consent_type**: Low confidence: "word" — Unknown type "CONSENT_TYPE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **parental_consents.consent_version**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **parental_consents.consent_text_hash**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **parental_consents.ip_address**: Low confidence: "word" — Unknown type "INET" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **parental_consents.user_agent**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **parental_consents.revoked_reason**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **parental_consents.signature_data**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **payout_line_items.line_type**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **payout_periods.period_type**: Low confidence: "word" — Unknown type "PAYOUT_PERIOD_TYPE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **permissions.code**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **permissions.category**: Low confidence: "enum" — Inferred enum from column name "category"
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **permissions.default_for_roles**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **practice_logs.concepts_practiced**: Low confidence: "word" — Unknown type "_UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **products.product_type**: Low confidence: "word" — Unknown type "PRODUCT_TYPE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **products.metadata**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **products.guide_level_required**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **products.eligibility_tier_required**: Low confidence: "word" — Unknown type "ELIGIBILITY_TIER" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **program_registrations.payment_status**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **program_registrations.emergency_contact_name**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **program_registrations.emergency_contact_phone**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **program_registrations.medical_notes**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **program_registrations.equipment_assigned**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **program_registrations.cancel_reason**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **program_sessions.location_name**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **program_sessions.video_link**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **program_sessions.topics**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **program_sessions.materials_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **program_sessions.homework_description**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.slug**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.program_type**: Low confidence: "word" — Unknown type "PROGRAM_TYPE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.schedule_details**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.timezone**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.prerequisite_skills**: Low confidence: "word" — Unknown type "_UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.prerequisite_programs**: Low confidence: "word" — Unknown type "_UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.modality**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.location_name**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.location_address**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.video_platform**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.syllabus_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.materials_included**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.equipment_required**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.assistant_instructor_ids**: Low confidence: "word" — Unknown type "_UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.cover_image_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.gallery_urls**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.tags**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **programs.guide_level_required**: Low confidence: "word" — Unknown type "GUIDE_LEVEL" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **question_bank_categories.slug**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **recurring_series.pattern**: Low confidence: "word" — Unknown type "RECURRENCE_PATTERN" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **recurring_series.start_time**: Low confidence: "word" — Unknown type "TIME" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **recurring_series.end_time**: Low confidence: "word" — Unknown type "TIME" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **recurring_series.modality**: Low confidence: "word" — Unknown type "MODALITY" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **recurring_series.created_by**: Low confidence: "word" — Unknown type "UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **referral_codes.code**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **referrals.referred_name**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **referrals.referred_email**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **rooms.room_type**: Low confidence: "word" — Unknown type "ROOM_TYPE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **rooms.location**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **rooms.floor**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **rooms.equipment**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **rooms.virtual_link**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **scheduling_suggestions.suggested_start_time**: Low confidence: "word" — Unknown type "TIME" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **scheduling_suggestions.suggested_end_time**: Low confidence: "word" — Unknown type "TIME" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **scheduling_suggestions.reason**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **service_packages.slug**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **service_packages.tagline**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **service_packages.service_tier**: Low confidence: "word" — Unknown type "SERVICE_TIER" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **service_packages.billing_type**: Low confidence: "word" — Unknown type "PACKAGE_BILLING_TYPE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **service_packages.min_eligibility_tier**: Low confidence: "word" — Unknown type "ELIGIBILITY_TIER" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **service_packages.feature_gates**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **service_packages.metadata**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **session_attachments.file_name**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **session_attachments.file_path**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **session_attachments.mime_type**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **session_attachments.uploaded_by**: Low confidence: "word" — Unknown type "UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **session_feedback.reflection**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **session_feedback.parent_concern**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **session_skills.exposure_level**: Low confidence: "word" — Unknown type "SKILL_EXPOSURE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **session_whiteboards.elements**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **sessions.attendance_status**: Low confidence: "word" — Unknown type "ATTENDANCE_STATUS" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **sessions.internal_notes**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **sessions.parent_summary**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **sessions.next_steps**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **sessions.service_tier**: Low confidence: "word" — Unknown type "SERVICE_TIER" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **skills.course_track**: Low confidence: "word" — Unknown type "COURSE_TRACK" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **skills.code**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **skills.category**: Low confidence: "enum" — Inferred enum from column name "category"
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **sso_sessions.provider**: Low confidence: "word" — Unknown type "SSO_PROVIDER" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **sso_sessions.access_token**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **sso_sessions.refresh_token**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **sso_sessions.ip_address**: Low confidence: "word" — Unknown type "INET" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **sso_sessions.user_agent**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **stripe_webhook_events.event_type**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **stripe_webhook_events.payload_json**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **stripe_webhook_events.error_message**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **student_concept_mastery.mastery_level**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **student_pathway_recommendations.reason_codes**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **student_pathway_recommendations.suggested_programs**: Low confidence: "word" — Unknown type "_UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **student_skill_mastery.mastery_level**: Low confidence: "word" — Unknown type "MASTERY_LEVEL" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **students_profile.course_track**: Low confidence: "word" — Unknown type "COURSE_TRACK" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **students_profile.goals**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **students_profile.current_service_tier**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **trial_lessons.student_name**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **trial_lessons.modality**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **trial_lessons.tutor_notes**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **trial_lessons.parent_feedback**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **trial_lessons.recommended_track**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **trial_lessons.recommended_package**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **trust_events.event_type**: Low confidence: "word" — Unknown type "TRUST_EVENT_TYPE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **trust_events.created_by**: Low confidence: "word" — Unknown type "UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutor_certifications.issuing_organization**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutor_certifications.document_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutor_pay_rates.label**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutor_pay_rates.rate_type**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutor_payouts.approved_by**: Low confidence: "word" — Unknown type "UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutor_verifications.verification_type**: Low confidence: "word" — Unknown type "VERIFICATION_TYPE" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutor_verifications.provider**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutor_verifications.document_urls**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutor_verifications.document_names**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutor_verifications.result_data**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutor_verifications.review_notes**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutor_verifications.rejection_reason**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutors_profile.bio**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutors_profile.specialties**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutors_profile.timezone**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutors_profile.verification_status**: Low confidence: "word" — Unknown type "VERIFICATION_STATUS" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutors_profile.guide_level**: Low confidence: "word" — Unknown type "GUIDE_LEVEL" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **tutors_profile.career_pathway_specializations**: Low confidence: "word" — Unknown type "_UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **user_certification_progress.requirements_completed**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **user_certification_progress.metadata**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **user_certifications.credential_number**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **user_certifications.revoked_reason**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **user_certifications.revoked_by**: Low confidence: "word" — Unknown type "UUID" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **user_certifications.verification_token**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **user_certifications.verification_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **user_certifications.badge_image_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **user_certifications.certificate_pdf_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **user_certifications.achievement_details**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **user_certifications.metadata**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **user_integrations.provider**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **user_integrations.access_token**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **user_integrations.refresh_token**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **user_integrations.scopes**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **user_integrations.metadata**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **users_profile.avatar_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **users_profile.timezone**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **users_profile.time_format**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **waitlist.preferred_start_time**: Low confidence: "word" — Unknown type "TIME" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **waitlist.preferred_end_time**: Low confidence: "word" — Unknown type "TIME" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **waitlist.modality**: Low confidence: "word" — Unknown type "MODALITY" — defaulted to word
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **weekly_reports.skills_practiced**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **weekly_reports.mastery_changes**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **weekly_reports.summary_text**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **weekly_reports.recommendations**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **weekly_reports.at_risk_reasons**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **whiteboards.category**: Low confidence: "enum" — Inferred enum from column name "category"
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **whiteboards.elements**: Low confidence: "json" — JSON column — will generate empty object
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **whiteboards.tags**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **zoom_meetings.join_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **zoom_meetings.start_url**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.
- **zoom_meetings.password**: Low confidence: "sentence" — Generic text — review strategy
  - Action: Set the correct strategy and/or enum values in the pack JSON.

## Table Details

### users_profile (root)
- Generation order: 0
- Row ratio: 1x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| role | enum | medium |  | NOT NULL | Inferred enum from column name "role" |
| full_name | fullName | medium |  | NOT NULL |  |
| email | email | high |  | NOT NULL |  |
| phone | phone | high |  | 15% |  |
| avatar_url | sentence | low |  | 15% | Generic text — review strategy |
| timezone | sentence | low |  | NOT NULL | Generic text — review strategy |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |
| time_format | sentence | low |  | NOT NULL | Generic text — review strategy |

### admin_impersonation_sessions (refs: users_profile, users_profile)
- Generation order: 1
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| admin_user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| target_user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| reason | sentence | low |  | NOT NULL | Generic text — review strategy |
| ticket_id | uuid | high |  | 15% |  |
| started_at | past_date | medium |  | 15% |  |
| ended_at | past_date | high |  | 15% |  |
| pages_visited | sentence | low |  | 15% | Generic text — review strategy |
| actions_taken | json | low |  | 15% | JSON column — will generate empty object |
| ip_address | word | low |  | 15% | Unknown type "INET" — defaulted to word |
| user_agent | sentence | low |  | 15% | Generic text — review strategy |

### organizations (root)
- Generation order: 2
- Row ratio: 1x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| name | fullName | medium |  | NOT NULL |  |
| slug | sentence | low |  | NOT NULL | Generic text — review strategy |
| type | enum | low |  | NOT NULL | Inferred enum from column name "type" |
| email | email | high |  | 15% |  |
| phone | phone | high |  | 15% |  |
| website | url | high |  | 15% |  |
| address_line1 | sentence | low |  | 15% | Generic text — review strategy |
| address_line2 | sentence | low |  | 15% | Generic text — review strategy |
| city | city | high |  | 15% |  |
| state | state | high |  | 15% |  |
| postal_code | zipCode | high |  | 15% |  |
| country | country | high |  | 15% |  |
| sso_enabled | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| sso_provider | word | low |  | 15% | Unknown type "SSO_PROVIDER" — defaulted to word |
| sso_config | json | low |  | 15% | JSON column — will generate empty object |
| sso_domain | sentence | low |  | 15% | Generic text — review strategy |
| sso_auto_provision | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| logo_url | sentence | low |  | 15% | Generic text — review strategy |
| primary_color | sentence | low |  | 15% | Generic text — review strategy |
| billing_email | sentence | low |  | 15% | Generic text — review strategy |
| stripe_customer_id | uuid | high |  | 15% |  |
| subscription_tier | sentence | low |  | 15% | Generic text — review strategy |
| max_students | integer | medium |  | 15% | Inferred from integer type |
| max_tutors | integer | medium |  | 15% | Inferred from integer type |
| is_active | boolean | high |  | 15% |  |
| onboarded_at | past_date | medium |  | 15% |  |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### families (refs: organizations)
- Generation order: 3
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| name | fullName | medium |  | NOT NULL |  |
| primary_parent_user_id | uuid | high |  | NOT NULL |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |
| stripe_customer_id | uuid | high |  | 15% |  |
| organization_id | uuid | high | → organizations.id | 10% | FK → organizations.id |
| credit_balance | integer | medium |  | NOT NULL | Inferred from integer type |

### rooms (refs: organizations)
- Generation order: 4
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| name | fullName | medium |  | NOT NULL |  |
| room_type | word | low |  | NOT NULL | Unknown type "ROOM_TYPE" — defaulted to word |
| capacity | integer | medium |  | NOT NULL | Inferred from integer type |
| location | sentence | low |  | 15% | Generic text — review strategy |
| floor | sentence | low |  | 15% | Generic text — review strategy |
| equipment | sentence | low |  | 15% | Generic text — review strategy |
| is_virtual | boolean | high |  | NOT NULL |  |
| virtual_link | sentence | low |  | 15% | Generic text — review strategy |
| is_active | boolean | high |  | NOT NULL |  |
| notes | sentence | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |
| organization_id | uuid | high | → organizations.id | 10% | FK → organizations.id |

### guide_levels (root)
- Generation order: 5
- Row ratio: 1x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| level_code | sentence | low |  | NOT NULL | Generic text — review strategy |
| name | fullName | medium |  | NOT NULL |  |
| description | sentence | medium |  | 15% |  |
| coach_focus_percent | integer | medium |  | NOT NULL | Inferred from integer type |
| mentor_focus_percent | integer | medium |  | NOT NULL | Inferred from integer type |
| min_experience_years | integer | medium |  | 15% | Inferred from integer type |
| required_certifications | sentence | low |  | 15% | Generic text — review strategy |
| hourly_rate_min | decimal | medium |  | 15% | Inferred from numeric type |
| hourly_rate_max | decimal | medium |  | 15% | Inferred from numeric type |
| max_students | integer | medium |  | 15% | Inferred from integer type |
| training_hours_required | integer | medium |  | 15% | Inferred from integer type |
| is_active | boolean | high |  | 15% |  |
| display_order | integer | medium |  | 15% | Inferred from integer type |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### tutors_profile (refs: guide_levels)
- Generation order: 6
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| user_id | uuid | high |  | 15% | Primary key (UUID) |
| bio | sentence | low |  | 15% | Generic text — review strategy |
| specialties | sentence | low |  | 15% | Generic text — review strategy |
| timezone | sentence | low |  | NOT NULL | Generic text — review strategy |
| is_active | boolean | high |  | NOT NULL |  |
| hourly_rate | integer | medium |  | 15% | Inferred from integer type |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |
| verification_status | word | low |  | 15% | Unknown type "VERIFICATION_STATUS" — defaulted to word |
| verification_completed_at | past_date | medium |  | 15% |  |
| can_teach_minors | boolean | high |  | 15% |  |
| background_check_clear | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| background_check_date | past_date | medium |  | 15% | Inferred from DATE type |
| identity_verified | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| credentials_verified | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| guide_level | word | low |  | 15% | Unknown type "GUIDE_LEVEL" — defaulted to word |
| guide_level_code | uuid | high | → guide_levels.level_code | 10% | FK → guide_levels.level_code |
| career_pathway_specializations | word | low |  | 15% | Unknown type "_UUID" — defaulted to word |
| eligible_grades | integer | medium |  | 15% | Inferred from integer type |
| max_concurrent_students | integer | medium |  | 15% | Inferred from integer type |
| guide_certified_at | past_date | medium |  | 15% |  |
| guide_certification_expires_at | past_date | medium |  | 15% |  |

### service_packages (refs: guide_levels)
- Generation order: 7
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| name | fullName | medium |  | NOT NULL |  |
| slug | sentence | low |  | NOT NULL | Generic text — review strategy |
| description | sentence | medium |  | 15% |  |
| tagline | sentence | low |  | 15% | Generic text — review strategy |
| service_tier | word | low |  | NOT NULL | Unknown type "SERVICE_TIER" — defaulted to word |
| billing_type | word | low |  | NOT NULL | Unknown type "PACKAGE_BILLING_TYPE" — defaulted to word |
| price_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| currency | enum | high |  | NOT NULL | Inferred enum from column name "currency" |
| credits_per_period | integer | medium |  | NOT NULL | Inferred from integer type |
| rollover_credits | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| max_rollover | integer | medium |  | 15% | Inferred from integer type |
| session_duration_minutes | integer | medium |  | 15% | Inferred from integer type |
| guide_level_required | uuid | high | → guide_levels.level_code | 10% | FK → guide_levels.level_code |
| min_eligibility_tier | word | low |  | 15% | Unknown type "ELIGIBILITY_TIER" — defaulted to word |
| requires_diagnostic | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| feature_gates | json | low |  | NOT NULL | JSON column — will generate empty object |
| stripe_product_id | uuid | high |  | 15% |  |
| stripe_price_id | uuid | high |  | 15% |  |
| is_active | boolean | high |  | 15% |  |
| is_featured | boolean | high |  | 15% |  |
| display_order | integer | medium |  | 15% | Inferred from integer type |
| metadata | json | low |  | 15% | JSON column — will generate empty object |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### family_subscriptions (refs: families, users_profile, service_packages, tutors_profile)
- Generation order: 8
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| family_id | uuid | high | → families.id | NOT NULL | FK → families.id |
| student_user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| package_id | uuid | high | → service_packages.id | NOT NULL | FK → service_packages.id |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| current_period_start | past_date | medium |  | NOT NULL | Inferred from TIMESTAMP type |
| current_period_end | past_date | medium |  | NOT NULL | Inferred from TIMESTAMP type |
| credits_remaining | integer | medium |  | NOT NULL | Inferred from integer type |
| credits_used_this_period | integer | medium |  | NOT NULL | Inferred from integer type |
| assigned_guide_id | uuid | high | → tutors_profile.user_id | 10% | FK → tutors_profile.user_id |
| stripe_subscription_id | uuid | high |  | 15% |  |
| stripe_customer_id | uuid | high |  | 15% |  |
| started_at | past_date | medium |  | 15% |  |
| canceled_at | past_date | medium |  | 15% |  |
| cancel_reason | sentence | low |  | 15% | Generic text — review strategy |
| paused_at | past_date | medium |  | 15% |  |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### bookings (refs: families, tutors_profile, family_subscriptions, rooms)
- Generation order: 9
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| family_id | uuid | high | → families.id | NOT NULL | FK → families.id |
| student_user_id | uuid | high |  | NOT NULL |  |
| parent_user_id | uuid | high |  | NOT NULL |  |
| tutor_user_id | uuid | high | → tutors_profile.user_id | NOT NULL | FK → tutors_profile.user_id |
| start_at | past_date | medium |  | NOT NULL |  |
| end_at | past_date | medium |  | NOT NULL |  |
| modality | word | low |  | NOT NULL | Unknown type "MODALITY" — defaulted to word |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| notes | sentence | medium |  | 15% |  |
| canceled_at | past_date | medium |  | 15% |  |
| canceled_by | word | low |  | 15% | Unknown type "UUID" — defaulted to word |
| cancel_reason | sentence | low |  | 15% | Generic text — review strategy |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |
| video_link | sentence | low |  | 15% | Generic text — review strategy |
| calendar_invite_sent | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| subscription_id | uuid | high | → family_subscriptions.id | 10% | FK → family_subscriptions.id |
| package_session_number | integer | medium |  | 15% | Inferred from integer type |
| room_id | uuid | high | → rooms.id | 10% | FK → rooms.id |
| is_group_session | boolean | high |  | NOT NULL |  |
| max_students | integer | medium |  | 15% | Inferred from integer type |
| recurrence_id | uuid | high |  | 15% |  |
| is_drop_in | boolean | high |  | NOT NULL |  |

### sessions (refs: bookings)
- Generation order: 10
- Row ratio: 0.5x
- Lifecycle: status → completed_at (null when pending)
- Temporal: updated_at after created_at (+0-30d), completed_at after created_at (+1-60d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| booking_id | uuid | high | → bookings.id | NOT NULL | FK → bookings.id |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| attendance_status | word | low |  | 15% | Unknown type "ATTENDANCE_STATUS" — defaulted to word |
| started_at | past_date | medium |  | 15% |  |
| completed_at | past_date | high |  | 70% |  |
| internal_notes | sentence | low |  | 15% | Generic text — review strategy |
| parent_summary | sentence | low |  | 15% | Generic text — review strategy |
| next_steps | sentence | low |  | 15% | Generic text — review strategy |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |
| service_tier | word | low |  | 15% | Unknown type "SERVICE_TIER" — defaulted to word |

### skills (root)
- Generation order: 11
- Row ratio: 1x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| course_track | word | low |  | NOT NULL | Unknown type "COURSE_TRACK" — defaulted to word |
| code | sentence | low |  | NOT NULL | Generic text — review strategy |
| name | fullName | medium |  | NOT NULL |  |
| description | sentence | medium |  | 15% |  |
| category | enum | low |  | 15% | Inferred enum from column name "category" |
| order_index | integer | medium |  | NOT NULL | Inferred from integer type |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### ai_chat_conversations (refs: skills, sessions)
- Generation order: 12
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| student_user_id | uuid | high |  | NOT NULL |  |
| title | sentence | medium |  | 15% |  |
| skill_context | uuid | high | → skills.id | 10% | FK → skills.id |
| session_context | uuid | high | → sessions.id | 10% | FK → sessions.id |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| message_count | integer | medium |  | NOT NULL | Inferred from integer type |
| last_message_at | past_date | medium |  | 15% |  |
| metadata | json | low |  | 15% | JSON column — will generate empty object |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### ai_chat_messages (refs: ai_chat_conversations)
- Generation order: 13
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| conversation_id | uuid | high | → ai_chat_conversations.id | NOT NULL | FK → ai_chat_conversations.id |
| role | enum | medium |  | NOT NULL | Inferred enum from column name "role" |
| content | sentence | low |  | NOT NULL | Generic text — review strategy |
| skill_references | word | low |  | 15% | Unknown type "_UUID" — defaulted to word |
| metadata | json | low |  | 15% | JSON column — will generate empty object |
| tokens_used | integer | medium |  | 15% | Inferred from integer type |
| created_at | past_date | high |  | NOT NULL |  |

### api_keys (refs: users_profile, organizations)
- Generation order: 14
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| user_id | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| organization_id | uuid | high | → organizations.id | 10% | FK → organizations.id |
| name | fullName | medium |  | NOT NULL |  |
| description | sentence | medium |  | 15% |  |
| key_prefix | sentence | low |  | NOT NULL | Generic text — review strategy |
| key_hash | sentence | low |  | NOT NULL | Generic text — review strategy |
| scopes | sentence | low |  | 15% | Generic text — review strategy |
| rate_limit_per_minute | integer | medium |  | 15% | Inferred from integer type |
| allowed_ips | word | low |  | 15% | Unknown type "_INET" — defaulted to word |
| is_active | boolean | high |  | 15% |  |
| last_used_at | past_date | medium |  | 15% |  |
| usage_count | integer | medium |  | 15% | Inferred from integer type |
| expires_at | future_date | medium |  | 15% |  |
| created_at | past_date | high |  | 15% |  |

### fee_policies (refs: organizations)
- Generation order: 15
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| fee_type | word | low |  | NOT NULL | Unknown type "FEE_TYPE" — defaulted to word |
| name | fullName | medium |  | NOT NULL |  |
| description | sentence | medium |  | 15% |  |
| amount_cents | integer | medium |  | 15% | Inferred from integer type |
| percentage | decimal | medium |  | 15% | Inferred from numeric type |
| window_hours | integer | medium |  | 15% | Inferred from integer type |
| is_active | boolean | high |  | NOT NULL |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |
| organization_id | uuid | high | → organizations.id | 10% | FK → organizations.id |

### invoices (refs: families, organizations)
- Generation order: 16
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d), paid_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| invoice_number | sentence | low |  | NOT NULL | Generic text — review strategy |
| family_id | uuid | high | → families.id | NOT NULL | FK → families.id |
| parent_user_id | uuid | high |  | NOT NULL |  |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| subtotal_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| tax_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| discount_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| total_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| currency | enum | high |  | NOT NULL | Inferred enum from column name "currency" |
| due_date | past_date | medium |  | 15% | Inferred from DATE type |
| issued_at | past_date | medium |  | 15% |  |
| paid_at | past_date | medium |  | 15% |  |
| voided_at | past_date | medium |  | 15% |  |
| notes | sentence | medium |  | 15% |  |
| metadata | json | low |  | 15% | JSON column — will generate empty object |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |
| organization_id | uuid | high | → organizations.id | 10% | FK → organizations.id |

### applied_fees (refs: bookings, families, fee_policies, invoices)
- Generation order: 17
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| booking_id | uuid | high | → bookings.id | NOT NULL | FK → bookings.id |
| family_id | uuid | high | → families.id | NOT NULL | FK → families.id |
| fee_policy_id | uuid | high | → fee_policies.id | 10% | FK → fee_policies.id |
| fee_type | word | low |  | NOT NULL | Unknown type "FEE_TYPE" — defaulted to word |
| amount_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| reason | sentence | low |  | 15% | Generic text — review strategy |
| invoice_id | uuid | high | → invoices.id | 10% | FK → invoices.id |
| waived | boolean | medium |  | NOT NULL | Inferred from BOOLEAN type |
| waived_by | word | low |  | 15% | Unknown type "UUID" — defaulted to word |
| waived_reason | sentence | low |  | 15% | Generic text — review strategy |
| created_at | past_date | high |  | NOT NULL |  |

### certification_programs (root)
- Generation order: 18
- Row ratio: 1x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| code | sentence | low |  | NOT NULL | Generic text — review strategy |
| name | fullName | medium |  | NOT NULL |  |
| description | sentence | medium |  | 15% |  |
| short_description | sentence | low |  | 15% | Generic text — review strategy |
| cert_type | word | low |  | NOT NULL | Unknown type "CERTIFICATION_TYPE" — defaulted to word |
| level | enum | medium |  | 15% | Inferred enum from column name "level" |
| category | enum | low |  | 15% | Inferred enum from column name "category" |
| icon_url | sentence | low |  | 15% | Generic text — review strategy |
| badge_image_url | sentence | low |  | 15% | Generic text — review strategy |
| badge_color | sentence | low |  | 15% | Generic text — review strategy |
| estimated_hours | integer | medium |  | 15% | Inferred from integer type |
| difficulty_rating | integer | medium |  | 15% | Inferred from integer type |
| target_audience | sentence | low |  | 15% | Generic text — review strategy |
| min_age | integer | medium |  | 15% | Inferred from integer type |
| max_age | integer | medium |  | 15% | Inferred from integer type |
| grade_level_min | integer | medium |  | 15% | Inferred from integer type |
| grade_level_max | integer | medium |  | 15% | Inferred from integer type |
| validity_months | integer | medium |  | 15% | Inferred from integer type |
| recertification_program_id | uuid | high | → certification_programs.id | 10% | FK → certification_programs.id |
| career_pathway_id | uuid | high |  | 15% |  |
| prerequisite_program_ids | word | low |  | 15% | Unknown type "_UUID" — defaulted to word |
| is_free | boolean | high |  | 15% |  |
| price_cents | integer | medium |  | 15% | Inferred from integer type |
| is_active | boolean | high |  | 15% |  |
| is_featured | boolean | high |  | 15% |  |
| display_order | integer | medium |  | 15% | Inferred from integer type |
| metadata | json | low |  | 15% | JSON column — will generate empty object |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### certification_assessments (refs: certification_programs)
- Generation order: 19
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| program_id | uuid | high | → certification_programs.id | 10% | FK → certification_programs.id |
| code | sentence | low |  | NOT NULL | Generic text — review strategy |
| title | sentence | medium |  | NOT NULL |  |
| description | sentence | medium |  | 15% |  |
| instructions | sentence | low |  | 15% | Generic text — review strategy |
| assessment_type | word | low |  | NOT NULL | Unknown type "ASSESSMENT_TYPE" — defaulted to word |
| time_limit_minutes | integer | medium |  | 15% | Inferred from integer type |
| available_from | past_date | medium |  | 15% | Inferred from TIMESTAMP type |
| available_until | past_date | medium |  | 15% | Inferred from TIMESTAMP type |
| max_attempts | integer | medium |  | 15% | Inferred from integer type |
| cooldown_hours | integer | medium |  | 15% | Inferred from integer type |
| passing_score | decimal | medium |  | NOT NULL | Inferred from numeric type |
| max_score | decimal | medium |  | 15% | Inferred from numeric type |
| question_count | integer | medium |  | 15% | Inferred from integer type |
| randomize_questions | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| randomize_options | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| show_correct_answers | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| show_explanations | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| requires_proctoring | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| requires_webcam | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| allows_calculator | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| allows_notes | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| rubric | json | low |  | 15% | JSON column — will generate empty object |
| is_active | boolean | high |  | 15% |  |
| metadata | json | low |  | 15% | JSON column — will generate empty object |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### assessment_attempts (refs: certification_assessments)
- Generation order: 20
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| assessment_id | uuid | high | → certification_assessments.id | NOT NULL | FK → certification_assessments.id |
| user_id | uuid | high |  | NOT NULL |  |
| attempt_number | integer | medium |  | NOT NULL | Inferred from integer type |
| started_at | past_date | medium |  | NOT NULL |  |
| submitted_at | past_date | medium |  | 15% |  |
| time_spent_seconds | integer | medium |  | 15% | Inferred from integer type |
| question_order | word | low |  | 15% | Unknown type "_UUID" — defaulted to word |
| raw_score | decimal | medium |  | 15% | Inferred from numeric type |
| max_possible_score | decimal | medium |  | 15% | Inferred from numeric type |
| percentage_score | decimal | medium |  | 15% | Inferred from numeric type |
| passed | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| proctor_user_id | uuid | high |  | 15% |  |
| proctoring_notes | sentence | low |  | 15% | Generic text — review strategy |
| proctoring_flags | json | low |  | 15% | JSON column — will generate empty object |
| status | enum | medium |  | 15% | Inferred enum from column name "status" |
| graded_by | word | low |  | 15% | Unknown type "UUID" — defaulted to word |
| graded_at | past_date | medium |  | 15% |  |
| grading_notes | sentence | low |  | 15% | Generic text — review strategy |
| user_agent | sentence | low |  | 15% | Generic text — review strategy |
| ip_address | word | low |  | 15% | Unknown type "INET" — defaulted to word |
| metadata | json | low |  | 15% | JSON column — will generate empty object |
| created_at | past_date | high |  | 15% |  |

### assessment_questions (refs: certification_assessments)
- Generation order: 21
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| assessment_id | uuid | high | → certification_assessments.id | NOT NULL | FK → certification_assessments.id |
| question_type | word | low |  | NOT NULL | Unknown type "QUESTION_TYPE" — defaulted to word |
| question_text | sentence | low |  | NOT NULL | Generic text — review strategy |
| question_html | sentence | low |  | 15% | Generic text — review strategy |
| question_image_url | sentence | low |  | 15% | Generic text — review strategy |
| latex_content | sentence | low |  | 15% | Generic text — review strategy |
| desmos_state | json | low |  | 15% | JSON column — will generate empty object |
| options | json | low |  | 15% | JSON column — will generate empty object |
| correct_answer | json | low |  | NOT NULL | JSON column — will generate empty object |
| points | decimal | medium |  | 15% | Inferred from numeric type |
| partial_credit | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| partial_credit_rules | json | low |  | 15% | JSON column — will generate empty object |
| hint | sentence | low |  | 15% | Generic text — review strategy |
| explanation | sentence | low |  | 15% | Generic text — review strategy |
| explanation_video_url | sentence | low |  | 15% | Generic text — review strategy |
| difficulty | integer | medium |  | 15% | Inferred from integer type |
| skill_ids | word | low |  | 15% | Unknown type "_UUID" — defaulted to word |
| tags | sentence | low |  | 15% | Generic text — review strategy |
| display_order | integer | medium |  | 15% | Inferred from integer type |
| question_group | sentence | low |  | 15% | Generic text — review strategy |
| is_active | boolean | high |  | 15% |  |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### assessment_responses (refs: assessment_attempts, assessment_questions)
- Generation order: 22
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| attempt_id | uuid | high | → assessment_attempts.id | NOT NULL | FK → assessment_attempts.id |
| question_id | uuid | high | → assessment_questions.id | NOT NULL | FK → assessment_questions.id |
| response | json | low |  | 15% | JSON column — will generate empty object |
| response_text | sentence | low |  | 15% | Generic text — review strategy |
| response_file_urls | sentence | low |  | 15% | Generic text — review strategy |
| started_at | past_date | medium |  | 15% |  |
| answered_at | past_date | medium |  | 15% |  |
| time_spent_seconds | integer | medium |  | 15% | Inferred from integer type |
| is_correct | boolean | high |  | 15% |  |
| points_earned | decimal | medium |  | 15% | Inferred from numeric type |
| max_points | decimal | medium |  | 15% | Inferred from numeric type |
| auto_feedback | sentence | low |  | 15% | Generic text — review strategy |
| manual_feedback | sentence | low |  | 15% | Generic text — review strategy |
| graded_by | word | low |  | 15% | Unknown type "UUID" — defaulted to word |
| flagged_for_review | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| flag_reason | sentence | low |  | 15% | Generic text — review strategy |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### courses (root)
- Generation order: 23
- Row ratio: 1x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| title | sentence | medium |  | NOT NULL |  |
| code | sentence | low |  | NOT NULL | Generic text — review strategy |
| description | sentence | medium |  | 15% |  |
| grade_level | sentence | low |  | 15% | Generic text — review strategy |
| state_standard | sentence | low |  | 15% | Generic text — review strategy |
| is_active | boolean | high |  | NOT NULL |  |
| created_at | past_date | high |  | NOT NULL |  |

### curriculum_units (refs: courses)
- Generation order: 24
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| course_id | uuid | high | → courses.id | NOT NULL | FK → courses.id |
| title | sentence | medium |  | NOT NULL |  |
| sort_order | integer | medium |  | NOT NULL | Inferred from integer type |
| created_at | past_date | high |  | NOT NULL |  |

### atomic_concepts (refs: curriculum_units)
- Generation order: 25
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| unit_id | uuid | high | → curriculum_units.id | NOT NULL | FK → curriculum_units.id |
| lesson_number | sentence | low |  | NOT NULL | Generic text — review strategy |
| title | sentence | medium |  | NOT NULL |  |
| key_skills | sentence | low |  | NOT NULL | Generic text — review strategy |
| standard_code | sentence | low |  | 15% | Generic text — review strategy |
| sort_order | integer | medium |  | NOT NULL | Inferred from integer type |
| created_at | past_date | high |  | NOT NULL |  |
| common_misconceptions | sentence | low |  | NOT NULL | Generic text — review strategy |
| teaching_notes | sentence | low |  | 15% | Generic text — review strategy |
| prerequisite_concepts | sentence | low |  | NOT NULL | Generic text — review strategy |
| career_connections | sentence | low |  | NOT NULL | Generic text — review strategy |
| difficulty_level | sentence | low |  | 15% | Generic text — review strategy |
| estimated_minutes | integer | medium |  | 15% | Inferred from integer type |

### audit_logs (refs: users_profile, users_profile)
- Generation order: 26
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| actor_user_id | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| actor_role | sentence | low |  | 15% | Generic text — review strategy |
| impersonator_user_id | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| action | word | low |  | NOT NULL | Unknown type "AUDIT_ACTION" — defaulted to word |
| resource_type | sentence | low |  | NOT NULL | Generic text — review strategy |
| resource_id | uuid | high |  | 15% |  |
| description | sentence | medium |  | 15% |  |
| old_values | json | low |  | 15% | JSON column — will generate empty object |
| new_values | json | low |  | 15% | JSON column — will generate empty object |
| metadata | json | low |  | 15% | JSON column — will generate empty object |
| ip_address | word | low |  | 15% | Unknown type "INET" — defaulted to word |
| user_agent | sentence | low |  | 15% | Generic text — review strategy |
| request_id | uuid | high |  | 15% |  |
| occurred_at | past_date | medium |  | 15% |  |
| is_sensitive | boolean | high |  | 15% |  |
| data_categories | sentence | low |  | 15% | Generic text — review strategy |
| retention_days | integer | medium |  | 15% | Inferred from integer type |

### auth_rate_limits (root)
- Generation order: 27
- Row ratio: 1x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| identifier | sentence | low |  | NOT NULL | Generic text — review strategy |
| action | sentence | low |  | NOT NULL | Generic text — review strategy |
| attempts | integer | medium |  | NOT NULL | Inferred from integer type |
| window_start | past_date | medium |  | NOT NULL | Inferred from TIMESTAMP type |
| locked_until | past_date | medium |  | 15% | Inferred from TIMESTAMP type |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### availability_exceptions (refs: tutors_profile)
- Generation order: 28
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| tutor_user_id | uuid | high | → tutors_profile.user_id | NOT NULL | FK → tutors_profile.user_id |
| exception_date | past_date | medium |  | NOT NULL | Inferred from DATE type |
| is_available | boolean | high |  | NOT NULL |  |
| start_time | word | low |  | 15% | Unknown type "TIME" — defaulted to word |
| end_time | word | low |  | 15% | Unknown type "TIME" — defaulted to word |
| reason | sentence | low |  | 15% | Generic text — review strategy |
| created_at | past_date | high |  | NOT NULL |  |

### availability_rules (refs: tutors_profile)
- Generation order: 29
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| tutor_user_id | uuid | high | → tutors_profile.user_id | NOT NULL | FK → tutors_profile.user_id |
| day_of_week | integer | medium |  | NOT NULL | Inferred from integer type |
| start_time | word | low |  | NOT NULL | Unknown type "TIME" — defaulted to word |
| end_time | word | low |  | NOT NULL | Unknown type "TIME" — defaulted to word |
| is_active | boolean | high |  | NOT NULL |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### calendar_sync (refs: bookings, users_profile)
- Generation order: 30
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| booking_id | uuid | high | → bookings.id | NOT NULL | FK → bookings.id |
| user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| provider | sentence | low |  | NOT NULL | Generic text — review strategy |
| external_event_id | uuid | high |  | NOT NULL |  |
| sync_status | sentence | low |  | 15% | Generic text — review strategy |
| last_synced_at | past_date | medium |  | 15% |  |
| created_at | past_date | high |  | 15% |  |

### calendar_sync_log (refs: bookings)
- Generation order: 31
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| user_id | uuid | high |  | NOT NULL |  |
| booking_id | uuid | high | → bookings.id | 10% | FK → bookings.id |
| provider | sentence | low |  | NOT NULL | Generic text — review strategy |
| external_event_id | uuid | high |  | 15% |  |
| action | sentence | low |  | NOT NULL | Generic text — review strategy |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| error_message | sentence | low |  | 15% | Generic text — review strategy |
| created_at | past_date | high |  | NOT NULL |  |

### calendar_sync_tokens (root)
- Generation order: 32
- Row ratio: 1x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| user_id | uuid | high |  | NOT NULL |  |
| provider | sentence | low |  | NOT NULL | Generic text — review strategy |
| access_token | sentence | low |  | NOT NULL | Generic text — review strategy |
| refresh_token | sentence | low |  | 15% | Generic text — review strategy |
| token_expires_at | past_date | medium |  | 15% |  |
| calendar_id | uuid | high |  | 15% |  |
| sync_direction | word | low |  | NOT NULL | Unknown type "SYNC_DIRECTION" — defaulted to word |
| last_synced_at | past_date | medium |  | 15% |  |
| is_active | boolean | high |  | NOT NULL |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### career_pathways (root)
- Generation order: 33
- Row ratio: 1x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| code | sentence | low |  | NOT NULL | Generic text — review strategy |
| name | fullName | medium |  | NOT NULL |  |
| description | sentence | medium |  | 15% |  |
| icon_url | sentence | low |  | 15% | Generic text — review strategy |
| color | sentence | low |  | 15% | Generic text — review strategy |
| target_grades | integer | medium |  | 15% | Inferred from integer type |
| prerequisite_tracks | word | low |  | 15% | Unknown type "_COURSE_TRACK" — defaulted to word |
| career_outcomes | sentence | low |  | 15% | Generic text — review strategy |
| certifications | sentence | low |  | 15% | Generic text — review strategy |
| is_active | boolean | high |  | 15% |  |
| order_index | integer | medium |  | 15% | Inferred from integer type |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |
| guide_specializations | word | low |  | 15% | Unknown type "_GUIDE_LEVEL" — defaulted to word |
| min_guide_level | word | low |  | 15% | Unknown type "GUIDE_LEVEL" — defaulted to word |

### certification_requirements (refs: certification_programs)
- Generation order: 34
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| program_id | uuid | high | → certification_programs.id | NOT NULL | FK → certification_programs.id |
| requirement_type | word | low |  | NOT NULL | Unknown type "REQUIREMENT_TYPE" — defaulted to word |
| name | fullName | medium |  | NOT NULL |  |
| description | sentence | medium |  | 15% |  |
| parameters | json | low |  | NOT NULL | JSON column — will generate empty object |
| is_required | boolean | high |  | 15% |  |
| group_id | uuid | high |  | 15% |  |
| weight | decimal | medium |  | 15% | Inferred from numeric type |
| display_order | integer | medium |  | 15% | Inferred from integer type |
| created_at | past_date | high |  | 15% |  |

### user_certifications (refs: certification_programs, assessment_attempts)
- Generation order: 35
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| user_id | uuid | high |  | NOT NULL |  |
| program_id | uuid | high | → certification_programs.id | NOT NULL | FK → certification_programs.id |
| credential_number | sentence | low |  | NOT NULL | Generic text — review strategy |
| earned_at | past_date | medium |  | NOT NULL |  |
| score | integer | medium |  | 15% |  |
| valid_from | past_date | medium |  | NOT NULL | Inferred from TIMESTAMP type |
| valid_until | past_date | medium |  | 15% | Inferred from TIMESTAMP type |
| status | enum | medium |  | 15% | Inferred enum from column name "status" |
| revoked_at | past_date | medium |  | 15% |  |
| revoked_reason | sentence | low |  | 15% | Generic text — review strategy |
| revoked_by | word | low |  | 15% | Unknown type "UUID" — defaulted to word |
| verification_token | sentence | low |  | NOT NULL | Generic text — review strategy |
| verification_url | sentence | low |  | 15% | Generic text — review strategy |
| badge_assertion_id | uuid | high |  | 15% |  |
| badge_image_url | sentence | low |  | 15% | Generic text — review strategy |
| certificate_pdf_url | sentence | low |  | 15% | Generic text — review strategy |
| certificate_generated_at | past_date | medium |  | 15% |  |
| is_public | boolean | high |  | 15% |  |
| shared_to_linkedin | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| final_assessment_attempt_id | uuid | high | → assessment_attempts.id | 10% | FK → assessment_attempts.id |
| achievement_details | json | low |  | 15% | JSON column — will generate empty object |
| metadata | json | low |  | 15% | JSON column — will generate empty object |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### certification_verifications (refs: user_certifications)
- Generation order: 36
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| user_certification_id | uuid | high | → user_certifications.id | NOT NULL | FK → user_certifications.id |
| verified_at | past_date | medium |  | 15% |  |
| verifier_name | sentence | low |  | 15% | Generic text — review strategy |
| verifier_email | sentence | low |  | 15% | Generic text — review strategy |
| verifier_organization | sentence | low |  | 15% | Generic text — review strategy |
| ip_address | word | low |  | 15% | Unknown type "INET" — defaulted to word |
| user_agent | sentence | low |  | 15% | Generic text — review strategy |
| was_valid | boolean | high |  | NOT NULL |  |

### classroom_sync (refs: users_profile, users_profile)
- Generation order: 37
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| student_user_id | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| course_id | uuid | high |  | NOT NULL |  |
| course_name | sentence | low |  | 15% | Generic text — review strategy |
| sync_enabled | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| last_synced_at | past_date | medium |  | 15% |  |
| created_at | past_date | high |  | 15% |  |

### coach_earnings (refs: users_profile, users_profile)
- Generation order: 38
- Row ratio: 0.5x
- Temporal: approved_at after created_at (+0-14d), paid_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| coach_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| period_start | past_date | medium |  | NOT NULL | Inferred from DATE type |
| period_end | past_date | medium |  | NOT NULL | Inferred from DATE type |
| total_revenue_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| coach_share_percent | decimal | medium |  | NOT NULL | Inferred from numeric type |
| coach_earnings_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| active_students | integer | medium |  | NOT NULL | Inferred from integer type |
| sessions_delivered | integer | medium |  | NOT NULL | Inferred from integer type |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| approved_by | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| approved_at | past_date | high |  | 15% |  |
| paid_at | past_date | medium |  | 15% |  |
| payout_reference | sentence | low |  | 15% | Generic text — review strategy |
| notes | sentence | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |

### coaching_programs (root)
- Generation order: 39
- Row ratio: 1x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| name | fullName | medium |  | NOT NULL |  |
| slug | sentence | low |  | NOT NULL | Generic text — review strategy |
| track_level | sentence | low |  | NOT NULL | Generic text — review strategy |
| description | sentence | medium |  | 15% |  |
| monthly_price_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| sessions_per_month | integer | medium |  | NOT NULL | Inferred from integer type |
| max_students_per_coach | integer | medium |  | NOT NULL | Inferred from integer type |
| min_enrollment_months | integer | medium |  | NOT NULL | Inferred from integer type |
| grade_range_start | integer | medium |  | 15% | Inferred from integer type |
| grade_range_end | integer | medium |  | 15% | Inferred from integer type |
| is_active | boolean | high |  | NOT NULL |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### code_problems (refs: skills)
- Generation order: 40
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| title | sentence | medium |  | NOT NULL |  |
| description | sentence | medium |  | NOT NULL |  |
| difficulty | sentence | low |  | NOT NULL | Generic text — review strategy |
| language | word | low |  | NOT NULL | Unknown type "CODE_LANGUAGE" — defaulted to word |
| starter_code | sentence | low |  | 15% | Generic text — review strategy |
| solution_code | sentence | low |  | 15% | Generic text — review strategy |
| test_cases | json | low |  | NOT NULL | JSON column — will generate empty object |
| time_limit_ms | integer | medium |  | NOT NULL | Inferred from integer type |
| memory_limit_mb | integer | medium |  | NOT NULL | Inferred from integer type |
| topic | sentence | low |  | 15% | Generic text — review strategy |
| skill_id | uuid | high | → skills.id | 10% | FK → skills.id |
| hints | json | low |  | 15% | JSON column — will generate empty object |
| created_by | word | low |  | 15% | Unknown type "UUID" — defaulted to word |
| is_active | boolean | high |  | NOT NULL |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### homework_items (refs: sessions)
- Generation order: 41
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| session_id | uuid | high | → sessions.id | NOT NULL | FK → sessions.id |
| title | sentence | medium |  | NOT NULL |  |
| description | sentence | medium |  | 15% |  |
| due_date | past_date | medium |  | 15% | Inferred from DATE type |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| submission_text | sentence | low |  | 15% | Generic text — review strategy |
| submission_file_path | sentence | low |  | 15% | Generic text — review strategy |
| submitted_at | past_date | medium |  | 15% |  |
| review_notes | sentence | low |  | 15% | Generic text — review strategy |
| reviewed_at | past_date | medium |  | 15% |  |
| reviewed_by | word | low |  | 15% | Unknown type "UUID" — defaulted to word |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### code_submissions (refs: code_problems, homework_items)
- Generation order: 42
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| problem_id | uuid | high | → code_problems.id | NOT NULL | FK → code_problems.id |
| student_user_id | uuid | high |  | NOT NULL |  |
| homework_item_id | uuid | high | → homework_items.id | 10% | FK → homework_items.id |
| language | word | low |  | NOT NULL | Unknown type "CODE_LANGUAGE" — defaulted to word |
| source_code | sentence | low |  | NOT NULL | Generic text — review strategy |
| verdict | word | low |  | NOT NULL | Unknown type "SUBMISSION_VERDICT" — defaulted to word |
| test_results | json | low |  | 15% | JSON column — will generate empty object |
| tests_passed | integer | medium |  | NOT NULL | Inferred from integer type |
| tests_total | integer | medium |  | NOT NULL | Inferred from integer type |
| execution_time_ms | integer | medium |  | 15% | Inferred from integer type |
| ai_feedback | sentence | low |  | 15% | Generic text — review strategy |
| tutor_feedback | sentence | low |  | 15% | Generic text — review strategy |
| score | integer | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |

### math_competitions (refs: courses, users_profile)
- Generation order: 43
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| name | fullName | medium |  | NOT NULL |  |
| slug | sentence | low |  | NOT NULL | Generic text — review strategy |
| competition_type | sentence | low |  | NOT NULL | Generic text — review strategy |
| description | sentence | medium |  | 15% |  |
| course_id | uuid | high | → courses.id | 10% | FK → courses.id |
| grade_range_start | integer | medium |  | 15% | Inferred from integer type |
| grade_range_end | integer | medium |  | 15% | Inferred from integer type |
| registration_opens_at | past_date | medium |  | 15% |  |
| registration_closes_at | past_date | medium |  | 15% |  |
| competition_date | past_date | medium |  | 15% | Inferred from TIMESTAMP type |
| max_participants | integer | medium |  | 15% | Inferred from integer type |
| entry_fee_cents | integer | medium |  | 15% | Inferred from integer type |
| location | sentence | low |  | 15% | Generic text — review strategy |
| is_virtual | boolean | high |  | NOT NULL |  |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| created_by | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### program_enrollments (refs: users_profile, users_profile, coaching_programs, users_profile, courses)
- Generation order: 44
- Row ratio: 0.5x
- Lifecycle: status → cancelled_at (null when active)
- Temporal: updated_at after created_at (+0-30d), cancelled_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| student_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| coach_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| program_id | uuid | high | → coaching_programs.id | NOT NULL | FK → coaching_programs.id |
| parent_id | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| enrolled_at | past_date | medium |  | NOT NULL |  |
| paused_at | past_date | medium |  | 15% |  |
| cancelled_at | past_date | high |  | 70% |  |
| current_course_id | uuid | high | → courses.id | 10% | FK → courses.id |
| stripe_subscription_id | uuid | high |  | 15% |  |
| notes | sentence | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |
| target_sessions_per_month | integer | medium |  | 15% | Inferred from integer type |
| target_practice_days_per_week | integer | medium |  | 15% | Inferred from integer type |

### competition_registrations (refs: math_competitions, users_profile, users_profile, program_enrollments)
- Generation order: 45
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| competition_id | uuid | high | → math_competitions.id | NOT NULL | FK → math_competitions.id |
| student_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| registered_by | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| enrollment_id | uuid | high | → program_enrollments.id | 10% | FK → program_enrollments.id |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| payment_status | sentence | low |  | 15% | Generic text — review strategy |
| team_name | sentence | low |  | 15% | Generic text — review strategy |
| registered_at | past_date | medium |  | NOT NULL |  |

### competition_rounds (refs: math_competitions)
- Generation order: 46
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| competition_id | uuid | high | → math_competitions.id | NOT NULL | FK → math_competitions.id |
| name | fullName | medium |  | NOT NULL |  |
| round_number | integer | medium |  | NOT NULL | Inferred from integer type |
| round_type | sentence | low |  | NOT NULL | Generic text — review strategy |
| time_limit_minutes | integer | medium |  | 15% | Inferred from integer type |
| max_score | integer | medium |  | 15% | Inferred from integer type |
| concept_ids | word | low |  | 15% | Unknown type "_UUID" — defaulted to word |
| sort_order | integer | medium |  | NOT NULL | Inferred from integer type |
| created_at | past_date | high |  | NOT NULL |  |

### competition_results (refs: math_competitions, competition_rounds, users_profile)
- Generation order: 47
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| competition_id | uuid | high | → math_competitions.id | NOT NULL | FK → math_competitions.id |
| round_id | uuid | high | → competition_rounds.id | 10% | FK → competition_rounds.id |
| student_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| score | integer | medium |  | 15% |  |
| max_possible_score | decimal | medium |  | 15% | Inferred from numeric type |
| placement | integer | medium |  | 15% | Inferred from integer type |
| percentile | decimal | medium |  | 15% | Inferred from numeric type |
| badge_earned | sentence | low |  | 15% | Generic text — review strategy |
| notes | sentence | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |

### programs (refs: career_pathways, users_profile)
- Generation order: 48
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d), end_date after start_date (+7-365d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| name | fullName | medium |  | NOT NULL |  |
| slug | sentence | low |  | NOT NULL | Generic text — review strategy |
| description | sentence | medium |  | 15% |  |
| program_type | word | low |  | NOT NULL | Unknown type "PROGRAM_TYPE" — defaulted to word |
| career_pathway_id | uuid | high | → career_pathways.id | 10% | FK → career_pathways.id |
| start_date | past_date | high |  | NOT NULL |  |
| end_date | future_date | medium |  | NOT NULL |  |
| schedule_details | json | low |  | 15% | JSON column — will generate empty object |
| timezone | sentence | low |  | 15% | Generic text — review strategy |
| min_participants | integer | medium |  | 15% | Inferred from integer type |
| max_participants | integer | medium |  | NOT NULL | Inferred from integer type |
| current_enrollment | integer | medium |  | 15% | Inferred from integer type |
| waitlist_enabled | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| price_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| early_bird_price_cents | integer | medium |  | 15% | Inferred from integer type |
| early_bird_deadline | past_date | medium |  | 15% | Inferred from DATE type |
| member_discount_percent | integer | medium |  | 15% | Inferred from integer type |
| min_grade | integer | medium |  | 15% | Inferred from integer type |
| max_grade | integer | medium |  | 15% | Inferred from integer type |
| prerequisite_skills | word | low |  | 15% | Unknown type "_UUID" — defaulted to word |
| prerequisite_programs | word | low |  | 15% | Unknown type "_UUID" — defaulted to word |
| modality | sentence | low |  | 15% | Generic text — review strategy |
| location_name | sentence | low |  | 15% | Generic text — review strategy |
| location_address | sentence | low |  | 15% | Generic text — review strategy |
| video_platform | sentence | low |  | 15% | Generic text — review strategy |
| syllabus_url | sentence | low |  | 15% | Generic text — review strategy |
| materials_included | sentence | low |  | 15% | Generic text — review strategy |
| equipment_required | sentence | low |  | 15% | Generic text — review strategy |
| lead_instructor_id | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| assistant_instructor_ids | word | low |  | 15% | Unknown type "_UUID" — defaulted to word |
| cover_image_url | sentence | low |  | 15% | Generic text — review strategy |
| gallery_urls | sentence | low |  | 15% | Generic text — review strategy |
| status | enum | medium |  | 15% | Inferred enum from column name "status" |
| featured | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| tags | sentence | low |  | 15% | Generic text — review strategy |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |
| guide_level_required | word | low |  | 15% | Unknown type "GUIDE_LEVEL" — defaulted to word |
| min_eligibility_score | integer | medium |  | 15% | Inferred from integer type |
| target_grades | integer | medium |  | 15% | Inferred from integer type |

### competitions (refs: programs)
- Generation order: 49
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| program_id | uuid | high | → programs.id | NOT NULL | FK → programs.id |
| format | word | low |  | 15% | Unknown type "COMPETITION_FORMAT" — defaulted to word |
| team_size_min | integer | medium |  | 15% | Inferred from integer type |
| team_size_max | integer | medium |  | 15% | Inferred from integer type |
| num_rounds | integer | medium |  | 15% | Inferred from integer type |
| time_limit_minutes | integer | medium |  | 15% | Inferred from integer type |
| max_score | integer | medium |  | 15% | Inferred from integer type |
| scoring_rules | json | low |  | 15% | JSON column — will generate empty object |
| tiebreaker_rules | sentence | low |  | 15% | Generic text — review strategy |
| prizes | json | low |  | 15% | JSON column — will generate empty object |
| rules_url | sentence | low |  | 15% | Generic text — review strategy |
| allowed_resources | sentence | low |  | 15% | Generic text — review strategy |
| prohibited_items | sentence | low |  | 15% | Generic text — review strategy |
| created_at | past_date | high |  | 15% |  |

### competition_teams (refs: competitions, users_profile)
- Generation order: 50
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| competition_id | uuid | high | → competitions.id | NOT NULL | FK → competitions.id |
| name | fullName | medium |  | NOT NULL |  |
| captain_user_id | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| created_at | past_date | high |  | 15% |  |

### competition_team_members (refs: competition_teams, users_profile)
- Generation order: 51
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| team_id | uuid | high | → competition_teams.id | NOT NULL | FK → competition_teams.id |
| student_user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| role | enum | medium |  | 15% | Inferred enum from column name "role" |
| joined_at | past_date | medium |  | 15% |  |

### consent_templates (root)
- Generation order: 52
- Row ratio: 1x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| consent_type | word | low |  | NOT NULL | Unknown type "CONSENT_TYPE" — defaulted to word |
| version | sentence | low |  | NOT NULL | Generic text — review strategy |
| title | sentence | medium |  | NOT NULL |  |
| summary | sentence | low |  | 15% | Generic text — review strategy |
| full_text | sentence | low |  | NOT NULL | Generic text — review strategy |
| requires_signature | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| requires_checkbox | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| min_age_without_parent | integer | medium |  | 15% | Inferred from integer type |
| is_active | boolean | high |  | 15% |  |
| effective_date | past_date | medium |  | NOT NULL | Inferred from DATE type |
| expiry_days | future_date | medium |  | 15% |  |
| created_at | past_date | high |  | 15% |  |

### credit_ledger (refs: families)
- Generation order: 53
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| family_id | uuid | high | → families.id | NOT NULL | FK → families.id |
| transaction_type | word | low |  | NOT NULL | Unknown type "CREDIT_TRANSACTION_TYPE" — defaulted to word |
| amount | decimal | high |  | NOT NULL |  |
| balance_after | integer | medium |  | NOT NULL | Inferred from integer type |
| reference_type | sentence | low |  | 15% | Generic text — review strategy |
| reference_id | uuid | high |  | 15% |  |
| description | sentence | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |

### csv_import_jobs (refs: organizations)
- Generation order: 54
- Row ratio: 0.5x
- Lifecycle: status → completed_at (null when pending)
- Temporal: completed_at after created_at (+1-60d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| entity_type | word | low |  | NOT NULL | Unknown type "IMPORT_ENTITY" — defaulted to word |
| file_name | sentence | low |  | NOT NULL | Generic text — review strategy |
| total_rows | integer | medium |  | NOT NULL | Inferred from integer type |
| processed_rows | integer | medium |  | NOT NULL | Inferred from integer type |
| success_rows | integer | medium |  | NOT NULL | Inferred from integer type |
| error_rows | integer | medium |  | NOT NULL | Inferred from integer type |
| errors | json | low |  | 15% | JSON column — will generate empty object |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| imported_by | word | low |  | NOT NULL | Unknown type "UUID" — defaulted to word |
| organization_id | uuid | high | → organizations.id | 10% | FK → organizations.id |
| completed_at | past_date | high |  | 70% |  |
| created_at | past_date | high |  | NOT NULL |  |

### custom_roles (refs: organizations, users_profile)
- Generation order: 55
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| name | fullName | medium |  | NOT NULL |  |
| description | sentence | medium |  | 15% |  |
| organization_id | uuid | high | → organizations.id | 10% | FK → organizations.id |
| permissions | sentence | low |  | 15% | Generic text — review strategy |
| is_system | boolean | high |  | 15% |  |
| is_active | boolean | high |  | 15% |  |
| created_at | past_date | high |  | 15% |  |
| created_by | uuid | high | → users_profile.id | 10% | FK → users_profile.id |

### desmos_states (refs: sessions, skills, users_profile, users_profile)
- Generation order: 56
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| session_id | uuid | high | → sessions.id | 10% | FK → sessions.id |
| skill_id | uuid | high | → skills.id | 10% | FK → skills.id |
| student_user_id | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| tutor_user_id | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| name | fullName | medium |  | 15% |  |
| state_json | json | low |  | NOT NULL | JSON column — will generate empty object |
| screenshot_url | sentence | low |  | 15% | Generic text — review strategy |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### diagnostics (root)
- Generation order: 57
- Row ratio: 1x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| student_user_id | uuid | high |  | NOT NULL |  |
| administered_by_user_id | uuid | high |  | NOT NULL |  |
| administered_at | past_date | medium |  | NOT NULL |  |
| course_track | word | low |  | NOT NULL | Unknown type "COURSE_TRACK" — defaulted to word |
| score | integer | medium |  | 15% |  |
| max_score | integer | medium |  | 15% | Inferred from integer type |
| results_json | json | low |  | 15% | JSON column — will generate empty object |
| notes | sentence | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |

### drop_in_slots (refs: tutors_profile, rooms, organizations)
- Generation order: 58
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| tutor_user_id | uuid | high | → tutors_profile.user_id | NOT NULL | FK → tutors_profile.user_id |
| room_id | uuid | high | → rooms.id | 10% | FK → rooms.id |
| title | sentence | medium |  | NOT NULL |  |
| subject | sentence | medium |  | 15% |  |
| day_of_week | integer | medium |  | NOT NULL | Inferred from integer type |
| start_time | word | low |  | NOT NULL | Unknown type "TIME" — defaulted to word |
| end_time | word | low |  | NOT NULL | Unknown type "TIME" — defaulted to word |
| max_concurrent | integer | medium |  | NOT NULL | Inferred from integer type |
| modality | word | low |  | NOT NULL | Unknown type "MODALITY" — defaulted to word |
| is_active | boolean | high |  | NOT NULL |  |
| organization_id | uuid | high | → organizations.id | 10% | FK → organizations.id |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### drop_in_attendance (refs: drop_in_slots, families)
- Generation order: 59
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| slot_id | uuid | high | → drop_in_slots.id | NOT NULL | FK → drop_in_slots.id |
| student_user_id | uuid | high |  | NOT NULL |  |
| family_id | uuid | high | → families.id | 10% | FK → families.id |
| check_in_at | past_date | medium |  | NOT NULL |  |
| check_out_at | past_date | medium |  | 15% |  |
| topics_covered | sentence | low |  | 15% | Generic text — review strategy |
| tutor_notes | sentence | low |  | 15% | Generic text — review strategy |

### equipment_types (root)
- Generation order: 60
- Row ratio: 1x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| name | fullName | medium |  | NOT NULL |  |
| description | sentence | medium |  | 15% |  |
| manufacturer | sentence | low |  | 15% | Generic text — review strategy |
| model_number | sentence | low |  | 15% | Generic text — review strategy |
| category | enum | low |  | 15% | Inferred enum from column name "category" |
| is_kit | boolean | high |  | 15% |  |
| kit_contents | json | low |  | 15% | JSON column — will generate empty object |
| purchase_price_cents | integer | medium |  | 15% | Inferred from integer type |
| rental_price_cents | integer | medium |  | 15% | Inferred from integer type |
| deposit_cents | integer | medium |  | 15% | Inferred from integer type |
| image_url | sentence | low |  | 15% | Generic text — review strategy |
| manual_url | sentence | low |  | 15% | Generic text — review strategy |
| total_quantity | integer | medium |  | 15% | Inferred from integer type |
| available_quantity | integer | medium |  | 15% | Inferred from integer type |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### equipment_inventory (refs: equipment_types)
- Generation order: 61
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| equipment_type_id | uuid | high | → equipment_types.id | NOT NULL | FK → equipment_types.id |
| serial_number | sentence | low |  | 15% | Generic text — review strategy |
| asset_tag | sentence | low |  | 15% | Generic text — review strategy |
| status | enum | medium |  | 15% | Inferred enum from column name "status" |
| condition | sentence | low |  | 15% | Generic text — review strategy |
| condition_notes | sentence | low |  | 15% | Generic text — review strategy |
| purchase_date | past_date | medium |  | 15% | Inferred from DATE type |
| warranty_expiry | past_date | medium |  | 15% | Inferred from DATE type |
| last_maintenance_date | past_date | medium |  | 15% | Inferred from DATE type |
| current_location | sentence | low |  | 15% | Generic text — review strategy |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### program_registrations (refs: programs, users_profile, users_profile, families, users_profile)
- Generation order: 62
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| program_id | uuid | high | → programs.id | NOT NULL | FK → programs.id |
| student_user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| parent_user_id | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| family_id | uuid | high | → families.id | 10% | FK → families.id |
| status | enum | medium |  | 15% | Inferred enum from column name "status" |
| waitlist_position | integer | medium |  | 15% | Inferred from integer type |
| amount_paid_cents | integer | medium |  | 15% | Inferred from integer type |
| payment_status | sentence | low |  | 15% | Generic text — review strategy |
| stripe_payment_intent_id | uuid | high |  | 15% |  |
| consent_signed | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| consent_signed_at | past_date | medium |  | 15% |  |
| consent_signed_by | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| emergency_contact_name | sentence | low |  | 15% | Generic text — review strategy |
| emergency_contact_phone | sentence | low |  | 15% | Generic text — review strategy |
| medical_notes | sentence | low |  | 15% | Generic text — review strategy |
| equipment_assigned | json | low |  | 15% | JSON column — will generate empty object |
| equipment_returned | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| sessions_attended | integer | medium |  | 15% | Inferred from integer type |
| registered_at | past_date | medium |  | 15% |  |
| confirmed_at | past_date | medium |  | 15% |  |
| canceled_at | past_date | medium |  | 15% |  |
| cancel_reason | sentence | low |  | 15% | Generic text — review strategy |

### equipment_assignments (refs: equipment_inventory, users_profile, programs, program_registrations)
- Generation order: 63
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| equipment_id | uuid | high | → equipment_inventory.id | NOT NULL | FK → equipment_inventory.id |
| student_user_id | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| program_id | uuid | high | → programs.id | 10% | FK → programs.id |
| registration_id | uuid | high | → program_registrations.id | 10% | FK → program_registrations.id |
| assigned_at | past_date | medium |  | 15% |  |
| due_date | past_date | medium |  | 15% | Inferred from DATE type |
| returned_at | past_date | medium |  | 15% |  |
| condition_at_checkout | sentence | low |  | 15% | Generic text — review strategy |
| condition_at_return | sentence | low |  | 15% | Generic text — review strategy |
| damage_notes | sentence | low |  | 15% | Generic text — review strategy |
| deposit_collected | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| deposit_returned | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| created_at | past_date | high |  | 15% |  |

### events (root)
- Generation order: 64
- Row ratio: 1x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| type | enum | low |  | NOT NULL | Inferred enum from column name "type" |
| actor_user_id | uuid | high |  | 15% |  |
| subject_type | sentence | low |  | NOT NULL | Generic text — review strategy |
| subject_id | uuid | high |  | NOT NULL |  |
| data | json | low |  | NOT NULL | JSON column — will generate empty object |
| occurred_at | past_date | medium |  | NOT NULL |  |
| created_at | past_date | high |  | NOT NULL |  |

### external_exam_scores (root)
- Generation order: 65
- Row ratio: 1x
- Temporal: verified_at after created_at (+0-7d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| user_id | uuid | high |  | NOT NULL |  |
| exam_type | sentence | low |  | NOT NULL | Generic text — review strategy |
| exam_date | past_date | medium |  | 15% | Inferred from DATE type |
| score | integer | medium |  | NOT NULL |  |
| max_score | decimal | medium |  | 15% | Inferred from numeric type |
| percentile | integer | medium |  | 15% | Inferred from integer type |
| verified | boolean | medium |  | 15% |  |
| verified_at | past_date | medium |  | 15% |  |
| verified_by | word | low |  | 15% | Unknown type "UUID" — defaulted to word |
| verification_document_url | sentence | low |  | 15% | Generic text — review strategy |
| is_active | boolean | high |  | 15% |  |
| metadata | json | low |  | 15% | JSON column — will generate empty object |
| created_at | past_date | high |  | 15% |  |

### family_members (refs: families)
- Generation order: 66
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| family_id | uuid | high | → families.id | NOT NULL | FK → families.id |
| user_id | uuid | high |  | NOT NULL |  |
| member_role | word | low |  | NOT NULL | Unknown type "FAMILY_MEMBER_ROLE" — defaulted to word |
| created_at | past_date | high |  | NOT NULL |  |

### group_session_students (refs: bookings, families)
- Generation order: 67
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| booking_id | uuid | high | → bookings.id | NOT NULL | FK → bookings.id |
| student_user_id | uuid | high |  | NOT NULL |  |
| family_id | uuid | high | → families.id | NOT NULL | FK → families.id |
| enrolled_at | past_date | medium |  | NOT NULL |  |
| canceled_at | past_date | medium |  | 15% |  |
| attendance_status | word | low |  | 15% | Unknown type "ATTENDANCE_STATUS" — defaulted to word |

### guide_compensation_plans (refs: guide_levels)
- Generation order: 68
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| guide_level_code | uuid | high | → guide_levels.level_code | NOT NULL | FK → guide_levels.level_code |
| base_rate_per_hour | decimal | medium |  | NOT NULL | Inferred from numeric type |
| commission_percent | decimal | medium |  | 15% | Inferred from numeric type |
| session_bonus | decimal | medium |  | 15% | Inferred from numeric type |
| retention_bonus | decimal | medium |  | 15% | Inferred from numeric type |
| outcome_bonus_rules | json | low |  | 15% | JSON column — will generate empty object |
| health_stipend | decimal | medium |  | 15% | Inferred from numeric type |
| training_budget | decimal | medium |  | 15% | Inferred from numeric type |
| technology_allowance | decimal | medium |  | 15% | Inferred from numeric type |
| effective_date | past_date | medium |  | NOT NULL | Inferred from DATE type |
| expiration_date | future_date | medium |  | 15% |  |
| is_active | boolean | high |  | 15% |  |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### intake_diagnostics (refs: families, users_profile, users_profile, service_packages)
- Generation order: 69
- Row ratio: 0.5x
- Lifecycle: status → completed_at (null when pending)
- Temporal: updated_at after created_at (+0-30d), completed_at after created_at (+1-60d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| family_id | uuid | high | → families.id | NOT NULL | FK → families.id |
| student_user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| initiated_by | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| student_grade | integer | medium |  | NOT NULL | Inferred from integer type |
| student_goals | sentence | low |  | 15% | Generic text — review strategy |
| current_challenges | sentence | low |  | 15% | Generic text — review strategy |
| course_track | word | low |  | 15% | Unknown type "COURSE_TRACK" — defaulted to word |
| status | enum | medium |  | 15% | Inferred enum from column name "status" |
| questions_json | json | low |  | 15% | JSON column — will generate empty object |
| responses_json | json | low |  | 15% | JSON column — will generate empty object |
| score | integer | medium |  | 15% |  |
| max_score | integer | medium |  | 15% | Inferred from integer type |
| gap_analysis_json | json | low |  | 15% | JSON column — will generate empty object |
| strength_areas | sentence | low |  | 15% | Generic text — review strategy |
| weakness_areas | sentence | low |  | 15% | Generic text — review strategy |
| recommended_tier | word | low |  | 15% | Unknown type "SERVICE_TIER" — defaulted to word |
| recommended_package_id | uuid | high | → service_packages.id | 10% | FK → service_packages.id |
| recommendation_reasoning | sentence | low |  | 15% | Generic text — review strategy |
| started_at | past_date | medium |  | 15% |  |
| completed_at | past_date | high |  | 70% |  |
| expires_at | future_date | medium |  | 15% |  |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### products (root)
- Generation order: 70
- Row ratio: 1x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| name | fullName | medium |  | NOT NULL |  |
| description | sentence | medium |  | 15% |  |
| product_type | word | low |  | NOT NULL | Unknown type "PRODUCT_TYPE" — defaulted to word |
| credits | integer | medium |  | NOT NULL | Inferred from integer type |
| price_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| currency | enum | high |  | NOT NULL | Inferred enum from column name "currency" |
| is_active | boolean | high |  | NOT NULL |  |
| stripe_product_id | uuid | high |  | 15% |  |
| stripe_price_id | uuid | high |  | 15% |  |
| metadata | json | low |  | 15% | JSON column — will generate empty object |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |
| guide_level_required | sentence | low |  | 15% | Generic text — review strategy |
| eligibility_tier_required | word | low |  | 15% | Unknown type "ELIGIBILITY_TIER" — defaulted to word |

### invoice_line_items (refs: invoices, sessions, bookings, products)
- Generation order: 71
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| invoice_id | uuid | high | → invoices.id | NOT NULL | FK → invoices.id |
| description | sentence | medium |  | NOT NULL |  |
| quantity | integer | high |  | NOT NULL |  |
| unit_price_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| amount_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| session_id | uuid | high | → sessions.id | 10% | FK → sessions.id |
| booking_id | uuid | high | → bookings.id | 10% | FK → bookings.id |
| product_id | uuid | high | → products.id | 10% | FK → products.id |
| line_type | sentence | low |  | NOT NULL | Generic text — review strategy |
| created_at | past_date | high |  | NOT NULL |  |

### leads (refs: families, organizations)
- Generation order: 72
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| parent_name | sentence | low |  | NOT NULL | Generic text — review strategy |
| parent_email | sentence | low |  | NOT NULL | Generic text — review strategy |
| parent_phone | sentence | low |  | 15% | Generic text — review strategy |
| student_name | sentence | low |  | 15% | Generic text — review strategy |
| student_grade | integer | medium |  | 15% | Inferred from integer type |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| source | enum | low |  | NOT NULL | Inferred enum from column name "source" |
| source_detail | sentence | low |  | 15% | Generic text — review strategy |
| subjects_interested | sentence | low |  | 15% | Generic text — review strategy |
| goals | sentence | low |  | 15% | Generic text — review strategy |
| notes | sentence | medium |  | 15% |  |
| budget_range | sentence | low |  | 15% | Generic text — review strategy |
| preferred_modality | sentence | low |  | 15% | Generic text — review strategy |
| preferred_schedule | sentence | low |  | 15% | Generic text — review strategy |
| score | integer | medium |  | NOT NULL |  |
| assigned_to | word | low |  | 15% | Unknown type "UUID" — defaulted to word |
| converted_family_id | uuid | high | → families.id | 10% | FK → families.id |
| converted_at | past_date | medium |  | 15% |  |
| lost_reason | sentence | low |  | 15% | Generic text — review strategy |
| last_contacted_at | past_date | medium |  | 15% |  |
| next_follow_up_at | past_date | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |
| organization_id | uuid | high | → organizations.id | 10% | FK → organizations.id |

### lead_activities (refs: leads)
- Generation order: 73
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| lead_id | uuid | high | → leads.id | NOT NULL | FK → leads.id |
| activity_type | word | low |  | NOT NULL | Unknown type "LEAD_ACTIVITY_TYPE" — defaulted to word |
| description | sentence | medium |  | NOT NULL |  |
| metadata | json | low |  | 15% | JSON column — will generate empty object |
| created_by | word | low |  | 15% | Unknown type "UUID" — defaulted to word |
| created_at | past_date | high |  | NOT NULL |  |

### lead_source_stats (root)
- Generation order: 74
- Row ratio: 1x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| source | enum | low |  | NOT NULL | Inferred enum from column name "source" |
| period_start | past_date | medium |  | NOT NULL | Inferred from DATE type |
| period_end | past_date | medium |  | NOT NULL | Inferred from DATE type |
| total_leads | integer | medium |  | NOT NULL | Inferred from integer type |
| qualified_leads | integer | medium |  | NOT NULL | Inferred from integer type |
| trials_scheduled | integer | medium |  | NOT NULL | Inferred from integer type |
| conversions | integer | medium |  | NOT NULL | Inferred from integer type |
| conversion_rate | decimal | medium |  | 15% | Inferred from numeric type |
| avg_time_to_convert_days | decimal | medium |  | 15% | Inferred from numeric type |
| updated_at | past_date | high |  | NOT NULL |  |

### learning_analytics (root)
- Generation order: 75
- Row ratio: 1x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| student_user_id | uuid | high |  | NOT NULL |  |
| metric_type | sentence | low |  | NOT NULL | Generic text — review strategy |
| metric_value | decimal | medium |  | NOT NULL | Inferred from numeric type |
| period_start | past_date | medium |  | NOT NULL | Inferred from DATE type |
| period_end | past_date | medium |  | NOT NULL | Inferred from DATE type |
| details | json | low |  | 15% | JSON column — will generate empty object |
| created_at | past_date | high |  | NOT NULL |  |

### message_threads (root)
- Generation order: 76
- Row ratio: 1x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| participant_a | word | low |  | NOT NULL | Unknown type "UUID" — defaulted to word |
| participant_b | word | low |  | NOT NULL | Unknown type "UUID" — defaulted to word |
| student_user_id | uuid | high |  | 15% |  |
| subject | sentence | medium |  | 15% |  |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| last_message_at | past_date | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### messages (refs: message_threads)
- Generation order: 77
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| thread_id | uuid | high | → message_threads.id | NOT NULL | FK → message_threads.id |
| sender_id | uuid | high |  | NOT NULL |  |
| body | sentence | medium |  | NOT NULL |  |
| read_at | past_date | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |

### notification_preferences (root)
- Generation order: 78
- Row ratio: 1x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| user_id | uuid | high |  | NOT NULL |  |
| channel | enum | low |  | NOT NULL | Inferred enum from column name "channel" |
| notification_type | sentence | low |  | NOT NULL | Generic text — review strategy |
| is_enabled | boolean | high |  | NOT NULL |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### notifications (root)
- Generation order: 79
- Row ratio: 1x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| user_id | uuid | high |  | NOT NULL |  |
| channel | enum | low |  | NOT NULL | Inferred enum from column name "channel" |
| template_key | sentence | low |  | NOT NULL | Generic text — review strategy |
| payload_json | json | low |  | NOT NULL | JSON column — will generate empty object |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| scheduled_for | past_date | medium |  | NOT NULL | Inferred from TIMESTAMP type |
| sent_at | past_date | medium |  | 15% |  |
| error_message | sentence | low |  | 15% | Generic text — review strategy |
| retry_count | integer | medium |  | NOT NULL | Inferred from integer type |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |
| type | enum | low |  | 15% | Inferred enum from column name "type" |
| title | sentence | medium |  | 15% |  |
| message | sentence | low |  | 15% | Generic text — review strategy |
| data | json | low |  | 15% | JSON column — will generate empty object |
| read_at | past_date | medium |  | 15% |  |

### organization_members (refs: organizations, users_profile, users_profile)
- Generation order: 80
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| organization_id | uuid | high | → organizations.id | NOT NULL | FK → organizations.id |
| user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| org_role | sentence | low |  | 15% | Generic text — review strategy |
| external_id | uuid | high |  | 15% |  |
| external_email | sentence | low |  | 15% | Generic text — review strategy |
| is_active | boolean | high |  | 15% |  |
| joined_at | past_date | medium |  | 15% |  |
| invited_by | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| created_at | past_date | high |  | 15% |  |

### parent_child_permissions (refs: users_profile, users_profile, families, users_profile)
- Generation order: 81
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| parent_user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| student_user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| family_id | uuid | high | → families.id | NOT NULL | FK → families.id |
| permissions | word | low |  | 15% | Unknown type "_PARENT_PERMISSION" — defaulted to word |
| relationship | sentence | low |  | 15% | Generic text — review strategy |
| is_primary_guardian | boolean | high |  | 15% |  |
| can_login_as_student | boolean | high |  | 15% |  |
| requires_student_approval | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| granted_at | past_date | medium |  | 15% |  |
| granted_by | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| expires_at | future_date | medium |  | 15% |  |
| revoked_at | past_date | medium |  | 15% |  |
| created_at | past_date | high |  | 15% |  |

### parental_consents (refs: users_profile, users_profile, families)
- Generation order: 82
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| student_user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| parent_user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| family_id | uuid | high | → families.id | 10% | FK → families.id |
| consent_type | word | low |  | NOT NULL | Unknown type "CONSENT_TYPE" — defaulted to word |
| status | enum | medium |  | 15% | Inferred enum from column name "status" |
| student_age_at_consent | integer | medium |  | 15% | Inferred from integer type |
| is_coppa_applicable | boolean | high |  | 15% |  |
| is_ferpa_applicable | boolean | high |  | 15% |  |
| consent_version | sentence | low |  | NOT NULL | Generic text — review strategy |
| consent_text_hash | sentence | low |  | 15% | Generic text — review strategy |
| ip_address | word | low |  | 15% | Unknown type "INET" — defaulted to word |
| user_agent | sentence | low |  | 15% | Generic text — review strategy |
| requested_at | past_date | medium |  | 15% |  |
| responded_at | past_date | medium |  | 15% |  |
| expires_at | future_date | medium |  | 15% |  |
| revoked_at | past_date | medium |  | 15% |  |
| revoked_reason | sentence | low |  | 15% | Generic text — review strategy |
| signature_data | json | low |  | 15% | JSON column — will generate empty object |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### payout_periods (root)
- Generation order: 83
- Row ratio: 1x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| period_type | word | low |  | NOT NULL | Unknown type "PAYOUT_PERIOD_TYPE" — defaulted to word |
| period_start | past_date | medium |  | NOT NULL | Inferred from DATE type |
| period_end | past_date | medium |  | NOT NULL | Inferred from DATE type |
| is_locked | boolean | high |  | NOT NULL |  |
| created_at | past_date | high |  | NOT NULL |  |

### tutor_payouts (refs: tutors_profile, payout_periods, organizations)
- Generation order: 84
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d), approved_at after created_at (+0-14d), paid_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| tutor_user_id | uuid | high | → tutors_profile.user_id | NOT NULL | FK → tutors_profile.user_id |
| period_id | uuid | high | → payout_periods.id | NOT NULL | FK → payout_periods.id |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| sessions_count | integer | medium |  | NOT NULL | Inferred from integer type |
| total_hours | decimal | medium |  | NOT NULL | Inferred from numeric type |
| base_amount_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| bonus_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| deduction_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| total_amount_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| notes | sentence | medium |  | 15% |  |
| approved_by | word | low |  | 15% | Unknown type "UUID" — defaulted to word |
| approved_at | past_date | high |  | 15% |  |
| paid_at | past_date | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |
| organization_id | uuid | high | → organizations.id | 10% | FK → organizations.id |

### payout_line_items (refs: tutor_payouts, sessions, bookings)
- Generation order: 85
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| payout_id | uuid | high | → tutor_payouts.id | NOT NULL | FK → tutor_payouts.id |
| session_id | uuid | high | → sessions.id | 10% | FK → sessions.id |
| booking_id | uuid | high | → bookings.id | 10% | FK → bookings.id |
| description | sentence | medium |  | NOT NULL |  |
| rate_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| quantity | integer | high |  | NOT NULL |  |
| amount_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| line_type | sentence | low |  | NOT NULL | Generic text — review strategy |
| created_at | past_date | high |  | NOT NULL |  |

### permissions (root)
- Generation order: 86
- Row ratio: 1x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| code | sentence | low |  | NOT NULL | Generic text — review strategy |
| name | fullName | medium |  | NOT NULL |  |
| description | sentence | medium |  | 15% |  |
| category | enum | low |  | 15% | Inferred enum from column name "category" |
| default_for_roles | sentence | low |  | 15% | Generic text — review strategy |
| is_sensitive | boolean | high |  | 15% |  |
| requires_audit | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| created_at | past_date | high |  | 15% |  |

### practice_logs (refs: users_profile, program_enrollments, users_profile)
- Generation order: 87
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| student_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| enrollment_id | uuid | high | → program_enrollments.id | 10% | FK → program_enrollments.id |
| practice_date | past_date | medium |  | NOT NULL | Inferred from DATE type |
| duration_minutes | integer | medium |  | NOT NULL | Inferred from integer type |
| concepts_practiced | word | low |  | 15% | Unknown type "_UUID" — defaulted to word |
| description | sentence | medium |  | 15% |  |
| logged_by | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| verified_by_coach | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| created_at | past_date | high |  | NOT NULL |  |

### program_sessions (refs: programs)
- Generation order: 88
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| program_id | uuid | high | → programs.id | NOT NULL | FK → programs.id |
| session_number | integer | medium |  | NOT NULL | Inferred from integer type |
| title | sentence | medium |  | 15% |  |
| description | sentence | medium |  | 15% |  |
| start_at | past_date | medium |  | NOT NULL |  |
| end_at | past_date | medium |  | NOT NULL |  |
| location_name | sentence | low |  | 15% | Generic text — review strategy |
| video_link | sentence | low |  | 15% | Generic text — review strategy |
| topics | sentence | low |  | 15% | Generic text — review strategy |
| materials_url | sentence | low |  | 15% | Generic text — review strategy |
| homework_description | sentence | low |  | 15% | Generic text — review strategy |
| created_at | past_date | high |  | 15% |  |

### program_attendance (refs: program_sessions, program_registrations, users_profile)
- Generation order: 89
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| program_session_id | uuid | high | → program_sessions.id | NOT NULL | FK → program_sessions.id |
| registration_id | uuid | high | → program_registrations.id | NOT NULL | FK → program_registrations.id |
| student_user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| status | enum | medium |  | 15% | Inferred enum from column name "status" |
| check_in_at | past_date | medium |  | 15% |  |
| check_out_at | past_date | medium |  | 15% |  |
| notes | sentence | medium |  | 15% |  |
| created_at | past_date | high |  | 15% |  |

### program_courses (refs: coaching_programs, courses)
- Generation order: 90
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| program_id | uuid | high | → coaching_programs.id | 10% | FK → coaching_programs.id |
| course_id | uuid | high | → courses.id | 10% | FK → courses.id |

### program_guides (refs: programs, guide_levels)
- Generation order: 91
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| program_id | uuid | high | → programs.id | NOT NULL | FK → programs.id |
| guide_level_code | uuid | high | → guide_levels.level_code | NOT NULL | FK → guide_levels.level_code |
| min_guides_required | integer | medium |  | 15% | Inferred from integer type |
| max_guides_allowed | integer | medium |  | 15% | Inferred from integer type |
| guide_student_ratio | decimal | medium |  | 15% | Inferred from numeric type |
| created_at | past_date | high |  | 15% |  |

### purchases (refs: families, products, family_subscriptions, service_packages)
- Generation order: 92
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d), paid_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| family_id | uuid | high | → families.id | NOT NULL | FK → families.id |
| parent_user_id | uuid | high |  | NOT NULL |  |
| product_id | uuid | high | → products.id | NOT NULL | FK → products.id |
| amount_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| currency | enum | high |  | NOT NULL | Inferred enum from column name "currency" |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| stripe_payment_intent_id | uuid | high |  | 15% |  |
| stripe_checkout_session_id | uuid | high |  | 15% |  |
| paid_at | past_date | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |
| subscription_id | uuid | high | → family_subscriptions.id | 10% | FK → family_subscriptions.id |
| service_package_id | uuid | high | → service_packages.id | 10% | FK → service_packages.id |

### question_bank_categories (root)
- Generation order: 93
- Row ratio: 1x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| parent_id | uuid | high | → question_bank_categories.id | 10% | FK → question_bank_categories.id |
| name | fullName | medium |  | NOT NULL |  |
| slug | sentence | low |  | NOT NULL | Generic text — review strategy |
| description | sentence | medium |  | 15% |  |
| display_order | integer | medium |  | 15% | Inferred from integer type |
| is_active | boolean | high |  | 15% |  |
| created_at | past_date | high |  | 15% |  |

### recurring_series (refs: tutors_profile, families, rooms, organizations)
- Generation order: 94
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| tutor_user_id | uuid | high | → tutors_profile.user_id | NOT NULL | FK → tutors_profile.user_id |
| student_user_id | uuid | high |  | 15% |  |
| family_id | uuid | high | → families.id | 10% | FK → families.id |
| room_id | uuid | high | → rooms.id | 10% | FK → rooms.id |
| pattern | word | low |  | NOT NULL | Unknown type "RECURRENCE_PATTERN" — defaulted to word |
| day_of_week | integer | medium |  | NOT NULL | Inferred from integer type |
| start_time | word | low |  | NOT NULL | Unknown type "TIME" — defaulted to word |
| end_time | word | low |  | NOT NULL | Unknown type "TIME" — defaulted to word |
| modality | word | low |  | NOT NULL | Unknown type "MODALITY" — defaulted to word |
| is_group | boolean | high |  | NOT NULL |  |
| max_students | integer | medium |  | 15% | Inferred from integer type |
| subject | sentence | medium |  | 15% |  |
| title | sentence | medium |  | 15% |  |
| starts_on | past_date | medium |  | NOT NULL | Inferred from DATE type |
| ends_on | past_date | medium |  | 15% | Inferred from DATE type |
| is_active | boolean | high |  | NOT NULL |  |
| total_generated | integer | medium |  | NOT NULL | Inferred from integer type |
| notes | sentence | medium |  | 15% |  |
| created_by | word | low |  | 15% | Unknown type "UUID" — defaulted to word |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |
| organization_id | uuid | high | → organizations.id | 10% | FK → organizations.id |

### referral_codes (refs: families)
- Generation order: 95
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| family_id | uuid | high | → families.id | NOT NULL | FK → families.id |
| code | sentence | low |  | NOT NULL | Generic text — review strategy |
| is_active | boolean | high |  | NOT NULL |  |
| total_referrals | integer | medium |  | NOT NULL | Inferred from integer type |
| total_conversions | integer | medium |  | NOT NULL | Inferred from integer type |
| total_reward_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| created_at | past_date | high |  | NOT NULL |  |

### referral_reward_policies (root)
- Generation order: 96
- Row ratio: 1x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| name | fullName | medium |  | NOT NULL |  |
| description | sentence | medium |  | 15% |  |
| referrer_reward_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| referred_reward_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| min_sessions_to_qualify | integer | medium |  | NOT NULL | Inferred from integer type |
| expires_after_days | future_date | medium |  | 15% |  |
| is_active | boolean | high |  | NOT NULL |  |
| created_at | past_date | high |  | NOT NULL |  |

### referrals (refs: referral_codes, families, leads, families)
- Generation order: 97
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d), expired_at after created_at (+30-365d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| referral_code_id | uuid | high | → referral_codes.id | NOT NULL | FK → referral_codes.id |
| referrer_family_id | uuid | high | → families.id | NOT NULL | FK → families.id |
| referred_lead_id | uuid | high | → leads.id | 10% | FK → leads.id |
| referred_family_id | uuid | high | → families.id | 10% | FK → families.id |
| referred_name | sentence | low |  | NOT NULL | Generic text — review strategy |
| referred_email | sentence | low |  | NOT NULL | Generic text — review strategy |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| referrer_reward_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| referred_reward_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| reward_applied_at | past_date | medium |  | 15% |  |
| converted_at | past_date | medium |  | 15% |  |
| expired_at | future_date | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### scheduling_suggestions (refs: families, tutors_profile)
- Generation order: 98
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| student_user_id | uuid | high |  | NOT NULL |  |
| family_id | uuid | high | → families.id | NOT NULL | FK → families.id |
| tutor_user_id | uuid | high | → tutors_profile.user_id | 10% | FK → tutors_profile.user_id |
| suggested_date | past_date | medium |  | NOT NULL | Inferred from DATE type |
| suggested_start_time | word | low |  | NOT NULL | Unknown type "TIME" — defaulted to word |
| suggested_end_time | word | low |  | NOT NULL | Unknown type "TIME" — defaulted to word |
| reason | sentence | low |  | NOT NULL | Generic text — review strategy |
| score | integer | medium |  | NOT NULL |  |
| is_accepted | boolean | high |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |
| expires_at | future_date | medium |  | NOT NULL |  |

### session_attachments (refs: sessions)
- Generation order: 99
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| session_id | uuid | high | → sessions.id | NOT NULL | FK → sessions.id |
| file_name | sentence | low |  | NOT NULL | Generic text — review strategy |
| file_path | sentence | low |  | NOT NULL | Generic text — review strategy |
| file_size | integer | medium |  | NOT NULL | Inferred from integer type |
| mime_type | sentence | low |  | NOT NULL | Generic text — review strategy |
| uploaded_by | word | low |  | NOT NULL | Unknown type "UUID" — defaulted to word |
| created_at | past_date | high |  | NOT NULL |  |

### session_attendance (refs: program_enrollments, sessions, bookings, users_profile, users_profile, users_profile)
- Generation order: 100
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| enrollment_id | uuid | high | → program_enrollments.id | NOT NULL | FK → program_enrollments.id |
| session_id | uuid | high | → sessions.id | 10% | FK → sessions.id |
| booking_id | uuid | high | → bookings.id | 10% | FK → bookings.id |
| student_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| coach_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| scheduled_date | past_date | medium |  | NOT NULL | Inferred from DATE type |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| noted_by | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| notes | sentence | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### session_feedback (refs: sessions, users_profile, users_profile)
- Generation order: 101
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| session_id | uuid | high | → sessions.id | NOT NULL | FK → sessions.id |
| student_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| attendance_confirmed | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| reflection | sentence | low |  | 15% | Generic text — review strategy |
| parent_concern | sentence | low |  | 15% | Generic text — review strategy |
| submitted_by | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| submitted_at | past_date | medium |  | NOT NULL |  |

### session_skills (refs: sessions, skills)
- Generation order: 102
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| session_id | uuid | high | → sessions.id | NOT NULL | FK → sessions.id |
| skill_id | uuid | high | → skills.id | NOT NULL | FK → skills.id |
| exposure_level | word | low |  | NOT NULL | Unknown type "SKILL_EXPOSURE" — defaulted to word |
| notes | sentence | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |

### session_whiteboards (refs: sessions)
- Generation order: 103
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| session_id | uuid | high | → sessions.id | NOT NULL | FK → sessions.id |
| elements | json | low |  | NOT NULL | JSON column — will generate empty object |
| version | integer | medium |  | NOT NULL | Inferred from integer type |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### sso_sessions (refs: users_profile, organizations)
- Generation order: 104
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| organization_id | uuid | high | → organizations.id | NOT NULL | FK → organizations.id |
| provider | word | low |  | NOT NULL | Unknown type "SSO_PROVIDER" — defaulted to word |
| external_session_id | uuid | high |  | 15% |  |
| access_token | sentence | low |  | 15% | Generic text — review strategy |
| refresh_token | sentence | low |  | 15% | Generic text — review strategy |
| token_expires_at | past_date | medium |  | 15% |  |
| started_at | past_date | medium |  | 15% |  |
| last_activity_at | past_date | medium |  | 15% |  |
| ended_at | past_date | high |  | 15% |  |
| ip_address | word | low |  | 15% | Unknown type "INET" — defaulted to word |
| user_agent | sentence | low |  | 15% | Generic text — review strategy |

### stripe_webhook_events (root)
- Generation order: 105
- Row ratio: 1x
- Temporal: processed_at after created_at (+0-7d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| stripe_event_id | uuid | high |  | NOT NULL |  |
| event_type | sentence | low |  | NOT NULL | Generic text — review strategy |
| payload_json | json | low |  | NOT NULL | JSON column — will generate empty object |
| processed_at | past_date | high |  | 15% |  |
| error_message | sentence | low |  | 15% | Generic text — review strategy |
| created_at | past_date | high |  | NOT NULL |  |

### student_concept_mastery (refs: users_profile, atomic_concepts, program_enrollments, users_profile)
- Generation order: 106
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| student_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| concept_id | uuid | high | → atomic_concepts.id | NOT NULL | FK → atomic_concepts.id |
| enrollment_id | uuid | high | → program_enrollments.id | 10% | FK → program_enrollments.id |
| mastery_level | sentence | low |  | NOT NULL | Generic text — review strategy |
| assessed_by | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| assessed_at | past_date | medium |  | 15% |  |
| notes | sentence | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### student_eligibility_profiles (refs: users_profile, users_profile)
- Generation order: 107
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| student_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| assessment_date | past_date | medium |  | NOT NULL | Inferred from DATE type |
| academic_performance | integer | medium |  | 15% | Inferred from integer type |
| math_passion | integer | medium |  | 15% | Inferred from integer type |
| achievement_level | integer | medium |  | 15% | Inferred from integer type |
| career_direction | integer | medium |  | 15% | Inferred from integer type |
| personal_qualities | integer | medium |  | 15% | Inferred from integer type |
| total_score | integer | medium |  | 15% | Inferred from integer type |
| notes | sentence | medium |  | 15% |  |
| assessed_by | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| next_assessment_date | past_date | medium |  | 15% | Inferred from DATE type |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### student_pathway_recommendations (refs: users_profile, career_pathways, guide_levels)
- Generation order: 108
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| student_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| pathway_id | uuid | high | → career_pathways.id | NOT NULL | FK → career_pathways.id |
| recommended_guide_level | uuid | high | → guide_levels.level_code | 10% | FK → guide_levels.level_code |
| confidence_score | decimal | medium |  | 15% | Inferred from numeric type |
| reason_codes | sentence | low |  | 15% | Generic text — review strategy |
| suggested_programs | word | low |  | 15% | Unknown type "_UUID" — defaulted to word |
| recommended_start_date | past_date | medium |  | 15% | Inferred from DATE type |
| estimated_completion_months | integer | medium |  | 15% | Inferred from integer type |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### student_skill_mastery (refs: skills)
- Generation order: 109
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| student_user_id | uuid | high |  | NOT NULL |  |
| skill_id | uuid | high | → skills.id | NOT NULL | FK → skills.id |
| mastery_level | word | low |  | NOT NULL | Unknown type "MASTERY_LEVEL" — defaulted to word |
| last_practiced_at | past_date | medium |  | 15% |  |
| updated_by_user_id | uuid | high |  | NOT NULL |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### students_profile (refs: families, users_profile, intake_diagnostics, family_subscriptions)
- Generation order: 110
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| user_id | uuid | high |  | 15% | Primary key (UUID) |
| family_id | uuid | high | → families.id | NOT NULL | FK → families.id |
| grade | enum | medium |  | NOT NULL | Inferred enum from column name "grade" |
| course_track | word | low |  | NOT NULL | Unknown type "COURSE_TRACK" — defaulted to word |
| goals | sentence | low |  | 15% | Generic text — review strategy |
| notes | sentence | medium |  | 15% |  |
| baseline_diagnostic_id | uuid | high |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |
| date_of_birth | past_date | high |  | 15% |  |
| age_verified | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| age_verified_at | past_date | medium |  | 15% |  |
| age_verified_by | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| intake_diagnostic_id | uuid | high | → intake_diagnostics.id | 10% | FK → intake_diagnostics.id |
| active_subscription_id | uuid | high | → family_subscriptions.id | 10% | FK → family_subscriptions.id |
| current_service_tier | sentence | low |  | 15% | Generic text — review strategy |

### trial_lessons (refs: leads, tutors_profile)
- Generation order: 111
- Row ratio: 0.5x
- Lifecycle: status → completed_at (null when pending)
- Temporal: updated_at after created_at (+0-30d), completed_at after created_at (+1-60d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| lead_id | uuid | high | → leads.id | NOT NULL | FK → leads.id |
| tutor_user_id | uuid | high | → tutors_profile.user_id | 10% | FK → tutors_profile.user_id |
| student_name | sentence | low |  | NOT NULL | Generic text — review strategy |
| student_grade | integer | medium |  | 15% | Inferred from integer type |
| subject | sentence | medium |  | 15% |  |
| scheduled_at | past_date | medium |  | NOT NULL |  |
| duration_minutes | integer | medium |  | NOT NULL | Inferred from integer type |
| modality | sentence | low |  | NOT NULL | Generic text — review strategy |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| tutor_notes | sentence | low |  | 15% | Generic text — review strategy |
| tutor_rating | integer | medium |  | 15% | Inferred from integer type |
| parent_feedback | sentence | low |  | 15% | Generic text — review strategy |
| parent_rating | integer | medium |  | 15% | Inferred from integer type |
| recommended_track | sentence | low |  | 15% | Generic text — review strategy |
| recommended_package | sentence | low |  | 15% | Generic text — review strategy |
| completed_at | past_date | high |  | 70% |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### trust_scores (root)
- Generation order: 112
- Row ratio: 1x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| parent_user_id | uuid | high |  | NOT NULL |  |
| tutor_user_id | uuid | high |  | NOT NULL |  |
| score | integer | medium |  | NOT NULL |  |
| level | enum | medium |  | NOT NULL | Inferred enum from column name "level" |
| sessions_completed | integer | medium |  | NOT NULL | Inferred from integer type |
| positive_reports | integer | medium |  | NOT NULL | Inferred from integer type |
| concerns_raised | integer | medium |  | NOT NULL | Inferred from integer type |
| last_session_at | past_date | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### trust_events (refs: trust_scores)
- Generation order: 113
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| trust_score_id | uuid | high | → trust_scores.id | NOT NULL | FK → trust_scores.id |
| event_type | word | low |  | NOT NULL | Unknown type "TRUST_EVENT_TYPE" — defaulted to word |
| delta | integer | medium |  | NOT NULL | Inferred from integer type |
| note | sentence | medium |  | 15% |  |
| created_by | word | low |  | 15% | Unknown type "UUID" — defaulted to word |
| created_at | past_date | high |  | NOT NULL |  |

### tutor_certifications (refs: users_profile, users_profile)
- Generation order: 114
- Row ratio: 0.5x
- Temporal: verified_at after created_at (+0-7d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| tutor_user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| name | fullName | medium |  | NOT NULL |  |
| issuing_organization | sentence | low |  | 15% | Generic text — review strategy |
| credential_id | uuid | high |  | 15% |  |
| issue_date | past_date | medium |  | 15% | Inferred from DATE type |
| expiry_date | future_date | medium |  | 15% |  |
| document_url | sentence | low |  | 15% | Generic text — review strategy |
| verified | boolean | medium |  | 15% |  |
| verified_at | past_date | medium |  | 15% |  |
| verified_by | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| created_at | past_date | high |  | 15% |  |

### tutor_pay_rates (refs: tutors_profile)
- Generation order: 115
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| tutor_user_id | uuid | high | → tutors_profile.user_id | NOT NULL | FK → tutors_profile.user_id |
| label | sentence | low |  | NOT NULL | Generic text — review strategy |
| rate_cents | integer | medium |  | NOT NULL | Inferred from integer type |
| rate_type | sentence | low |  | NOT NULL | Generic text — review strategy |
| is_default | boolean | high |  | NOT NULL |  |
| effective_from | past_date | high |  | NOT NULL |  |
| effective_until | past_date | medium |  | 15% | Inferred from DATE type |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### tutor_verifications (refs: users_profile, users_profile)
- Generation order: 116
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d), verified_at after created_at (+0-7d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| tutor_user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| verification_type | word | low |  | NOT NULL | Unknown type "VERIFICATION_TYPE" — defaulted to word |
| status | enum | medium |  | 15% | Inferred enum from column name "status" |
| provider | sentence | low |  | 15% | Generic text — review strategy |
| external_id | uuid | high |  | 15% |  |
| document_urls | sentence | low |  | 15% | Generic text — review strategy |
| document_names | sentence | low |  | 15% | Generic text — review strategy |
| result_data | json | low |  | 15% | JSON column — will generate empty object |
| passed | boolean | medium |  | 15% | Inferred from BOOLEAN type |
| score | integer | medium |  | 15% |  |
| reviewed_by | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| reviewed_at | past_date | medium |  | 15% |  |
| review_notes | sentence | low |  | 15% | Generic text — review strategy |
| rejection_reason | sentence | low |  | 15% | Generic text — review strategy |
| verified_at | past_date | medium |  | 15% |  |
| expires_at | future_date | medium |  | 15% |  |
| submitted_at | past_date | medium |  | 15% |  |
| created_at | past_date | high |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### user_certification_progress (refs: certification_programs)
- Generation order: 117
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| user_id | uuid | high |  | NOT NULL |  |
| program_id | uuid | high | → certification_programs.id | NOT NULL | FK → certification_programs.id |
| started_at | past_date | medium |  | 15% |  |
| last_activity_at | past_date | medium |  | 15% |  |
| requirements_completed | json | low |  | 15% | JSON column — will generate empty object |
| completion_percentage | decimal | medium |  | 15% | Inferred from numeric type |
| status | enum | medium |  | 15% | Inferred enum from column name "status" |
| metadata | json | low |  | 15% | JSON column — will generate empty object |
| updated_at | past_date | high |  | 15% |  |

### user_integrations (refs: users_profile)
- Generation order: 118
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| provider | sentence | low |  | NOT NULL | Generic text — review strategy |
| access_token | sentence | low |  | 15% | Generic text — review strategy |
| refresh_token | sentence | low |  | 15% | Generic text — review strategy |
| token_expiry | past_date | medium |  | 15% | Inferred from TIMESTAMP type |
| email | email | high |  | 15% |  |
| scopes | sentence | low |  | 15% | Generic text — review strategy |
| metadata | json | low |  | 15% | JSON column — will generate empty object |
| connected_at | past_date | medium |  | 15% |  |
| updated_at | past_date | high |  | 15% |  |

### user_role_assignments (refs: users_profile, custom_roles, organizations, users_profile)
- Generation order: 119
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| role_id | uuid | high | → custom_roles.id | NOT NULL | FK → custom_roles.id |
| organization_id | uuid | high | → organizations.id | 10% | FK → organizations.id |
| granted_at | past_date | medium |  | 15% |  |
| granted_by | uuid | high | → users_profile.id | 10% | FK → users_profile.id |
| expires_at | future_date | medium |  | 15% |  |

### waitlist (refs: families, tutors_profile)
- Generation order: 120
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| family_id | uuid | high | → families.id | NOT NULL | FK → families.id |
| student_user_id | uuid | high |  | NOT NULL |  |
| parent_user_id | uuid | high |  | NOT NULL |  |
| tutor_user_id | uuid | high | → tutors_profile.user_id | 10% | FK → tutors_profile.user_id |
| preferred_date | past_date | medium |  | NOT NULL | Inferred from DATE type |
| preferred_start_time | word | low |  | NOT NULL | Unknown type "TIME" — defaulted to word |
| preferred_end_time | word | low |  | NOT NULL | Unknown type "TIME" — defaulted to word |
| modality | word | low |  | NOT NULL | Unknown type "MODALITY" — defaulted to word |
| status | enum | medium |  | NOT NULL | Inferred enum from column name "status" |
| notes | sentence | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### weekly_reports (refs: families)
- Generation order: 121
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| student_user_id | uuid | high |  | NOT NULL |  |
| family_id | uuid | high | → families.id | NOT NULL | FK → families.id |
| week_start | past_date | medium |  | NOT NULL | Inferred from DATE type |
| week_end | past_date | medium |  | NOT NULL | Inferred from DATE type |
| sessions_count | integer | medium |  | NOT NULL | Inferred from integer type |
| attendance_rate | decimal | medium |  | 15% | Inferred from numeric type |
| skills_practiced | sentence | low |  | 15% | Generic text — review strategy |
| mastery_changes | json | low |  | 15% | JSON column — will generate empty object |
| summary_text | sentence | low |  | 15% | Generic text — review strategy |
| recommendations | sentence | low |  | 15% | Generic text — review strategy |
| is_at_risk | boolean | high |  | NOT NULL |  |
| at_risk_reasons | sentence | low |  | 15% | Generic text — review strategy |
| generated_at | past_date | medium |  | NOT NULL |  |
| sent_at | past_date | medium |  | 15% |  |
| created_at | past_date | high |  | NOT NULL |  |

### whiteboards (refs: users_profile)
- Generation order: 122
- Row ratio: 0.5x
- Temporal: updated_at after created_at (+0-30d)

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| tutor_user_id | uuid | high | → users_profile.id | NOT NULL | FK → users_profile.id |
| name | fullName | medium |  | NOT NULL |  |
| description | sentence | medium |  | 15% |  |
| category | enum | low |  | 15% | Inferred enum from column name "category" |
| elements | json | low |  | NOT NULL | JSON column — will generate empty object |
| is_public | boolean | high |  | NOT NULL |  |
| tags | sentence | low |  | 15% | Generic text — review strategy |
| version | integer | medium |  | NOT NULL | Inferred from integer type |
| created_at | past_date | high |  | NOT NULL |  |
| updated_at | past_date | high |  | NOT NULL |  |

### zoom_meetings (refs: bookings)
- Generation order: 123
- Row ratio: 0.5x

| Column | Strategy | Confidence | FK | Nullable | Notes |
|--------|----------|------------|-----|----------|-------|
| id | uuid | high |  | 15% | Primary key (UUID) |
| booking_id | uuid | high | → bookings.id | NOT NULL | FK → bookings.id |
| zoom_meeting_id | uuid | high |  | NOT NULL |  |
| join_url | sentence | low |  | NOT NULL | Generic text — review strategy |
| start_url | sentence | low |  | 15% | Generic text — review strategy |
| password | sentence | low |  | 15% | Generic text — review strategy |
| created_at | past_date | high |  | 15% |  |
