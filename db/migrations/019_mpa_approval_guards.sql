alter table public.mpas
add column if not exists approval_visibility jsonb not null default
  '{"employeeCanViewManagerContent":false,"employeeCanViewHrbpNotes":false}'::jsonb,
add column if not exists last_return_reason text;

comment on column public.mpas.approval_visibility is
  'Visibility flags changed through workflow actions. Every visibility change must write an audit event.';

comment on column public.mpas.last_return_reason is
  'Latest return reason captured when an MPA is sent back for revision.';

comment on index public.idx_mpas_one_active_per_employee_cycle is
  'Prevents a second non-archived MPA for the same employee and cycle. Archive the old MPA before creating a replacement.';
