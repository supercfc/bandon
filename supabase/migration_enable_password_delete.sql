create or replace function public.delete_order_with_password(
  target_order_id uuid,
  supplied_password text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if supplied_password is distinct from '29710166' then
    return false;
  end if;

  delete from public.orders where id = target_order_id;
  return found;
end;
$$;

revoke all on function public.delete_order_with_password(uuid, text) from public;
grant execute on function public.delete_order_with_password(uuid, text) to anon;
