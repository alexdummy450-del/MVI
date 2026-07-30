-- ============================================================
-- Fills in the RLS policies the base schema left as "mirror this
-- pattern" for child tables, adds profile auto-provisioning on
-- signup, and creates the photos storage bucket.
-- ============================================================

-- ---------- RLS: child tables (mirrors "inspectors full access") ----------

alter table report_vehicle_details enable row level security;
alter table report_driver_details enable row level security;
alter table report_causes enable row level security;
alter table report_injury_counts enable row level security;
alter table photos enable row level security;
alter table accident_vehicles enable row level security;
alter table vehicles enable row level security;
alter table report_vt_numbers enable row level security;
alter table cause_picklist enable row level security;
alter table profiles enable row level security;

create policy "inspectors full access - accident_vehicles"
  on accident_vehicles for all
  using (auth.uid() in (select id from profiles))
  with check (auth.uid() in (select id from profiles));

create policy "inspectors full access - vehicles"
  on vehicles for all
  using (auth.uid() in (select id from profiles))
  with check (auth.uid() in (select id from profiles));

create policy "inspectors full access - photos"
  on photos for all
  using (auth.uid() in (select id from profiles))
  with check (auth.uid() in (select id from profiles));

create policy "inspectors full access - report_vehicle_details"
  on report_vehicle_details for all
  using (auth.uid() in (select id from profiles))
  with check (auth.uid() in (select id from profiles));

create policy "inspectors full access - report_driver_details"
  on report_driver_details for all
  using (auth.uid() in (select id from profiles))
  with check (auth.uid() in (select id from profiles));

create policy "inspectors full access - report_causes"
  on report_causes for all
  using (auth.uid() in (select id from profiles))
  with check (auth.uid() in (select id from profiles));

create policy "inspectors full access - report_injury_counts"
  on report_injury_counts for all
  using (auth.uid() in (select id from profiles))
  with check (auth.uid() in (select id from profiles));

create policy "inspectors full access - report_vt_numbers"
  on report_vt_numbers for all
  using (auth.uid() in (select id from profiles))
  with check (auth.uid() in (select id from profiles));

create policy "read cause picklist"
  on cause_picklist for select
  using (auth.uid() in (select id from profiles));

create policy "manage cause picklist - admin"
  on cause_picklist for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "read own or shared profiles"
  on profiles for select
  using (auth.uid() in (select id from profiles));

create policy "update own profile"
  on profiles for update
  using (id = auth.uid());


-- ---------- PROFILE AUTO-PROVISIONING ----------
-- Creates a `profiles` row whenever a new auth.users record appears
-- (e.g. when an admin invites an inspector via Supabase Auth).
-- full_name/station/etc default to placeholders editable afterward.

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'inspector'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ---------- STORAGE ----------
-- Bucket for accident/report photos. Private; access is via the
-- inspectors-only policies below (matches the shared-workload model).

insert into storage.buckets (id, name, public)
values ('accident-photos', 'accident-photos', false)
on conflict (id) do nothing;

create policy "inspectors read accident-photos"
  on storage.objects for select
  using (bucket_id = 'accident-photos' and auth.uid() in (select id from profiles));

create policy "inspectors upload accident-photos"
  on storage.objects for insert
  with check (bucket_id = 'accident-photos' and auth.uid() in (select id from profiles));

create policy "inspectors delete own accident-photos"
  on storage.objects for delete
  using (bucket_id = 'accident-photos' and auth.uid() in (select id from profiles));
