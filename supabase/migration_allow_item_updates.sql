drop policy if exists "Public can update order items" on public.order_items;
create policy "Public can update order items"
  on public.order_items for update to anon using (true) with check (true);
