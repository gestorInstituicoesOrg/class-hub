create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attendance_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.list_students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  list_id uuid not null,
  student_id uuid not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, list_id),
  unique (list_id, student_id),
  foreign key (list_id, user_id)
    references public.attendance_lists (id, user_id) on delete cascade,
  foreign key (student_id, user_id)
    references public.students (id, user_id) on delete cascade
);

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  list_id uuid not null,
  started_at timestamptz not null default now(),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, list_id),
  foreign key (list_id, user_id)
    references public.attendance_lists (id, user_id) on delete cascade,
  check (
    (status = 'in_progress' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
  )
);

create table public.attendance_entries (
  session_id uuid not null,
  list_id uuid not null,
  membership_id uuid not null,
  status text check (status in ('present', 'absent')),
  marked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, membership_id),
  foreign key (session_id, list_id)
    references public.attendance_sessions (id, list_id) on delete cascade,
  foreign key (membership_id, list_id)
    references public.list_students (id, list_id) on delete cascade
);

create index attendance_lists_user_active_idx
  on public.attendance_lists (user_id, name) where archived_at is null;
create index students_user_active_idx
  on public.students (user_id, name) where archived_at is null;
create index list_students_list_active_idx
  on public.list_students (list_id, student_id) where archived_at is null;
create index attendance_sessions_list_started_idx
  on public.attendance_sessions (list_id, started_at desc);
create index attendance_entries_membership_idx
  on public.attendance_entries (membership_id, session_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_full_name text;
begin
  new_full_name := nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '');
  if new_full_name is null then
    raise exception 'User full_name is required';
  end if;

  insert into public.profiles (id, full_name)
  values (new.id, new_full_name);

  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_attendance_lists_updated_at
  before update on public.attendance_lists
  for each row execute function public.set_updated_at();
create trigger set_students_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();
create trigger set_list_students_updated_at
  before update on public.list_students
  for each row execute function public.set_updated_at();
create trigger set_attendance_sessions_updated_at
  before update on public.attendance_sessions
  for each row execute function public.set_updated_at();
create trigger set_attendance_entries_updated_at
  before update on public.attendance_entries
  for each row execute function public.set_updated_at();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.validate_attendance_session()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' then
    if not exists (
      select 1
      from public.attendance_entries e
      where e.session_id = new.id
    ) then
      raise exception 'A session cannot be completed without students';
    end if;

    if exists (
      select 1
      from public.attendance_entries e
      where e.session_id = new.id and e.status is null
    ) then
      raise exception 'Every student must be marked before completing a session';
    end if;

    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;

  return new;
end;
$$;

create trigger validate_attendance_session
  before insert or update of status on public.attendance_sessions
  for each row execute function public.validate_attendance_session();

create function public.track_attendance_entry_mark()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status is not null then
      new.marked_at := now();
    end if;
  elsif new.status is distinct from old.status then
    new.marked_at := case when new.status is null then null else now() end;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create function public.protect_completed_attendance_entry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.attendance_sessions s
    where s.id = new.session_id and s.status = 'completed'
  ) and (tg_op = 'INSERT' or new.status is null) then
    raise exception 'Completed sessions cannot gain unmarked attendance entries';
  end if;

  return new;
end;
$$;

create trigger track_attendance_entry_mark
  before insert or update of status on public.attendance_entries
  for each row execute function public.track_attendance_entry_mark();
create trigger protect_completed_attendance_entry
  before insert or update of status on public.attendance_entries
  for each row execute function public.protect_completed_attendance_entry();

create function public.create_attendance_session(p_list_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_session_id uuid;
  created_entry_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.attendance_lists l
    where l.id = p_list_id
      and l.user_id = auth.uid()
      and l.archived_at is null
  ) then
    raise exception 'Active list not found or access denied' using errcode = '42501';
  end if;

  insert into public.attendance_sessions (user_id, list_id)
  values (auth.uid(), p_list_id)
  returning id into new_session_id;

  insert into public.attendance_entries (session_id, list_id, membership_id)
  select new_session_id, p_list_id, m.id
  from public.list_students m
  where m.user_id = auth.uid()
    and m.list_id = p_list_id
    and m.archived_at is null;

  get diagnostics created_entry_count = row_count;
  if created_entry_count = 0 then
    raise exception 'Add at least one active student before starting a session';
  end if;

  return new_session_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.attendance_lists enable row level security;
alter table public.students enable row level security;
alter table public.list_students enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_entries enable row level security;

create policy "Users can read their profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "Users can create their profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "Users can update their profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can read their lists"
  on public.attendance_lists for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their lists"
  on public.attendance_lists for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their lists"
  on public.attendance_lists for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read their students"
  on public.students for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their students"
  on public.students for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their students"
  on public.students for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read their list memberships"
  on public.list_students for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can add owned students to owned lists"
  on public.list_students for insert to authenticated
  with check (
    (select auth.uid()) = list_students.user_id
    and exists (
      select 1 from public.attendance_lists l
      where l.id = list_students.list_id
        and l.user_id = list_students.user_id
        and l.archived_at is null
    )
    and exists (
      select 1 from public.students s
      where s.id = list_students.student_id
        and s.user_id = list_students.user_id
        and s.archived_at is null
    )
  );
create policy "Users can archive their list memberships"
  on public.list_students for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read their sessions"
  on public.attendance_sessions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their sessions"
  on public.attendance_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their sessions"
  on public.attendance_sessions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can read entries from their sessions"
  on public.attendance_entries for select to authenticated
  using (
    exists (
      select 1 from public.attendance_sessions s
      where s.id = attendance_entries.session_id
        and s.list_id = attendance_entries.list_id
        and s.user_id = (select auth.uid())
    )
  );
create policy "Users can add entries to their sessions"
  on public.attendance_entries for insert to authenticated
  with check (
    exists (
      select 1 from public.attendance_sessions s
      where s.id = attendance_entries.session_id
        and s.list_id = attendance_entries.list_id
        and s.user_id = (select auth.uid())
    )
  );
create policy "Users can update entries from their sessions"
  on public.attendance_entries for update to authenticated
  using (
    exists (
      select 1 from public.attendance_sessions s
      where s.id = attendance_entries.session_id
        and s.list_id = attendance_entries.list_id
        and s.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.attendance_sessions s
      where s.id = attendance_entries.session_id
        and s.list_id = attendance_entries.list_id
        and s.user_id = (select auth.uid())
    )
  );

revoke all on public.profiles, public.attendance_lists, public.students,
  public.list_students, public.attendance_sessions, public.attendance_entries
  from anon, authenticated;

grant select, insert on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select, insert on public.attendance_lists to authenticated;
grant update (name, archived_at) on public.attendance_lists to authenticated;
grant select, insert on public.students to authenticated;
grant update (name, archived_at) on public.students to authenticated;
grant select, insert on public.list_students to authenticated;
grant update (archived_at) on public.list_students to authenticated;
grant select on public.attendance_sessions to authenticated;
grant update (started_at, status, completed_at) on public.attendance_sessions to authenticated;
grant select on public.attendance_entries to authenticated;
grant update (status) on public.attendance_entries to authenticated;

revoke all on function public.create_attendance_session(uuid) from public, anon, authenticated;
grant execute on function public.create_attendance_session(uuid) to authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.validate_attendance_session() from public, anon, authenticated;
revoke all on function public.track_attendance_entry_mark() from public, anon, authenticated;
revoke all on function public.protect_completed_attendance_entry() from public, anon, authenticated;
