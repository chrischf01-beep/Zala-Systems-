-- ============================================================================
-- Zala Predictor — Supabase schema
-- Run this ONCE in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- It is idempotent: safe to re-run.
--
-- IMPORTANT: In Supabase -> Authentication -> Providers -> Email, turn OFF
-- "Confirm email" so that signUp returns a session immediately (this app grants
-- access after admin payment approval, not after email confirmation).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions / helpers
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- Sequence for human-readable member IDs (ZALA-0002, ZALA-0003, ...).
-- 0001 is reserved for the bootstrap admin.
create sequence if not exists user_code_seq start 2;

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  username         text unique not null,
  full_name        text not null default '',
  email            text not null,
  phone            text not null default '',
  language         text not null default 'en'  check (language in ('en', 'sw')),
  profile          text not null default 'balanced' check (profile in ('aggressive', 'balanced', 'conservative')),
  is_admin         boolean not null default false,
  status           text not null default 'pending' check (status in ('pending', 'active', 'inactive', 'suspended', 'expired')),
  plan             text check (plan in ('daily', 'weekly', 'monthly')),
  member_start     timestamptz,
  member_expiry    timestamptz,
  betting_company  text not null default '',
  user_code        text,
  created_at       timestamptz not null default now()
);

create table if not exists payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles (id) on delete cascade,
  plan          text not null check (plan in ('daily', 'weekly', 'monthly')),
  amount        integer not null check (amount >= 0),
  method        text not null check (method in ('mpesa', 'airtel', 'halopesa')),
  phone         text not null default '',
  sender_name   text not null default '',
  reference     text not null default '',
  screenshot    text not null default '',   -- storage object path
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text not null default '',
  created_at    timestamptz not null default now(),
  decided_at    timestamptz
);
create index if not exists payments_user_idx on payments (user_id);
create index if not exists payments_status_idx on payments (status);

create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  audience   text not null,               -- 'all' or a profile id (as text)
  type       text not null check (type in ('system', 'payment', 'membership', 'expiry')),
  title      text not null default '',
  body       text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id         uuid primary key default gen_random_uuid(),
  action     text not null,
  details    text not null default '',
  target     text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id                   integer primary key default 1 check (id = 1),
  registration_enabled boolean not null default true,
  payments_enabled     boolean not null default true,
  membership_enabled   boolean not null default true,
  maintenance_mode     boolean not null default false,
  site_name            text not null default 'Zala Predictor',
  welcome_message      text not null default 'Advanced mathematical prediction engine',
  support_email        text not null default '',
  support_phone        text not null default '',
  whatsapp             text not null default ''
);

create table if not exists predictions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles (id) on delete cascade,
  session_id   text not null default '',
  prediction   double precision not null default 0,
  expected     double precision not null default 0,
  min_value    double precision not null default 0,
  max_value    double precision not null default 0,
  confidence   double precision not null default 0,
  volatility   double precision not null default 0,
  momentum     double precision not null default 0,
  fib_weight   double precision not null default 0,
  bayes_mean   double precision not null default 0,
  model        text not null default '',
  runs         integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists predictions_user_idx on predictions (user_id);

-- ---------------------------------------------------------------------------
-- 2. Seed the single settings row (global site config)
-- ---------------------------------------------------------------------------
insert into settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. is_admin() helper (SECURITY DEFINER so policies can read profiles safely)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and is_admin = true);
$$;

-- ---------------------------------------------------------------------------
-- 4. Auto-create a profile row when a new auth user signs up.
--    The bootstrap admin email is promoted automatically and granted full access.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_bootstrap_admin boolean;
begin
  is_bootstrap_admin := lower(new.email) = 'respect.chf@gmail.com';

  insert into public.profiles (
    id, username, full_name, email, phone, language, betting_company,
    is_admin, status, plan, member_start, member_expiry, user_code
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'language', 'en'),
    coalesce(new.raw_user_meta_data ->> 'betting_company', ''),
    is_bootstrap_admin,
    case when is_bootstrap_admin then 'active' else 'pending' end,
    case when is_bootstrap_admin then 'monthly' else null end,
    case when is_bootstrap_admin then now() else null end,
    case when is_bootstrap_admin then now() + interval '3650 days' else null end,
    case when is_bootstrap_admin then 'ZALA-0001' else null end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 5. RPC: username availability check (callable by anon before signup)
-- ---------------------------------------------------------------------------
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from profiles where lower(username) = lower(btrim(p_username))
  );
$$;

-- ---------------------------------------------------------------------------
-- 6. RPC: approve / reject a payment atomically (admin only)
-- ---------------------------------------------------------------------------
create or replace function public.approve_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pay        payments%rowtype;
  usr        profiles%rowtype;
  plan_days  integer;
  start_from timestamptz;
  new_code   text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select * into pay from payments where id = p_payment_id;
  if not found then return; end if;
  select * into usr from profiles where id = pay.user_id;
  if not found then return; end if;

  plan_days := case pay.plan when 'daily' then 1 when 'weekly' then 7 when 'monthly' then 30 else 1 end;

  if usr.status = 'active' and usr.member_expiry is not null and usr.member_expiry > now() then
    start_from := usr.member_expiry;   -- stack renewals
  else
    start_from := now();
  end if;

  update payments set status = 'approved', reject_reason = '', decided_at = now()
    where id = p_payment_id;

  if usr.user_code is null then
    new_code := 'ZALA-' || lpad(nextval('user_code_seq')::text, 4, '0');
  else
    new_code := usr.user_code;
  end if;

  update profiles set
    status        = 'active',
    plan          = pay.plan,
    member_start  = coalesce(usr.member_start, now()),
    member_expiry = start_from + make_interval(days => plan_days),
    user_code     = new_code
  where id = pay.user_id;

  insert into activity_logs (action, details, target)
    values ('payment.approved',
            format('Approved %s TSh; membership activated (%s, +%s days)', pay.amount, pay.plan, plan_days),
            usr.email);

  insert into notifications (audience, type, title, body)
    values (pay.user_id::text, 'membership', 'Membership activated',
            format('Your %s plan is now active. User ID: %s.', pay.plan, new_code));
end;
$$;

create or replace function public.reject_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pay  payments%rowtype;
  usr  profiles%rowtype;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select * into pay from payments where id = p_payment_id;
  if not found then return; end if;
  select * into usr from profiles where id = pay.user_id;

  update payments set status = 'rejected', reject_reason = btrim(coalesce(p_reason, '')), decided_at = now()
    where id = p_payment_id;

  insert into activity_logs (action, details, target)
    values ('payment.rejected',
            format('Rejected %s TSh: %s', pay.amount, btrim(coalesce(p_reason, ''))),
            coalesce(usr.email, pay.user_id::text));

  insert into notifications (audience, type, title, body)
    values (pay.user_id::text, 'payment', 'Payment rejected', btrim(coalesce(p_reason, '')));
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles     enable row level security;
alter table payments     enable row level security;
alter table notifications enable row level security;
alter table activity_logs enable row level security;
alter table settings     enable row level security;
alter table predictions  enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_delete on profiles;
create policy profiles_delete on profiles
  for delete to authenticated
  using (public.is_admin());

-- payments ------------------------------------------------------------------
drop policy if exists payments_select on payments;
create policy payments_select on payments
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists payments_insert on payments;
create policy payments_insert on payments
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists payments_update on payments;
create policy payments_update on payments
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists payments_delete on payments;
create policy payments_delete on payments
  for delete to authenticated
  using (public.is_admin());

-- notifications -------------------------------------------------------------
drop policy if exists notifications_select on notifications;
create policy notifications_select on notifications
  for select to authenticated
  using (audience = 'all' or audience = auth.uid()::text or public.is_admin());

drop policy if exists notifications_insert on notifications;
create policy notifications_insert on notifications
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists notifications_delete on notifications;
create policy notifications_delete on notifications
  for delete to authenticated
  using (public.is_admin());

-- activity_logs -------------------------------------------------------------
-- Any signed-in user may write an audit entry (e.g. their own registration);
-- only admins may read or clear the trail.
drop policy if exists logs_insert on activity_logs;
create policy logs_insert on activity_logs
  for insert to authenticated
  with check (true);

drop policy if exists logs_select on activity_logs;
create policy logs_select on activity_logs
  for select to authenticated
  using (public.is_admin());

drop policy if exists logs_delete on activity_logs;
create policy logs_delete on activity_logs
  for delete to authenticated
  using (public.is_admin());

-- settings ------------------------------------------------------------------
-- Public read (the login/register pages need site config before auth).
drop policy if exists settings_select on settings;
create policy settings_select on settings
  for select to anon, authenticated
  using (true);

drop policy if exists settings_update on settings;
create policy settings_update on settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists settings_insert on settings;
create policy settings_insert on settings
  for insert to authenticated
  with check (public.is_admin());

-- predictions ---------------------------------------------------------------
drop policy if exists predictions_select on predictions;
create policy predictions_select on predictions
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists predictions_insert on predictions;
create policy predictions_insert on predictions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists predictions_delete on predictions;
create policy predictions_delete on predictions
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- 8. Storage: private bucket for payment screenshots
--    Objects are stored under "<user-id>/<filename>".
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('screenshots', 'screenshots', false)
  on conflict (id) do nothing;

drop policy if exists screenshots_insert on storage.objects;
create policy screenshots_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists screenshots_select on storage.objects;
create policy screenshots_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'screenshots'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists screenshots_delete on storage.objects;
create policy screenshots_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'screenshots'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ---------------------------------------------------------------------------
-- 8b. RPC: delete a profile (admin deletes any, user deletes own)
--     Cascades payments/predictions via FK; clears addressed notifications.
--     Note: removing the underlying auth.users record requires the service_role
--     key and must be done in the Supabase dashboard or an Edge Function.
-- ---------------------------------------------------------------------------
create or replace function public.delete_profile(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or p_id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  delete from notifications where audience = p_id::text;
  delete from profiles where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Grants for RPCs
-- ---------------------------------------------------------------------------
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.approve_payment(uuid) to authenticated;
grant execute on function public.reject_payment(uuid, text) to authenticated;
grant execute on function public.delete_profile(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
