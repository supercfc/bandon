alter table public.order_items
  add column if not exists paid_status text not null default '未繳'
  check (paid_status in ('已繳清', '未繳'));
