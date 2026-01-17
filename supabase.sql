create extension if not exists "pgcrypto";

create table if not exists organizers (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  meta text,
  email text,
  phone text,
  website text,
  instagram text,
  facebook text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  slug text,
  title text not null,
  description text,
  city text,
  address text,
  venue text,
  start_at timestamptz,
  end_at timestamptz,
  language text,
  format text,
  price_type text,
  price_min integer,
  price_max integer,
  registration_url text,
  image_url text,
  status text default 'published',
  organizer_id uuid references organizers(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists event_tags (
  event_id uuid references events(id) on delete cascade,
  tag text not null,
  is_pending boolean default false,
  primary key (event_id, tag)
);

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete set null,
  action text not null,
  actor text,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists organizer_verification_requests (
  id uuid primary key default gen_random_uuid(),
  link text not null,
  link_key text not null unique,
  name text,
  status text not null default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  verified_at timestamptz,
  rejected_at timestamptz
);

create index if not exists events_start_at_idx on events (start_at);
create index if not exists events_status_idx on events (status);
create index if not exists events_city_idx on events (city);
create index if not exists events_language_idx on events (language);
create index if not exists organizer_verification_status_idx on organizer_verification_requests (status);
create index if not exists organizer_verification_link_idx on organizer_verification_requests (link_key);

alter table organizers enable row level security;
alter table events enable row level security;
alter table event_tags enable row level security;
alter table admin_audit_log enable row level security;
alter table organizer_verification_requests enable row level security;

drop policy if exists "public_read_events" on events;
create policy "public_read_events"
on events
for select
to public
using (status = 'published');

drop policy if exists "public_read_event_tags" on event_tags;
create policy "public_read_event_tags"
on event_tags
for select
to public
using (
  exists (
    select 1
    from events e
    where e.id = event_tags.event_id
      and e.status = 'published'
  )
);

drop policy if exists "public_read_organizers" on organizers;
create policy "public_read_organizers"
on organizers
for select
to public
using (
  exists (
    select 1
    from events e
    where e.organizer_id = organizers.id
      and e.status = 'published'
  )
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizers_set_updated_at on organizers;
create trigger organizers_set_updated_at
before update on organizers
for each row
execute function set_updated_at();

drop trigger if exists events_set_updated_at on events;
create trigger events_set_updated_at
before update on events
for each row
execute function set_updated_at();

drop trigger if exists organizer_verification_set_updated_at on organizer_verification_requests;
create trigger organizer_verification_set_updated_at
before update on organizer_verification_requests
for each row
execute function set_updated_at();
