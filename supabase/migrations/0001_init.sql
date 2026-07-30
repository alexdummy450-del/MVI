-- ============================================================
-- Motor Vehicle Inspection Unit — Accident Tracking System
-- Postgres schema (Supabase)
-- ============================================================

-- ---------- ENUMS ----------

create type user_role as enum ('inspector', 'admin');

create type accident_nature as enum ('fatal', 'serious', 'slight', 'non_injury');

create type injury_category as enum ('fatal', 'serious', 'slight', 'non_injury');

create type person_type as enum ('driver_rider', 'passenger', 'pedestrian');

create type report_status as enum ('draft', 'submitted');

create type cause_type as enum ('probable_cause', 'contributing_factor', 'recommendation');

create type photo_stage as enum ('intake', 'report');


-- ---------- USERS ----------
-- Extends Supabase auth.users with app-specific profile fields

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  credentials text,              -- e.g. "MIET, MKETRB, MKISM, MSCPSM"
  title text,                    -- e.g. "Senior Motor Vehicle Inspector"
  station text,                  -- e.g. "Kakamega MVI" — default traffic base for this inspector
  role user_role not null default 'inspector',
  created_at timestamptz not null default now()
);


-- ---------- VEHICLES ----------
-- Permanent vehicle records, reused across accidents

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  plate_number text not null unique,
  make text,
  model text,
  year int,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index idx_vehicles_plate on vehicles(plate_number);


-- ---------- ACCIDENTS ----------

create table accidents (
  id uuid primary key default gen_random_uuid(),
  primary_vehicle_id uuid not null references vehicles(id),
  occurred_at timestamptz not null,
  location_text text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  nature accident_nature not null,
  traffic_base text not null,          -- feeds "REF:" line on final report
  narrative text,                      -- short intake description
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_accidents_primary_vehicle on accidents(primary_vehicle_id);
create index idx_accidents_occurred_at on accidents(occurred_at);

-- Vehicles involved in an accident (descriptive context, not separate accident records)
create table accident_vehicles (
  id uuid primary key default gen_random_uuid(),
  accident_id uuid not null references accidents(id) on delete cascade,
  vehicle_id uuid references vehicles(id),      -- null if unidentified
  is_unidentified boolean not null default false,
  is_primary boolean not null default false,
  sort_order int not null default 0,
  constraint chk_vehicle_or_unidentified
    check (vehicle_id is not null or is_unidentified = true)
);

create index idx_accident_vehicles_accident on accident_vehicles(accident_id);

-- Intake evidence photos
create table photos (
  id uuid primary key default gen_random_uuid(),
  accident_id uuid references accidents(id) on delete cascade,
  report_id uuid,                       -- set below via alter (reports doesn't exist yet)
  vehicle_id uuid references vehicles(id),   -- which vehicle the photo relates to, if any
  stage photo_stage not null,
  storage_path text not null,           -- Supabase Storage path
  caption text,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);


-- ---------- INSPECTIONS ----------

create table inspections (
  id uuid primary key default gen_random_uuid(),
  accident_id uuid not null references accidents(id) on delete cascade,
  vt_number text not null unique,
  inspected_at timestamptz not null default now(),
  inspector_id uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_inspections_accident on inspections(accident_id);
create index idx_inspections_vt_number on inspections(vt_number);


-- ---------- REPORTS ----------

create table reports (
  id uuid primary key default gen_random_uuid(),
  accident_id uuid not null references accidents(id) on delete cascade,
  inspector_id uuid not null references profiles(id),

  -- Header
  recipient_office text,                -- e.g. "KAKAMEGA V.I.C"
  report_date date not null default current_date,
  subject_line text,                    -- auto-composed, editable

  -- Table 2: road/weather/visibility/location
  road_condition text,
  traffic_condition text,
  weather text,
  visibility text,

  -- Crash reconstruction
  reconstruction_narrative text,
  point_of_impact text,
  cause_code text,
  case_type text,                       -- e.g. "PUI"

  -- Inspected by (snapshot at time of report, editable per report)
  inspected_by_name text,
  inspected_by_credentials text,
  inspected_by_title text,
  inspected_by_station text,

  status report_status not null default 'draft',
  submitted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reports_accident on reports(accident_id);
create index idx_reports_status on reports(status);

-- now that reports exists, link photos to it
alter table photos add constraint fk_photos_report
  foreign key (report_id) references reports(id) on delete cascade;

create index idx_photos_report on photos(report_id);
create index idx_photos_accident on photos(accident_id);

-- Report can reference multiple VT numbers (usually one, but supports multi-inspection accidents)
create table report_vt_numbers (
  report_id uuid not null references reports(id) on delete cascade,
  inspection_id uuid not null references inspections(id),
  primary key (report_id, inspection_id)
);

-- Table 1: nature of injuries grid — normalized (category × person_type × count)
create table report_injury_counts (
  report_id uuid not null references reports(id) on delete cascade,
  category injury_category not null,
  person_type person_type not null,
  count int not null default 0,
  primary key (report_id, category, person_type)
);

-- Table 3: per-vehicle details, entered fresh each report
create table report_vehicle_details (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  accident_vehicle_id uuid not null references accident_vehicles(id),
  registered_owner text,
  sacco text,
  make_model_type text,
  damages text,
  speed_governor_status text,
  ks372_compliance text,
  insurance_details text,
  inspection_status text,
  pre_accident_condition text
);

create index idx_report_vehicle_details_report on report_vehicle_details(report_id);

-- Table 8: per-vehicle driver details
create table report_driver_details (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  accident_vehicle_id uuid not null references accident_vehicles(id),
  driver_name text default 'Pending',
  driver_id_no text default 'Pending',
  driver_dl_no text default 'Pending'
);

create index idx_report_driver_details_report on report_driver_details(report_id);

-- Probable cause / contributing factors / recommendations — pick-list backed, editable, ordered
create table cause_picklist (
  id uuid primary key default gen_random_uuid(),
  type cause_type not null,
  label text not null,
  default_text text not null,     -- inserted as editable starting text when picked
  active boolean not null default true
);

create table report_causes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  type cause_type not null,
  picklist_id uuid references cause_picklist(id),   -- null if pure "Other" free text
  text text not null,
  sort_order int not null default 0
);

create index idx_report_causes_report on report_causes(report_id, type, sort_order);


-- ---------- UPDATED_AT TRIGGER ----------

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_accidents_updated_at before update on accidents
  for each row execute function set_updated_at();

create trigger trg_reports_updated_at before update on reports
  for each row execute function set_updated_at();


-- ---------- ROW LEVEL SECURITY ----------

alter table accidents enable row level security;
alter table inspections enable row level security;
alter table reports enable row level security;
alter table report_vehicle_details enable row level security;
alter table report_driver_details enable row level security;
alter table report_causes enable row level security;
alter table report_injury_counts enable row level security;
alter table photos enable row level security;

-- All 3 inspectors can see and manage all records (shared unit workload)
-- Adjust to "created_by = auth.uid()" scoping if you later want per-inspector isolation.

create policy "inspectors full access - accidents"
  on accidents for all
  using (auth.uid() in (select id from profiles))
  with check (auth.uid() in (select id from profiles));

create policy "inspectors full access - inspections"
  on inspections for all
  using (auth.uid() in (select id from profiles))
  with check (auth.uid() in (select id from profiles));

create policy "inspectors full access - reports"
  on reports for all
  using (auth.uid() in (select id from profiles))
  with check (auth.uid() in (select id from profiles));

-- Once a report is submitted, lock it from further edits (except by admin role)
create policy "no edits after submission"
  on reports for update
  using (
    status = 'draft'
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Same pattern applies to child tables (report_vehicle_details, report_causes, etc.)
-- — omitted here for brevity, mirror the "inspectors full access" policy on each.


-- ---------- SEED: common cause picklist ----------

insert into cause_picklist (type, label, default_text) values
  ('probable_cause', 'Improper overtaking', 'The driver attempted to overtake without ensuring the opposite lane was clear.'),
  ('probable_cause', 'Failure to keep to proper lane', 'The vehicle encroached into the lane of oncoming traffic.'),
  ('probable_cause', 'Speeding', 'Excessive speed for the prevailing road conditions.'),
  ('probable_cause', 'Mechanical failure', 'A mechanical defect contributed to the loss of control.'),
  ('contributing_factor', 'Poor visibility', 'Reduced visibility affected hazard perception and decision-making.'),
  ('contributing_factor', 'Road condition', 'Road surface or geometry contributed to the crash.'),
  ('contributing_factor', 'Driver fatigue', 'Signs of driver fatigue were noted as a contributing factor.'),
  ('recommendation', 'Increase patrol visibility', 'Increase highway patrol visibility, especially during peak risk hours.'),
  ('recommendation', 'Improve signage', 'Install or reinforce warning signs and road markings at the crash location.'),
  ('recommendation', 'Mechanical inspection', 'Ensure mechanical inspection of all involved vehicles to rule out mechanical contribution.');
