alter table public.experts
  add column if not exists model text,
  add column if not exists reasoning_effort text not null default 'medium'
    check (reasoning_effort in ('none','low', 'medium', 'high', 'xhigh','max'));

update public.experts
set model = 'gpt-5.6-sol',
    reasoning_effort = 'low';
