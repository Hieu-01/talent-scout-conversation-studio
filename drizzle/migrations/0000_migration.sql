create type public.app_role as enum ('owner','member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  invited_by uuid,
  created_at timestamptz not null default now()
);
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  criteria jsonb not null default '[]'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  location text,
  headline text,
  years_experience numeric,
  skills text[] not null default '{}',
  education text,
  summary text,
  experience jsonb not null default '[]'::jsonb,
  score integer,
  criteria_results jsonb not null default '[]'::jsonb,
  score_reason text,
  status text not null default 'processing',
  notes text,
  file_path text,
  file_name text,
  raw_text text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.candidates(job_id);
create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  title text not null default 'New conversation',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  message jsonb not null,
  created_at timestamptz not null default now()
);
create index on public.chat_messages(thread_id, created_at);

grant select, insert, update, delete on public.profiles, public.team_invites, public.jobs, public.candidates, public.chat_threads, public.chat_messages to authenticated;
grant select on public.user_roles to authenticated;
grant all on public.profiles, public.user_roles, public.team_invites, public.jobs, public.candidates, public.chat_threads, public.chat_messages to service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.team_invites enable row level security;
alter table public.jobs enable row level security;
alter table public.candidates enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_team_member(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

create policy "own roles or owner sees all" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'owner'));

create policy "team reads profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_team_member(auth.uid()));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "owner manages invites" on public.team_invites for all to authenticated
  using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

create policy "team all jobs" on public.jobs for all to authenticated
  using (public.is_team_member(auth.uid())) with check (public.is_team_member(auth.uid()));
create policy "team all candidates" on public.candidates for all to authenticated
  using (public.is_team_member(auth.uid())) with check (public.is_team_member(auth.uid()));
create policy "team all threads" on public.chat_threads for all to authenticated
  using (public.is_team_member(auth.uid())) with check (public.is_team_member(auth.uid()));
create policy "team all messages" on public.chat_messages for all to authenticated
  using (public.is_team_member(auth.uid())) with check (public.is_team_member(auth.uid()));

-- signup: first user becomes owner; invited emails become members
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  if not exists (select 1 from public.user_roles where role = 'owner') then
    insert into public.user_roles (user_id, role) values (new.id, 'owner');
  elsif exists (select 1 from public.team_invites where lower(email) = lower(new.email)) then
    insert into public.user_roles (user_id, role) values (new.id, 'member') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- inviting an existing user grants access immediately
create or replace function public.handle_invite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles (user_id, role)
  select p.id, 'member' from public.profiles p where lower(p.email) = lower(new.email)
  on conflict do nothing;
  return new;
end $$;
create trigger on_invite_created after insert on public.team_invites
  for each row execute function public.handle_invite();

-- removing an invite revokes member access
create or replace function public.handle_invite_removed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.user_roles ur using public.profiles p
  where ur.user_id = p.id and lower(p.email) = lower(old.email) and ur.role = 'member';
  return old;
end $$;
create trigger on_invite_deleted after delete on public.team_invites
  for each row execute function public.handle_invite_removed();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger t_jobs before update on public.jobs for each row execute function public.touch_updated_at();
create trigger t_cand before update on public.candidates for each row execute function public.touch_updated_at();
create trigger t_threads before update on public.chat_threads for each row execute function public.touch_updated_at();

create policy "team reads cvs" on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and public.is_team_member(auth.uid()));
create policy "team uploads cvs" on storage.objects for insert to authenticated
  with check (bucket_id = 'cvs' and public.is_team_member(auth.uid()));
create policy "team deletes cvs" on storage.objects for delete to authenticated
  using (bucket_id = 'cvs' and public.is_team_member(auth.uid()));