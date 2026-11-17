create function public.creator_tower_world_rpc(command text, input jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  room jsonb;
begin
  if command = 'list' then
    return jsonb_build_object('floors', 12, 'perFloor', 12, 'rooms', coalesce(
      (select jsonb_agg(jsonb_build_object(
        'id', id, 'noteId', note_id, 'slot', slot, 'name', profile->>'name', 'photo', profile->>'photo',
        'title', design->>'title', 'theme', design->>'theme', 'light', design->>'light',
        'world', design->'world', 'avatarMode', design->>'avatarMode',
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
$$;

revoke all on function public.creator_tower_world_rpc(text, jsonb) from public, anon, authenticated;
grant execute on function public.creator_tower_world_rpc(text, jsonb) to service_role;
notify pgrst, 'reload schema';
