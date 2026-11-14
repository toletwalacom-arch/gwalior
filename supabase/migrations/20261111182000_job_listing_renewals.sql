begin;

alter table public.job_payment_orders
  add column if not exists renewal_job_id uuid;

create or replace function public.complete_job_payment(p_order_id text, p_payment_id text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  payment_row public.job_payment_orders%rowtype;
  completed_job_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the payment service can complete job payments.';
  end if;

  select * into payment_row
  from public.job_payment_orders
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'Payment order was not found.';
  end if;

  if payment_row.status = 'paid' then
    if payment_row.payment_id <> p_payment_id or payment_row.job_id is null then
      raise exception 'Payment order has already been completed.';
    end if;
    return payment_row.job_id;
  end if;

  if payment_row.renewal_job_id is not null then
    update public.job_listings
    set expires_at = greatest(coalesce(expires_at, now()), now())
          + (payment_row.days || ' days')::interval,
        status = 'active'
    where id = payment_row.renewal_job_id
      and owner_id = payment_row.user_id
    returning id into completed_job_id;

    if completed_job_id is null then
      raise exception 'This job listing can no longer be renewed.';
    end if;
  else
    insert into public.job_listings (
      owner_id, title, company, location, employment_type, workplace_type,
      salary, description, requirements, status, expires_at
    ) values (
      payment_row.user_id, payment_row.title, payment_row.company, payment_row.location,
      payment_row.employment_type, payment_row.workplace_type, payment_row.salary,
      payment_row.description, payment_row.requirements, 'active',
      now() + (payment_row.days || ' days')::interval
    )
    returning id into completed_job_id;
  end if;

  update public.job_payment_orders
  set status = 'paid', payment_id = p_payment_id, job_id = completed_job_id, paid_at = now()
  where order_id = p_order_id;

  return completed_job_id;
end;
$$;

revoke all on function public.complete_job_payment(text, text) from public, anon, authenticated;
grant execute on function public.complete_job_payment(text, text) to service_role;

commit;
