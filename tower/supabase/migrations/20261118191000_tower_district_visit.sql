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
