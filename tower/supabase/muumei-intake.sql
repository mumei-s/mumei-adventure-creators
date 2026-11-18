-- Fresh installation only. An existing schema or public function aborts this transaction.
create schema creator_tower;
revoke all on schema creator_tower from public, anon, authenticated;
grant usage on schema creator_tower to service_role;

create table creator_tower.rooms (
  id uuid primary key default gen_random_uuid(),
  note_id text not null unique check (note_id ~ '^[a-z0-9_]{1,32}$'),
  note_user text not null unique,
  slot integer not null unique check (slot > 0),
  owner_hash text not null unique check (owner_hash ~ '^[0-9a-f]{64}$'),
  profile jsonb not null,
  design jsonb not null,
  avatar_mime text,
  avatar_b64 text check (length(avatar_b64) <= 409600),
  avatar_version integer not null default 0,
  version integer not null default 1,
  joined_at timestamptz not null default now(),
  check ((avatar_mime is null and avatar_b64 is null)
      or avatar_mime in ('image/png', 'image/webp', 'image/gif'))
);

create table creator_tower.challenges (
  hash text primary key check (hash ~ '^[0-9a-f]{64}$'),
  code text not null unique,
  note_id text not null,
  note_user text not null,
  slot integer,
  expires_at timestamptz not null default now() + interval '20 minutes',
  room_id uuid references creator_tower.rooms(id) on delete cascade
);
create index tower_challenge_expiration on creator_tower.challenges(expires_at);

create table creator_tower.stamps (
  room_id uuid not null references creator_tower.rooms(id) on delete cascade,
  visitor_id uuid not null references creator_tower.rooms(id) on delete cascade,
  kind text not null check (kind in ('read', 'hello', 'inspired')),
  primary key (room_id, visitor_id, kind),
  check (room_id <> visitor_id)
);
create index tower_stamps_visitor on creator_tower.stamps(visitor_id);

create table creator_tower.rate_limits (
  bucket text not null,
  period timestamptz not null,
  hits integer not null,
  primary key (bucket, period)
);
create index tower_rate_period on creator_tower.rate_limits(period);

alter table creator_tower.rooms enable row level security;
alter table creator_tower.challenges enable row level security;
alter table creator_tower.stamps enable row level security;
alter table creator_tower.rate_limits enable row level security;
revoke all on all tables in schema creator_tower from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema creator_tower to service_role;

create function creator_tower.room_data(room creator_tower.rooms)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', room.id, 'noteId', room.note_id, 'slot', room.slot, 'profile', room.profile,
    'design', room.design, 'version', room.version, 'joinedAt', room.joined_at,
    'avatarVersion', case when room.avatar_mime is not null then room.avatar_version end,
    'stamps', coalesce(
      (select jsonb_object_agg(stamp.kind, stamp.total) from
        (select kind, count(*) as total from creator_tower.stamps
         where room_id = room.id group by kind) as stamp),
      '{}'::jsonb
    )
  );
$$;

-- Keep the original twelve floors and add a floor automatically when every bay is occupied.
create function creator_tower.room_capacity() returns integer
language sql stable security invoker set search_path = ''
as $$
  select greatest(144, ((coalesce(max(slot), 1) - 1) / 12 + 1) * 12, ((count(*)::integer / 12) + 1) * 12)
  from creator_tower.rooms;
$$;
revoke all on function creator_tower.room_capacity() from public, anon, authenticated;
grant execute on function creator_tower.room_capacity() to service_role;

CREATE FUNCTION public.creator_tower_rpc(command text, input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  room creator_tower.rooms;
  challenge creator_tower.challenges;
  actor uuid;
  target uuid;
  selected_slot integer;
  room_uuid uuid := (input->>'id')::uuid;
  owner_key text := input->>'hash';
  creator_id text := input->>'noteId';
  creator_user text := input->>'noteUser';
  capacity integer;
  per_floor constant integer := 12;
  period_start timestamptz := date_trunc('minute', now());
  attempts integer;
  stamp_kind text := input->>'kind';
  personal_stamps jsonb;
begin
  case command
  when 'list' then
    capacity := creator_tower.room_capacity();
    return jsonb_build_object('floors', capacity / per_floor, 'perFloor', per_floor, 'rooms',
      coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'noteId', note_id, 'slot', slot, 'name', profile->>'name', 'photo', profile->>'photo',
        'title', design->>'title', 'theme', design->>'theme', 'joinedAt', joined_at
      ) order by slot) from creator_tower.rooms), '[]'::jsonb));

  when 'lookup' then
    select id into target from creator_tower.rooms where note_user = creator_user;
    return jsonb_build_object('id', target);

  when 'room' then
    select * into room from creator_tower.rooms where id = room_uuid;
    if not found then return '{"error":"missing"}'::jsonb; end if;
    return creator_tower.room_data(room);

  when 'avatar' then
    select * into room from creator_tower.rooms where id = room_uuid
      and avatar_version = (input->>'version')::integer and avatar_mime is not null
      and design->>'avatarMode' = 'custom';
    if not found then return '{"error":"missing"}'::jsonb; end if;
    return jsonb_build_object('mime', room.avatar_mime, 'base64', room.avatar_b64);

  when 'limit' then
    insert into creator_tower.rate_limits (bucket, period, hits)
      values (input->>'bucket', period_start, 1)
      on conflict (bucket, period) do update set hits = least(10000, creator_tower.rate_limits.hits + 1)
      returning hits into attempts;
    delete from creator_tower.rate_limits where period < period_start - interval '2 minutes';
    return jsonb_build_object('allowed', attempts <= (input->>'limit')::integer);

  when 'begin' then
    capacity := creator_tower.room_capacity();
    delete from creator_tower.challenges where expires_at < now();
    selected_slot := (input->>'slot')::integer;
    if selected_slot is not null and
       (selected_slot < 1 or selected_slot > capacity or
        exists (select 1 from creator_tower.rooms where slot = selected_slot and note_user <> creator_user))
       then return '{"error":"slot_taken"}'::jsonb; end if;
    insert into creator_tower.challenges (hash, code, note_id, note_user, slot)
      values (owner_key, input->>'code', creator_id, creator_user, selected_slot);
    return '{"ok":true}'::jsonb;

  when 'challenge' then
    select * into challenge from creator_tower.challenges where hash = owner_key and expires_at > now();
    if not found then return '{"error":"expired"}'::jsonb; end if;
    if challenge.room_id is not null then
      select * into room from creator_tower.rooms where id = challenge.room_id and owner_hash = owner_key;
      if not found then return '{"error":"expired"}'::jsonb; end if;
      return jsonb_build_object('done', creator_tower.room_data(room));
    end if;
    return jsonb_build_object('code', challenge.code, 'noteId', challenge.note_id, 'noteUser', challenge.note_user);

  when 'finish' then
    -- Serialize slot assignment and key replacement. The challenge is locked after the building lock.
    perform pg_advisory_xact_lock(140371274);
    capacity := creator_tower.room_capacity();
    select * into challenge from creator_tower.challenges where hash = owner_key and expires_at > now() for update;
    if not found or challenge.note_user is distinct from creator_user
      then return '{"error":"expired"}'::jsonb; end if;
    if challenge.room_id is not null then
      select * into room from creator_tower.rooms where id = challenge.room_id and owner_hash = owner_key;
      if not found then return '{"error":"expired"}'::jsonb; end if;
      return creator_tower.room_data(room);
    end if;
    if exists (select 1 from creator_tower.rooms where note_id = creator_id and note_user <> creator_user)
      then return '{"error":"handle_in_use"}'::jsonb; end if;

    select * into room from creator_tower.rooms where note_user = creator_user for update;
    if found then
      update creator_tower.rooms set owner_hash = owner_key, note_id = creator_id,
        profile = input->'profile', version = version + 1 where id = room.id returning * into room;
    else
      selected_slot := coalesce((input->>'slot')::integer, challenge.slot);
      if selected_slot is not null then
        if selected_slot < 1 or selected_slot > capacity or
          exists (select 1 from creator_tower.rooms where slot = selected_slot)
          then return '{"error":"slot_taken"}'::jsonb; end if;
      else
        select candidate into selected_slot from generate_series(1, capacity) as candidate
        where not exists (select 1 from creator_tower.rooms where slot = candidate)
        order by candidate limit 1;
        if selected_slot is null then return '{"error":"full"}'::jsonb; end if;
      end if;
      insert into creator_tower.rooms (note_id, note_user, slot, owner_hash, profile, design)
        values (creator_id, creator_user, selected_slot, owner_key, input->'profile', input->'design')
        returning * into room;
    end if;
    delete from creator_tower.challenges where note_user = creator_user and hash <> owner_key;
    update creator_tower.challenges set room_id = room.id where hash = owner_key;
    return creator_tower.room_data(room);

  when 'owner' then
    select * into room from creator_tower.rooms where id = room_uuid and owner_hash = owner_key;
    if not found then return '{"error":"owner_required"}'::jsonb; end if;
    return creator_tower.room_data(room) || jsonb_build_object('noteUser', room.note_user);

  when 'save' then
    select * into room from creator_tower.rooms where id = room_uuid and owner_hash = owner_key for update;
    if not found then return '{"error":"owner_required"}'::jsonb; end if;
    if room.version is distinct from (input->>'version')::integer
      then return '{"error":"conflict"}'::jsonb; end if;
    if input->'design'->>'avatarMode' = 'custom' and input->>'avatarMime' is null and room.avatar_mime is null
      then return '{"error":"avatar_required"}'::jsonb; end if;
    if input->'design'->'manager' = 'true'::jsonb
       and room.design->'manager' is distinct from 'true'::jsonb then
      -- All first-time appointments serialize across different room rows.
      perform pg_advisory_xact_lock(140371275);
      if (select count(*) from creator_tower.rooms r where r.design->'manager' = 'true'::jsonb) >= 5 then
        return '{"error":"manager_full"}'::jsonb;
      end if;
    end if;
    update creator_tower.rooms set
      design = input->'design', profile = coalesce(input->'profile', profile), version = version + 1,
      avatar_mime = case when input->'design'->>'avatarMode' = 'custom' then coalesce(input->>'avatarMime', avatar_mime) end,
      avatar_b64 = case when input->'design'->>'avatarMode' = 'custom' then coalesce(input->>'avatarB64', avatar_b64) end,
      avatar_version = avatar_version + case when input->>'avatarMime' is not null then 1 else 0 end
    where id = room_uuid returning * into room;
    return creator_tower.room_data(room);

  when 'leave' then
    perform pg_advisory_xact_lock(140371274);
    delete from creator_tower.rooms where id = room_uuid and owner_hash = owner_key returning * into room;
    if not found then return '{"error":"owner_required"}'::jsonb; end if;
    delete from creator_tower.challenges where note_user = room.note_user;
    return '{"ok":true}'::jsonb;

  when 'stamp' then
    select id into actor from creator_tower.rooms where owner_hash = owner_key;
    if not found then return '{"error":"owner_required"}'::jsonb; end if;
    select * into room from creator_tower.rooms where id = room_uuid;
    if not found then return '{"error":"missing"}'::jsonb; end if;
    if actor = room.id then return '{"error":"own_room"}'::jsonb; end if;
    if stamp_kind is not null and stamp_kind not in ('read','hello','inspired') then return '{"error":"invalid"}'::jsonb; end if;
    if stamp_kind is null then
      delete from creator_tower.stamps where room_id=room_uuid and visitor_id=actor;
    elsif coalesce((input->>'enabled')::boolean,true) then
      insert into creator_tower.stamps(room_id,visitor_id,kind) values(room_uuid,actor,stamp_kind) on conflict do nothing;
    else
      delete from creator_tower.stamps where room_id=room_uuid and visitor_id=actor and kind=stamp_kind;
    end if;
    select coalesce(jsonb_agg(kind order by kind),'[]'::jsonb) into personal_stamps from creator_tower.stamps where room_id=room_uuid and visitor_id=actor;
    return creator_tower.room_data(room) || jsonb_build_object('myStamps',personal_stamps,'myStamp',personal_stamps->>0);

  when 'visit' then
    select * into room from creator_tower.rooms where id = room_uuid;
    if not found then return '{"error":"missing"}'::jsonb; end if;
    select id into actor from creator_tower.rooms where owner_hash = owner_key;
    select coalesce(jsonb_agg(kind order by kind),'[]'::jsonb) into personal_stamps from creator_tower.stamps where room_id = room_uuid and visitor_id = actor;
    return creator_tower.room_data(room) || jsonb_build_object(
      'myStamp', personal_stamps->>0, 'myStamps',personal_stamps,'canStamp', actor is not null and actor <> room_uuid,
      'isOwner', actor = room_uuid
    );

  else return '{"error":"invalid"}'::jsonb;
  end case;
end;
$function$;

CREATE FUNCTION public.creator_tower_world_rpc(command text, input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  room jsonb;
begin
  if command = 'list' then
    return jsonb_build_object('floors', creator_tower.room_capacity() / 12, 'perFloor', 12, 'rooms', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'id', id, 'noteId', note_id, 'slot', slot, 'name', profile->>'name', 'photo', profile->>'photo',
        'title', design->>'title', 'theme', design->>'theme', 'light', design->>'light',
        'world', design->'world', 'avatarMode', design->>'avatarMode', 'avatarName', design->>'avatarName',
        'avatarVersion', case when avatar_mime is not null and design->>'avatarMode' = 'custom' then avatar_version end,
        'joinedAt', joined_at
      ) order by slot) from creator_tower.rooms), '[]'::jsonb));
  end if;

  if command <> 'finish' then
    return '{"error":"invalid"}'::jsonb;
  end if;

  room := public.creator_tower_rpc('finish', input);
  -- A new room and its initial character publish in the same transaction.
  -- Recovering a key returns a later version and keeps the existing character.
  if room->>'version' = '1' and input->>'avatarB64' is not null then
    room := public.creator_tower_rpc('save', jsonb_build_object(
      'id', room->>'id', 'hash', input->>'hash', 'version', 1,
      'design', room->'design', 'avatarMime', input->>'avatarMime', 'avatarB64', input->>'avatarB64'
    ));
    if room ? 'error' then
      raise exception 'Initial room character could not be saved';
    end if;
  end if;
  return room;
end;
$function$;

-- Public facility roster served through the Edge Function.
-- Vehicle bytes remain server-side; only metadata enters the public directory.
create function public.creator_tower_facility_rpc(command text, input jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if command <> 'facilities' then return '{"error":"invalid"}'::jsonb; end if;
  return jsonb_build_object('residents', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'slot', r.slot, 'version', r.version, 'noteId', r.note_id, 'name', r.profile->>'name',
      'engineer', coalesce((r.design->>'engineer')::boolean, false),
      'manager', coalesce(r.design->'manager' = 'true'::jsonb, false),
      'transport', coalesce((select jsonb_object_agg(v.key, v.value - 'base64' - 'mime')
        from jsonb_each(coalesce(r.design->'transport', '{}'::jsonb)) v), '{}'::jsonb)
    ) order by r.slot)
    from creator_tower.rooms r
    where r.design ? 'transport' or r.design->>'engineer' = 'true' or r.design->'manager' = 'true'::jsonb
  ), '[]'::jsonb));
end;
$$;
revoke all on function public.creator_tower_facility_rpc(text,jsonb) from public, anon, authenticated;
grant execute on function public.creator_tower_facility_rpc(text,jsonb) to service_role;

notify pgrst, 'reload schema';
-- After publication, keep authentication, versions, room configuration and membership.
-- Only image bytes with a matching public digest can be cleared.
create function public.creator_tower_archive_ack(input jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r creator_tower.rooms; item jsonb; encoded text; kind text; next_design jsonb; avatar text; released integer:=0;
begin
  select * into r from creator_tower.rooms where id=(input->>'id')::uuid for update;
  if not found or r.version<>(input->>'version')::integer then return '{"released":0}'; end if;
  next_design:=r.design; avatar:=r.avatar_b64;
  for item in select value from jsonb_array_elements(input->'items') loop
    kind:=item->>'kind';
    if kind='avatar' and item->>'version'=r.avatar_version::text then encoded:=avatar;
    elsif kind='interior' and item->>'version'=next_design->'world'->>'artwork' then encoded:=next_design->>'interiorB64';
    elsif kind in ('garage','parkingTower','bicycle','motorcycle') and item->>'version'=next_design->'transport'->kind->>'version' then encoded:=next_design->'transport'->kind->>'base64';
    else continue;end if;
    if encoded is null or encode(sha256(decode(encoded,'base64')),'hex')<>item->>'sha256' then continue; end if;
    if kind='avatar' then avatar:=null;
    elsif kind='interior' then next_design:=next_design-'interiorB64';
    else next_design:=next_design #- array['transport',kind,'base64'];end if;
    released:=released+1;
  end loop;
  if released>0 then update creator_tower.rooms set avatar_b64=avatar,design=next_design where id=r.id;end if;
  return jsonb_build_object('released',released);
end;$$;
revoke all on function public.creator_tower_archive_ack(jsonb) from public,anon,authenticated;
grant execute on function public.creator_tower_archive_ack(jsonb) to service_role;

revoke all on function public.creator_tower_rpc(text,jsonb),public.creator_tower_world_rpc(text,jsonb),creator_tower.room_data(creator_tower.rooms) from public,anon,authenticated;
grant execute on function public.creator_tower_rpc(text,jsonb),public.creator_tower_world_rpc(text,jsonb),creator_tower.room_data(creator_tower.rooms) to service_role;
create table creator_tower.publication_state(singleton boolean primary key check(singleton), ready boolean not null default false);
alter table creator_tower.publication_state enable row level security;
revoke all on creator_tower.publication_state from public,anon,authenticated;
grant select,insert,update on creator_tower.publication_state to service_role;
insert into creator_tower.publication_state(singleton,ready) values(true,false);
create function public.creator_tower_archive_ready() returns boolean language sql stable security invoker set search_path='' as $$
select ready from creator_tower.publication_state where singleton;
$$;
revoke all on function public.creator_tower_archive_ready() from public,anon,authenticated;
grant execute on function public.creator_tower_archive_ready() to service_role;
create function public.creator_tower_pending_images() returns jsonb
language sql stable security invoker set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'version',r.version)),'[]'::jsonb)
  from creator_tower.rooms r
  where r.avatar_b64 is not null or r.design ? 'interiorB64'
     or exists(select 1 from jsonb_each(coalesce(r.design->'transport','{}'::jsonb)) t where t.value ? 'base64');
$$;
revoke all on function public.creator_tower_pending_images() from public,anon,authenticated;
grant execute on function public.creator_tower_pending_images() to service_role;
create schema tower_visit_private;
revoke all on schema tower_visit_private from public, anon, authenticated;
create table tower_visit_private.counter (
  singleton boolean primary key check (singleton),
  total bigint not null default 0 check (total >= 0),
  visit_day date not null,
  added_today integer not null default 0
);
create table tower_visit_private.seen (
  visit_day date not null,
  token text not null,
  primary key (visit_day, token)
);
alter table tower_visit_private.counter enable row level security;
alter table tower_visit_private.seen enable row level security;
revoke all on all tables in schema tower_visit_private from public, anon, authenticated;
insert into tower_visit_private.counter(singleton, visit_day)
values (true, (now() at time zone 'Asia/Tokyo')::date);

create function tower_visit_private.record_visit(p_token text, p_day date)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '1s'
as $$
declare
  today date := (statement_timestamp() at time zone 'Asia/Tokyo')::date;
  tally tower_visit_private.counter%rowtype;
  added integer := 0;
  result text := 'ok';
begin
  if (p_token is null) <> (p_day is null) or
     (p_token is not null and (length(p_token) <> 64 or p_token !~ '^[0-9a-f]{64}$')) then
    raise exception 'Invalid visit' using errcode = '22023';
  end if;
  if p_token is null or p_day <> today then
    select * into strict tally from tower_visit_private.counter where singleton;
    if p_token is not null then result := 'day_changed'; end if;
  else
    select * into strict tally from tower_visit_private.counter where singleton for update;
    if tally.visit_day <> today then
      delete from tower_visit_private.seen where visit_day < today;
      tally.added_today := 0;
      update tower_visit_private.counter set visit_day = today, added_today = 0 where singleton;
    end if;
    if tally.added_today >= 5000 then
      result := 'daily_limit';
    else
      insert into tower_visit_private.seen values (today, p_token) on conflict do nothing;
      get diagnostics added = row_count;
      if added = 1 then
        update tower_visit_private.counter set total = total + 1, added_today = added_today + 1
        where singleton returning * into tally;
      end if;
    end if;
  end if;
  return jsonb_build_object('total', tally.total, 'counted', added = 1, 'status', result);
end;
$$;
create function public.tower_district_visit(p_token text default null, p_day date default null)
returns jsonb language sql security invoker set search_path = ''
as $$ select tower_visit_private.record_visit(p_token, p_day) $$;
revoke all on function tower_visit_private.record_visit(text, date) from public;
revoke all on function public.tower_district_visit(text, date) from public;
grant usage on schema tower_visit_private to anon, authenticated;
grant execute on function tower_visit_private.record_visit(text, date), public.tower_district_visit(text, date) to anon, authenticated;
notify pgrst, 'reload schema';
