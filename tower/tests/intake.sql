-- Run only on the isolated CI database. Exercise the same service-role API used by the function.
begin;
set local role service_role;
do $test$
declare i integer; r jsonb; result jsonb; first_room jsonb; member jsonb; visitor text; item jsonb; pick text; input jsonb;
begin
  if public.creator_tower_archive_ready() then raise exception 'Fresh database is unexpectedly accepting changes'; end if;
  for i in 1..7 loop
    input:=jsonb_build_object('noteId','tester_'||i,'noteUser','unit-'||i,'hash',repeat(i::text,64),'code','AT-FIXTURE-'||i,'slot',i);
    perform public.creator_tower_rpc('begin',input);
    r:=public.creator_tower_world_rpc('finish',input||jsonb_build_object('profile','{"name":"Fixture","articles":[]}'::jsonb,
      'design','{"avatarMode":"custom","engineer":true}'::jsonb,'avatarB64','eA==','avatarMime','image/webp'));
    if (r->>'slot')::int is distinct from i or r->>'avatarVersion' is distinct from '1' then raise exception 'Enrollment failed %',r; end if;
    if i=1 then first_room:=r; end if;
    if i=7 then visitor:=input->>'hash'; end if;
    member:=public.creator_tower_rpc('save',input||jsonb_build_object('id',r->>'id','version',r->'version','design',r->'design'||'{"manager":true}'::jsonb));
    if i<=5 and member->'design'->>'manager' is distinct from 'true' then raise exception 'Expected appointment %',member; end if;
    if i>5 and member->>'error' is distinct from 'manager_full' then raise exception 'Expected five-person manager limit %',member; end if;
  end loop;
  if (select count(*) from creator_tower.rooms where design->>'engineer'='true')<>7 then raise exception 'Engineering roster lost a member'; end if;
  foreach pick in array array['read','hello','inspired'] loop
    result:=public.creator_tower_rpc('stamp',jsonb_build_object('id',first_room->>'id','hash',visitor,'kind',pick,'enabled',true));
  end loop;
  if jsonb_array_length(result->'myStamps')<>3 then raise exception 'Three independent stamps expected'; end if;
  r:=public.creator_tower_rpc('room',jsonb_build_object('id',first_room->>'id'));
  item:=jsonb_build_object('kind','avatar','version',1,'sha256', repeat('0',64));
  input:=jsonb_build_object('id',r->>'id','version',r->'version','items',jsonb_build_array(item));
  result:=public.creator_tower_archive_ack(input);
  if result->>'released' is distinct from '0' then raise exception 'Mismatched content was cleared'; end if;
  item:=item||jsonb_build_object('sha256',encode(sha256(decode('eA==','base64')),'hex'));
  result:=public.creator_tower_archive_ack(input||jsonb_build_object('items',jsonb_build_array(item)));
  if result->>'released' is distinct from '1' then raise exception 'Verified copy failed %',result; end if;
  result:=public.creator_tower_rpc('room',jsonb_build_object('id',r->>'id'));
  if result->>'avatarVersion' is distinct from '1' or result->>'slot' is distinct from '1' or result->>'version' is distinct from r->>'version' then raise exception 'Release changed the public identity'; end if;
  if jsonb_array_length(public.creator_tower_pending_images())<>6 then raise exception 'Pending image list is inaccurate'; end if;
end;
$test$;
rollback;
