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
- `public.form_templates`
- `public.form_template_versions`
- `public.mpa_cycles`
- `public.mpas`
- `public.employee_import_runs`
- `public.employee_import_rows`
- `public.performance_processes`
- `public.process_participants`
- `app_private.current_user_role()`
- `app_private.current_user_has_role(target_role text)`
- `app_private.active_direct_report_count(manager_user_id uuid)`
- `app_private.sync_computed_manager_role(manager_user_id uuid)`
- private Storage bucket `profile-documents`

Profiles now default to Jalali calendar display:

- `preferred_calendar = 'jalali'`
- `preferred_locale = 'fa-IR'`
- `date_display_timezone = 'Asia/Tehran'`

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
