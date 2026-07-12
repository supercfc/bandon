alter table public.order_items drop constraint if exists order_items_price_check;
alter table public.order_items add constraint order_items_price_check check (price >= 0 and price <= 100000);
