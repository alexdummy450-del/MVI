-- ============================================================
-- CLEAR TEST DATA SCRIPT (MVI Accident Tracker)
-- Safely truncates test data tables while keeping user profiles
-- and default picklist items intact.
-- ============================================================

TRUNCATE TABLE 
  photos,
  report_causes,
  report_injury_counts,
  report_driver_details,
  report_vehicle_details,
  report_vt_numbers,
  reports,
  inspections,
  accident_vehicles,
  accidents,
  vehicles
CASCADE;
