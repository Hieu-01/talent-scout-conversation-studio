CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- display_name stays empty until the person picks one on first sign-in
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, null);
  if not exists (select 1 from public.user_roles where role = 'owner') then
    insert into public.user_roles (user_id, role) values (new.id, 'owner');
  elsif exists (select 1 from public.team_invites where lower(email) = lower(new.email)) then
    insert into public.user_roles (user_id, role) values (new.id, 'member') on conflict do nothing;
  end if;
  return new;
end $function$;