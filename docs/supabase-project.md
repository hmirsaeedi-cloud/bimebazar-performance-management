# Supabase Backend

Project: BimeBazar Performance Management  
Project ID / ref: `omjblauittoyxknabrqg`  
Region: `us-east-1`  
URL: `https://omjblauittoyxknabrqg.supabase.co`

## Applied Migration

`20260525213356_supabase_auth_foundation`
`20260525215208_employee_profile_crud`
`20260525221041_rbac_five_roles`
`20260525221609_auto_manager_role_assignment`
`20260525221828_profile_roles_manual_computed_coexist`
`20260525222520_jalali_calendar_foundation`
`20260530093907_form_builder_all_question_types`
`20260530100705_mpa_employee_approval_workflow`
`20260530100743_mpa_hr_admin_employee_approval_permission`
`20260530105637_bulk_employee_import_via_excel`
`20260530110306_process_engine_create_configure`
`20260531124018_core_calendar_preferences`
`20260531125134_core_language_preferences`
`20260531125849_form_builder_return_and_visibility_audit`
`20260531130428_bulk_employee_import_controls`
`20260531130945_process_engine_version_lock_and_eligibility`
`20260531131728_form_template_library`
`20260531132343_employee_export_report`
`20260531135631_mpa_approval_guards`
`20260531140841_upward_self_assessment_process`
`20260531155040_mpa_rich_text_editor`
`20260531155709_downward_process_routing_chain`
`20260531160203_mpa_auto_attach_to_evaluation`
`20260531161048_end_cycle_evaluation_form`
`20260531161423_evaluation_scoring_engine_weighted`
`20260531162153_evaluation_workflow_chain`
`20260531164035_pd_chat_logging`
`20260531164905_mid_cycle_evaluation`
`20260601113437_immutable_audit_log`
`20260601120211_in_app_notifications`
`20260601121234_dashboard_all_role_views`
`20260601154341_feedback_request_basic`
`20260601155022_process_form_instance_table`
`20260601155819_promotion_trigger_workflow`
`20260601160914_pip_trigger_workflow`
`20260601161735_email_notifications`
`20260601162609_mpa_history_versioning`
`20260601162720_mpa_history_seed_data`
`20260601163342_form_versioning_on_edit`
`20260602121415_admin_form_movement_audit_reason`
`20260602122152_notification_preference_settings`
`20260602122940_self_assessment_manager_side_by_side`

This created:

- `public.roles`
- `public.permissions`
- `public.role_permissions`
- `public.profiles`
- `public.profile_roles`
- `public.business_units`
- `public.departments`
- `public.teams`
- `public.audit_events`
- `public.audit_export_requests`
- `public.form_templates`
- `public.form_template_versions`
- `public.mpa_cycles`
- `public.mpas`
- `public.mpa_content_revisions`
- `public.mpa_history_versions`
- `public.mpa_evaluation_attachments`
- `public.employee_import_runs`
- `public.employee_import_rows`
- `public.performance_processes`
- `public.process_participants`
- `public.process_self_assessments`
- `public.process_downward_evaluations`
- `public.end_cycle_evaluations`
- `public.evaluation_score_snapshots`
- `public.pd_chat_logs`
- `public.mid_cycle_evaluations`
- `public.mid_cycle_score_snapshots`
- `public.notifications`
- `public.dashboard_preferences`
- `public.feedback_requests`
- `public.feedback_request_recipients`
- `public.feedback_responses`
- `public.process_form_instances`
- `public.promotion_cases`
- `public.pip_cases`
- `public.email_notifications`
- `app_private.current_user_role()`
- `app_private.current_user_has_role(target_role text)`
- `app_private.set_audit_event_hash()`
- `app_private.prevent_audit_event_mutation()`
- `app_private.active_direct_report_count(manager_user_id uuid)`
- `app_private.sync_computed_manager_role(manager_user_id uuid)`
- private Storage bucket `profile-documents`

Profiles now default to Jalali calendar display:

- `preferred_calendar = 'jalali'`
- `preferred_locale = 'fa-IR'`
- `date_display_timezone = 'Asia/Tehran'`
- `calendar_preference_status = 'defaulted'`

Core calendar preferences are guarded by:

- `core.calendar.read`
- `core.calendar.update`
- `core.calendar.override`

Profiles now default to Persian RTL display:

- `preferred_language = 'fa'`
- `text_direction = 'rtl'`
- `language_preference_status = 'defaulted'`

Core language preferences are guarded by:

- `core.language.read`
- `core.language.update`
- `core.language.override`

Individual survey processes are guarded by:

- `process.survey.read`
- `process.survey.create`
- `process.survey.update`
- `process.survey.start`
- `process.survey.submit`
- `process.survey.approve`
- `process.survey.return`
- `process.survey.override`
- `process.survey.complete`
- `process.survey.cancel`

Tables:

- `individual_survey_processes`
- `individual_survey_responses`

Performance band auto-flags are guarded by:

- `evaluation.band_flags.read`
- `evaluation.band_flags.create`
- `evaluation.band_flags.update`
- `evaluation.band_flags.submit`
- `evaluation.band_flags.approve`
- `evaluation.band_flags.return`
- `evaluation.band_flags.override`
- `evaluation.band_flags.convert`
- `evaluation.band_flags.dismiss`

Table:

- `performance_band_flags`

Feedback anonymity guards are protected by:

- `feedback.anonymity_review`
- `feedback.anonymity_release`

Columns added to `feedback_requests`:

- `min_response_count`
- `anonymity_status`
- `responses_released_at`

PD Chat evaluation attachments are guarded by:

- `pd_chat.attach`

Table:

- `pd_chat_evaluation_attachments`

Columns added for attachment visibility:

- `pd_chat_logs.attached_evaluation_type`
- `pd_chat_logs.attached_evaluation_id`
- `pd_chat_logs.attached_at`
- `end_cycle_evaluations.attached_pd_chat_id`
- `mid_cycle_evaluations.attached_pd_chat_id`
- `process_downward_evaluations.attached_pd_chat_id`

HRBP aggregated reports are guarded by:

- `reports.read`
- `reports.create`
- `reports.generate`
- `reports.submit`
- `reports.approve`
- `reports.return`
- `reports.override`
- `reports.export`
- `reports.archive`

Table:

- `hrbp_report_snapshots`

Admin form movement is guarded by:

- `process.admin_move`

Columns added to `process_form_instances`:

- `admin_moved_at`
- `admin_moved_by`
- `admin_move_reason`
- `admin_move_from_status`
- `admin_move_to_status`

Notification preference settings are guarded by:

- `notifications.preferences.read`
- `notifications.preferences.update`
- `notifications.preferences.submit`
- `notifications.preferences.approve`
- `notifications.preferences.return`
- `notifications.preferences.override`

Table:

- `notification_preferences`

Self-assessment vs. manager side-by-side comparisons are guarded by:

- `evaluation.comparison.read`
- `evaluation.comparison.create`
- `evaluation.comparison.update`
- `evaluation.comparison.submit`
- `evaluation.comparison.approve`
- `evaluation.comparison.return`
- `evaluation.comparison.override`
- `evaluation.comparison.complete`

Table:

- `evaluation_comparisons`

## Environment

Use `.env.example` as the starting point. The publishable key is safe for browser usage. The `SUPABASE_SECRET_KEY` must be copied from the Supabase dashboard and kept server-only.

## First HR Admin

Create the first HR Admin in Supabase Auth, then insert a matching profile row:

```sql
insert into public.profiles (
  id,
  email,
  display_name,
  employee_id,
  role_code,
  account_status
)
values (
  '<auth.users.id>',
  'hr.admin@bimebazar.local',
  'HR Admin',
  'BB-0001',
  'HR_ADMIN',
  'active'
);
```

Do not store authorization decisions in user-editable metadata.
