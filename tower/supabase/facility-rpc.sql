-- Snapshot of the already-deployed facility query (2026-11-18).
-- Vehicle bytes remain server-side; only metadata enters the public directory.
create or replace function public.creator_tower_facility_rpc(command text, input jsonb)
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
      'id', r.id, 'slot', r.slot, 'noteId', r.note_id, 'name', r.profile->>'name',
      'engineer', coalesce((r.design->>'engineer')::boolean, false),
      'transport', coalesce((select jsonb_object_agg(v.key, v.value - 'base64' - 'mime')
        from jsonb_each(coalesce(r.design->'transport', '{}'::jsonb)) v), '{}'::jsonb)
    ) order by r.slot)
    from creator_tower.rooms r
    where r.design ? 'transport' or r.design->>'engineer' = 'true'
  ), '[]'::jsonb));
end;
$$;
revoke all on function public.creator_tower_facility_rpc(text,jsonb) from public, anon, authenticated;
grant execute on function public.creator_tower_facility_rpc(text,jsonb) to service_role;
