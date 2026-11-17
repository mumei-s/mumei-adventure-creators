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
      or (avatar_mime in ('image/png', 'image/webp', 'image/gif') and avatar_b64 is not null))
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
  primary key (room_id, visitor_id),
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

create function public.creator_tower_rpc(command text, input jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
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
  capacity constant integer := 144;
  per_floor constant integer := 12;
  period_start timestamptz := date_trunc('minute', now());
  attempts integer;
  stamp_kind text := input->>'kind';
  personal_stamp text;
begin
  case command
  when 'list' then
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
    if stamp_kind is not null then
      if stamp_kind not in ('read', 'hello', 'inspired') then return '{"error":"invalid"}'::jsonb; end if;
      insert into creator_tower.stamps(room_id, visitor_id, kind) values (room.id, actor, stamp_kind)
        on conflict (room_id, visitor_id) do update set kind = excluded.kind;
    else
      delete from creator_tower.stamps where room_id = room.id and visitor_id = actor;
    end if;
    return creator_tower.room_data(room) || jsonb_build_object('myStamp', stamp_kind);

  when 'visit' then
    select * into room from creator_tower.rooms where id = room_uuid;
    if not found then return '{"error":"missing"}'::jsonb; end if;
    select id into actor from creator_tower.rooms where owner_hash = owner_key;
    select kind into personal_stamp from creator_tower.stamps where room_id = room_uuid and visitor_id = actor;
    return creator_tower.room_data(room) || jsonb_build_object(
      'myStamp', personal_stamp, 'canStamp', actor is not null and actor <> room_uuid,
      'isOwner', actor = room_uuid
    );

  else return '{"error":"invalid"}'::jsonb;
  end case;
end;
$$;

revoke all on function creator_tower.room_data(creator_tower.rooms) from public, anon, authenticated;
grant execute on function creator_tower.room_data(creator_tower.rooms) to service_role;
revoke all on function public.creator_tower_rpc(text, jsonb) from public, anon, authenticated;
grant execute on function public.creator_tower_rpc(text, jsonb) to service_role;
notify pgrst, 'reload schema';
