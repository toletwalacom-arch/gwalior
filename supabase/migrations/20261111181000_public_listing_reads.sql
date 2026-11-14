begin;

alter table public.job_listings enable row level security;
drop policy if exists "Anyone can browse active job listings" on public.job_listings;
create policy "Anyone can browse active job listings"
  on public.job_listings for select
  to anon, authenticated
  using (
    (status = 'active' and (expires_at is null or expires_at > now()))
    or auth.uid() = owner_id
  );
grant select on public.job_listings to anon, authenticated;

alter table public.marketplace_listings enable row level security;
drop policy if exists "Anyone can browse active marketplace listings" on public.marketplace_listings;
create policy "Anyone can browse active marketplace listings"
  on public.marketplace_listings for select
  to anon, authenticated
  using (status = 'active' or auth.uid() = owner_id);
grant select on public.marketplace_listings to anon, authenticated;

commit;
