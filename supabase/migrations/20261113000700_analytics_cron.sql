-- T19: keep daily_metrics fresh (Architecture §13: analytics read from the rollup).
-- Today's rows refresh every 15 minutes; yesterday is finalised nightly (IST).
create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.rollup_all_outlets(p_days_back integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o record;
begin
  for o in select id, timezone from public.outlets loop
    perform public.rollup_daily_metrics(o.id, ((now() at time zone o.timezone)::date - p_days_back));
  end loop;
end;
$$;
revoke all on function public.rollup_all_outlets(integer) from public, anon, authenticated;
grant execute on function public.rollup_all_outlets(integer) to service_role;

select cron.schedule('krudex-rollup-today', '*/15 * * * *', $$select public.rollup_all_outlets(0)$$);
select cron.schedule('krudex-rollup-yesterday', '30 21 * * *', $$select public.rollup_all_outlets(1)$$); -- 03:00 IST
