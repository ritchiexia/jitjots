-- jit jots portal schema. run in the supabase sql editor.
-- safe to re-run.

-- ROLES

do $$ begin
  create type public.user_role as enum (
    'volunteer', 'workshop_lead', 'outreach_lead',
    'comms_lead', 'president', 'admin'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text not null default '',
  email      text not null,
  role       public.user_role not null default 'volunteer',

  -- the exec this person reports to
  lead_id    uuid references public.profiles(id) on delete set null,

  -- volunteers only. true if they can lead a workshop.
  graduated  boolean not null default false,

  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- title shown in email signatures. empty uses the role name.
alter table public.profiles add column if not exists title text not null default '';

-- role checks for the policies below.
-- security definer stops the profiles policies from calling themselves forever.
create or replace function public.is_exec()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid())
      in ('workshop_lead', 'outreach_lead', 'comms_lead', 'president', 'admin'),
    false
  )
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) in ('president', 'admin'),
    false
  )
$$;

-- every new user gets a profile as a volunteer
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "read own profile"           on public.profiles;
drop policy if exists "execs read all"             on public.profiles;
drop policy if exists "team reads profiles"        on public.profiles;
drop policy if exists "update own name"            on public.profiles;
drop policy if exists "owners manage roles"        on public.profiles;
drop policy if exists "leads update their people"  on public.profiles;

create policy "read own profile" on public.profiles
  for select using (id = auth.uid());

-- anyone signed in can see the team list
create policy "team reads profiles" on public.profiles
  for select to authenticated using (true);

-- edit your own row. the trigger below limits which columns.
create policy "update own name" on public.profiles
  for update using (id = auth.uid());

create policy "owners manage roles" on public.profiles
  for all using (public.is_owner()) with check (public.is_owner());

-- leads can edit the volunteers assigned to them
create policy "leads update their people" on public.profiles
  for update to authenticated
  using (public.is_exec() and lead_id = auth.uid())
  with check (public.is_exec() and lead_id = auth.uid());

-- controls which columns each person can change
create or replace function public.protect_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- server routes using the service key are allowed
  if coalesce(
       nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
       ''
     ) = 'service_role' then
    return new;
  end if;

  -- direct database connections are allowed (sql editor, supabase auth deleting a user)
  if nullif(current_setting('request.jwt.claims', true), '') is null then
    return new;
  end if;

  -- presidents and admins can change anything
  if public.is_owner() then
    return new;
  end if;

  if new.role      is distinct from old.role
  or new.lead_id   is distinct from old.lead_id
  or new.active    is distinct from old.active
  or new.title     is distinct from old.title
  or new.email     is distinct from old.email
  or new.created_at is distinct from old.created_at
  then
    raise exception 'Only a president or admin can change role, lead, active, title or email';
  end if;

  -- only a volunteer's lead can graduate them
  if new.graduated is distinct from old.graduated
  and old.lead_id is distinct from auth.uid()
  then
    raise exception 'Only this volunteer''s lead, or a president or admin, can change graduation';
  end if;

  -- only you can change your own name
  if new.full_name is distinct from old.full_name and old.id <> auth.uid() then
    raise exception 'You can only change your own name';
  end if;

  return new;
end $$;

drop trigger if exists profiles_protect_privileged on public.profiles;
create trigger profiles_protect_privileged
  before update on public.profiles
  for each row execute function public.protect_privileged_columns();

-- AVAILABILITY

-- one row per block of free time
create table if not exists public.availability (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  date       date not null,
  start_time time not null,
  end_time   time not null,
  created_at timestamptz not null default now(),
  constraint availability_ordered check (end_time > start_time)
);

create index if not exists availability_date_idx    on public.availability (date);
create index if not exists availability_user_date_idx on public.availability (user_id, date);

alter table public.availability enable row level security;

drop policy if exists "manage own availability" on public.availability;
drop policy if exists "execs read availability" on public.availability;
drop policy if exists "team reads availability" on public.availability;

create policy "manage own availability" on public.availability
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- anyone signed in can read availability
create policy "team reads availability" on public.availability
  for select to authenticated using (true);

-- marks a whole month as answered, so "away all month" is different from "not filled in"
create table if not exists public.availability_months (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  month       date not null,  -- always the 1st of the month
  unavailable boolean not null default true,
  updated_at  timestamptz not null default now(),
  primary key (user_id, month),
  constraint availability_months_first_of_month check (extract(day from month) = 1)
);

alter table public.availability_months enable row level security;

drop policy if exists "manage own months" on public.availability_months;
drop policy if exists "execs read months" on public.availability_months;

create policy "manage own months" on public.availability_months
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "execs read months" on public.availability_months
  for select using (public.is_exec());

-- BOOKINGS

-- extra columns on bookings
alter table public.bookings add column if not exists start_time time;
alter table public.bookings add column if not exists end_time   time;
alter table public.bookings add column if not exists notes      text;
alter table public.bookings add column if not exists logs       jsonb not null default '[]'::jsonb;

-- when the confirmation email was sent. stops it sending twice.
alter table public.bookings add column if not exists ack_sent_at timestamptz;

-- 'website' from the public form, 'manual' when an exec enters it
alter table public.bookings add column if not exists source text not null default 'website';

do $$ begin
  alter table public.bookings add constraint bookings_source
    check (source in ('website', 'manual'));
exception when duplicate_object then null;
end $$;

-- the three statuses the portal knows about. matches src/app/admin/bookings/page.tsx.
do $$ begin
  alter table public.bookings add constraint bookings_status
    check (status in ('Pending', 'Confirmed', 'Declined'));
exception when duplicate_object then null;
end $$;

-- roles that can see bookings. matches 'view:bookings' in src/lib/roles.ts.
create or replace function public.can_manage_bookings()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid())
      in ('workshop_lead', 'outreach_lead', 'president', 'admin'),
    false
  )
$$;

drop policy if exists "Admins manage bookings" on public.bookings;
drop policy if exists "execs manage bookings" on public.bookings;

create policy "execs manage bookings" on public.bookings
  for all to authenticated
  using (public.can_manage_bookings())
  with check (public.can_manage_bookings());

-- public booking form insert policies are under STAFF BASED BOOKING

-- taken dates for the public date picker. returns dates only, no details.
-- only created if missing, since the live function already exists.
do $$ begin
  if not exists (
    select 1 from pg_proc
    where proname = 'get_booked_dates' and pronamespace = 'public'::regnamespace
  ) then
    execute $f$
      create function public.get_booked_dates()
      returns table (requested_date date)
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select distinct b.requested_date
        from public.bookings b
        where b.status in ('Pending', 'Confirmed')
          and b.requested_date >= current_date
      $body$
    $f$;
    grant execute on function public.get_booked_dates() to anon, authenticated;
  end if;
end $$;

-- CONTACT MESSAGES

-- messages from the contact form
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  subject      text not null default '',
  message      text not null,
  status       text not null default 'Pending',
  notes        text,
  handled_by   text,        -- email of the admin who handled it
  handled_at   timestamptz,
  created_at   timestamptz not null default now(),
  constraint messages_status check (status in ('Pending', 'Addressed'))
);

create index if not exists messages_created_idx on public.messages (created_at desc);

alter table public.messages enable row level security;

drop policy if exists "public can submit messages" on public.messages;
drop policy if exists "execs manage messages"     on public.messages;

-- anyone can send a message, but only as Pending
create policy "public can submit messages" on public.messages
  for insert to anon, authenticated with check (status = 'Pending');

create policy "execs manage messages" on public.messages
  for all to authenticated
  using (public.can_manage_bookings())
  with check (public.can_manage_bookings());

-- emails sent and received on a message thread
create table if not exists public.message_replies (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  body       text not null,
  sent_by    text not null,   -- admin email if sent, sender email if received
  sent_at    timestamptz not null default now()
);

-- 'outbound' if we sent it, 'inbound' if it came from the inbox sync
alter table public.message_replies
  add column if not exists direction text not null default 'outbound';

-- the email's message id. used to skip duplicates and match replies.
alter table public.message_replies
  add column if not exists email_message_id text;

do $$ begin
  alter table public.message_replies add constraint message_replies_direction
    check (direction in ('outbound', 'inbound'));
exception when duplicate_object then null;
end $$;

create index if not exists message_replies_message_idx
  on public.message_replies (message_id, sent_at);

create unique index if not exists message_replies_email_id_idx
  on public.message_replies (email_message_id)
  where email_message_id is not null;

alter table public.message_replies enable row level security;

drop policy if exists "execs manage message replies" on public.message_replies;

create policy "execs manage message replies" on public.message_replies
  for all to authenticated
  using (public.can_manage_bookings())
  with check (public.can_manage_bookings());

-- 'form' from the contact form, 'email' from the inbox, 'booking' from a booking email
alter table public.messages add column if not exists source text not null default 'form';

-- message id of the first email in the thread. empty for form messages.
alter table public.messages add column if not exists email_message_id text;

-- the subject line used in the emails, so replies stay in the same gmail thread
alter table public.messages add column if not exists email_subject text;

-- the booking this thread belongs to, if any
alter table public.messages add column if not exists booking_id uuid
  references public.bookings(id) on delete set null;

create unique index if not exists messages_one_thread_per_booking
  on public.messages (booking_id)
  where booking_id is not null;

alter table public.messages drop constraint if exists messages_source;
alter table public.messages add constraint messages_source
  check (source in ('form', 'email', 'booking'));

-- UNFILED INBOUND EMAIL

-- inbox emails that don't match a thread. an exec accepts or ignores each one.
create table if not exists public.inbound_emails (
  id               uuid primary key default gen_random_uuid(),
  email_message_id text not null,
  from_email       text not null,
  from_name        text not null default '',
  subject          text not null default '',
  body             text not null default '',
  received_at      timestamptz not null,
  status           text not null default 'pending',
  -- the thread it became, once accepted
  message_id       uuid references public.messages(id) on delete set null,
  handled_by       text,
  handled_at       timestamptz,
  created_at       timestamptz not null default now(),
  constraint inbound_emails_status check (status in ('pending', 'accepted', 'ignored'))
);

create unique index if not exists inbound_emails_message_id_idx
  on public.inbound_emails (email_message_id);

create index if not exists inbound_emails_status_idx
  on public.inbound_emails (status, received_at desc);

alter table public.inbound_emails enable row level security;

drop policy if exists "execs manage inbound email" on public.inbound_emails;

create policy "execs manage inbound email" on public.inbound_emails
  for all to authenticated
  using (public.can_manage_bookings())
  with check (public.can_manage_bookings());

-- where the inbox sync left off, one row per mailbox
create table if not exists public.mail_sync_state (
  mailbox     text primary key,
  uidvalidity bigint not null,
  last_uid    bigint not null,
  updated_at  timestamptz not null default now()
);

alter table public.mail_sync_state enable row level security;

drop policy if exists "execs manage mail sync" on public.mail_sync_state;
create policy "execs manage mail sync" on public.mail_sync_state
  for all to authenticated
  using (public.can_manage_bookings())
  with check (public.can_manage_bookings());

-- every email the sync has seen, so deleted ones don't come back
create table if not exists public.mail_seen (
  email_message_id text primary key,
  seen_at          timestamptz not null default now()
);

alter table public.mail_seen enable row level security;

drop policy if exists "execs manage mail seen" on public.mail_seen;
create policy "execs manage mail seen" on public.mail_seen
  for all to authenticated
  using (public.can_manage_bookings())
  with check (public.can_manage_bookings());

insert into public.mail_seen (email_message_id)
select distinct email_message_id from public.inbound_emails
where email_message_id is not null
on conflict (email_message_id) do nothing;

insert into public.mail_seen (email_message_id)
select distinct email_message_id from public.message_replies
where email_message_id is not null
on conflict (email_message_id) do nothing;

insert into public.mail_seen (email_message_id)
select distinct email_message_id from public.messages
where email_message_id is not null
on conflict (email_message_id) do nothing;

-- NEWSLETTER

-- roles that can manage the newsletter. matches 'view:newsletter' in src/lib/roles.ts.
create or replace function public.can_manage_newsletter()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid())
      in ('comms_lead', 'president', 'admin'),
    false
  )
$$;

-- mailing list. consented_at and source are kept for casl.
create table if not exists public.newsletter_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  name            text not null default '',
  consented_at    timestamptz not null default now(),
  -- 'website' from the footer form, 'manual' when an exec adds them
  source          text not null default 'website',
  status          text not null default 'subscribed',
  unsubscribed_at timestamptz,
  created_at      timestamptz not null default now(),
  constraint newsletter_status check (status in ('subscribed', 'unsubscribed'))
);

-- saves emails in lowercase so there are no duplicates
create or replace function public.normalise_subscriber_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));
  return new;
end $$;

drop trigger if exists newsletter_normalise_email on public.newsletter_subscribers;
create trigger newsletter_normalise_email
  before insert or update on public.newsletter_subscribers
  for each row execute function public.normalise_subscriber_email();

-- removes an old index from an earlier version
drop index if exists public.newsletter_email_idx;

create unique index if not exists newsletter_email_key
  on public.newsletter_subscribers (email);

-- used in each person's unsubscribe link
alter table public.newsletter_subscribers
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists newsletter_unsub_token_idx
  on public.newsletter_subscribers (unsubscribe_token);

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "public can subscribe"      on public.newsletter_subscribers;
drop policy if exists "comms manage subscribers"  on public.newsletter_subscribers;

-- anyone can subscribe from the website
create policy "public can subscribe" on public.newsletter_subscribers
  for insert to anon, authenticated
  with check (status = 'subscribed' and source = 'website');

create policy "comms manage subscribers" on public.newsletter_subscribers
  for all to authenticated
  using (public.can_manage_newsletter())
  with check (public.can_manage_newsletter());

-- unsubscribing goes through /api/newsletter/unsubscribe, not a public policy

-- newsletters that were sent
create table if not exists public.newsletter_campaigns (
  id              uuid primary key default gen_random_uuid(),
  subject         text not null,
  body            text not null,
  sent_by         text not null,
  recipient_count integer not null default 0,
  failed_count    integer not null default 0,
  sent_at         timestamptz not null default now()
);

-- attachment names, sizes and types. the files are not stored.
alter table public.newsletter_campaigns
  add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table public.newsletter_campaigns enable row level security;

drop policy if exists "comms manage campaigns" on public.newsletter_campaigns;

create policy "comms manage campaigns" on public.newsletter_campaigns
  for all to authenticated
  using (public.can_manage_newsletter())
  with check (public.can_manage_newsletter());

-- ONE-TIME BACKFILL

-- gives existing users a profile. listed emails become admins.
-- to promote someone later:
--   update public.profiles set role = 'admin' where email = '...';
insert into public.profiles (id, email, role)
select
  id,
  email,
  case
    when email in ('dereksfu@gmail.com') then 'admin'::public.user_role
    else 'volunteer'::public.user_role
  end
from auth.users
on conflict (id) do nothing;

-- AWAY DATES AND BOOKING EXTRAS

-- days someone is away, with a reason
create table if not exists public.availability_away (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date   date not null,
  reason     text not null,
  created_at timestamptz not null default now(),
  constraint availability_away_ordered check (end_date >= start_date)
);

create index if not exists availability_away_span_idx
  on public.availability_away (start_date, end_date);
create index if not exists availability_away_user_idx
  on public.availability_away (user_id, start_date);

alter table public.availability_away enable row level security;

drop policy if exists "manage own away" on public.availability_away;
drop policy if exists "leads record away" on public.availability_away;
drop policy if exists "team reads away" on public.availability_away;

-- leads and owners record away dates. execs can also record their own.
create or replace function public.can_record_away(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_owner()
    or exists (
      select 1 from public.profiles p
      where p.id = target and p.lead_id = auth.uid()
    )
    or (target = auth.uid() and public.is_exec())
$$;

create policy "leads record away" on public.availability_away
  for all using (public.can_record_away(user_id))
  with check (public.can_record_away(user_id));

create policy "team reads away" on public.availability_away
  for select to authenticated using (true);

-- leads can clear a volunteer's hours when marking them away
drop policy if exists "leads clear team hours" on public.availability;
create policy "leads clear team hours" on public.availability
  for delete using (public.can_record_away(user_id));

-- month unavailable is set by leads, not the volunteer
drop policy if exists "manage own months" on public.availability_months;
drop policy if exists "read own months" on public.availability_months;
drop policy if exists "leads write months" on public.availability_months;

create policy "read own months" on public.availability_months
  for select using (user_id = auth.uid() or public.is_exec());

create policy "leads write months" on public.availability_months
  for all using (public.can_record_away(user_id))
  with check (public.can_record_away(user_id));

-- ages and notes typed on the public form. admin notes stay in `notes`.
alter table public.bookings add column if not exists ages text;
alter table public.bookings add column if not exists requester_notes text;

-- STAFF BASED BOOKING

-- free hours for the public booking form. no names or ids, just a number per person.
create or replace function public.get_staff_blocks(from_date date, to_date date)
returns table (day date, person int, can_lead boolean, start_time time, end_time time)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.date,
    dense_rank() over (order by a.user_id)::int,
    (p.role <> 'volunteer' or p.graduated),
    a.start_time,
    a.end_time
  from public.availability a
  join public.profiles p on p.id = a.user_id and p.active
  where a.date between greatest(from_date, current_date)
                   and least(to_date, (current_date + interval '3 months')::date)
    and not exists (
      select 1 from public.availability_away w
      where w.user_id = a.user_id and a.date between w.start_date and w.end_date
    )
$$;

grant execute on function public.get_staff_blocks(date, date) to anon, authenticated;

-- true if a booking can be made: the date is free and enough staff cover the whole time.
-- every 30 kids needs 2 staff, and 1 of them must be able to lead. max 100 kids.
-- times match src/lib/booking-times.ts: 8 AM to 9 PM, last start 7 PM, up to 2 hours,
-- and no further ahead than 2 months, like the form's calendar.
create or replace function public.booking_is_staffed(d date, s time, e time, kids int)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(kids between 1 and 100, false)
    and s is not null
    and e is not null
    and e > s
    and s >= time '08:00'
    and s <= time '19:00'
    and e <= time '21:00'
    and e - s <= interval '2 hours'
    and d >= current_date
    and d <= (current_date + interval '2 months')::date
    and not exists (
      select 1 from public.bookings b
      where b.requested_date = d and b.status in ('Pending', 'Confirmed')
    )
    and (
      select count(*) >= 2 * ceil(kids / 30.0)
         and count(*) filter (where p.role <> 'volunteer' or p.graduated) >= ceil(kids / 30.0)
      from public.profiles p
      where p.active
        and not exists (
          select 1 from public.availability_away w
          where w.user_id = p.id and d between w.start_date and w.end_date
        )
        -- every 30 minute slot of the booking is inside one of their blocks
        and not exists (
          select 1
          from generate_series(d + s, d + e - interval '30 minutes', interval '30 minutes') g(slot)
          where not exists (
            select 1 from public.availability a
            where a.user_id = p.id
              and a.date = d
              and d + a.start_time <= g.slot
              and d + a.end_time >= g.slot + interval '30 minutes'
          )
        )
    )
$$;

grant execute on function public.booking_is_staffed(date, time, time, int) to anon, authenticated;

-- the public form can only book a free, staffed date
drop policy if exists "Public can submit bookings" on public.bookings;
create policy "Public can submit bookings" on public.bookings
  for insert to anon
  with check (
    status = 'Pending'
    and source = 'website'
    and public.booking_is_staffed(requested_date, nullif(start_time::text, '')::time, nullif(end_time::text, '')::time, kids_count)
  );

-- same rule for signed in users using the public form
drop policy if exists "signed-in users submit bookings" on public.bookings;
create policy "signed-in users submit bookings" on public.bookings
  for insert to authenticated
  with check (
    status = 'Pending'
    and source = 'website'
    and public.booking_is_staffed(requested_date, nullif(start_time::text, '')::time, nullif(end_time::text, '')::time, kids_count)
  );
