create table public.orders (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  note text not null default '開放訂購中',
  deadline_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  product text not null check (char_length(product) between 1 and 120),
  price integer not null check (price >= 0 and price <= 100000),
  paid_status text not null default '未繳' check (paid_status in ('已繳清', '未繳')),
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items(order_id);
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
create policy "Public can read orders" on public.orders for select to anon using (true);
create policy "Public can create orders" on public.orders for insert to anon with check (true);
create policy "Public can read order items" on public.order_items for select to anon using (true);
create policy "Public can add order items" on public.order_items for insert to anon with check (true);
create policy "Public can update order items" on public.order_items for update to anon using (true) with check (true);
