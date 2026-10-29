-- Daymaark Run 21b — paste after Run 21 if the last two lines failed.
-- The rest of Run 21 already landed. This drops the old 4-argument
-- activate_subscription and grants the new 5-argument one.

drop function if exists public.activate_subscription(uuid, text, text, bigint);

revoke all on function public.activate_subscription(uuid, text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.activate_subscription(uuid, text, text, bigint, text) to service_role;
