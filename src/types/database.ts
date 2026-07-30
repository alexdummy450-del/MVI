// Hand-authored to match mvi_schema.sql.
// Once linked to a real Supabase project, regenerate with:
//   supabase gen types typescript --project-id <id> > src/types/database.ts
// and this file becomes redundant.

export type UserRole = "inspector" | "admin";
export type AccidentNature = "fatal" | "serious" | "slight" | "non_injury";
export type InjuryCategory = "fatal" | "serious" | "slight" | "non_injury";
export type PersonType = "driver_rider" | "passenger" | "pedestrian";
export type ReportStatus = "draft" | "submitted";
export type CauseType = "probable_cause" | "contributing_factor" | "recommendation";
export type PhotoStage = "intake" | "report";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          credentials: string | null;
          title: string | null;
          station: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          full_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      vehicles: {
        Row: {
          id: string;
          plate_number: string;
          make: string | null;
          model: string | null;
          year: number | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["vehicles"]["Row"]> & {
          plate_number: string;
        };
        Update: Partial<Database["public"]["Tables"]["vehicles"]["Row"]>;
      };
      accidents: {
        Row: {
          id: string;
          primary_vehicle_id: string;
          occurred_at: string;
          location_text: string | null;
          latitude: number | null;
          longitude: number | null;
          nature: AccidentNature;
          traffic_base: string;
          narrative: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["accidents"]["Row"]> & {
          primary_vehicle_id: string;
          occurred_at: string;
          nature: AccidentNature;
          traffic_base: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["accidents"]["Row"]>;
      };
      accident_vehicles: {
        Row: {
          id: string;
          accident_id: string;
          vehicle_id: string | null;
          is_unidentified: boolean;
          is_primary: boolean;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["accident_vehicles"]["Row"]> & {
          accident_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["accident_vehicles"]["Row"]>;
      };
      photos: {
        Row: {
          id: string;
          accident_id: string | null;
          report_id: string | null;
          vehicle_id: string | null;
          stage: PhotoStage;
          storage_path: string;
          caption: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["photos"]["Row"]> & {
          stage: PhotoStage;
          storage_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["photos"]["Row"]>;
      };
      inspections: {
        Row: {
          id: string;
          accident_id: string;
          vt_number: string;
          inspected_at: string;
          inspector_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["inspections"]["Row"]> & {
          accident_id: string;
          vt_number: string;
          inspector_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["inspections"]["Row"]>;
      };
      reports: {
        Row: {
          id: string;
          accident_id: string;
          inspector_id: string;
          recipient_office: string | null;
          report_date: string;
          subject_line: string | null;
          road_condition: string | null;
          traffic_condition: string | null;
          weather: string | null;
          visibility: string | null;
          reconstruction_narrative: string | null;
          point_of_impact: string | null;
          cause_code: string | null;
          case_type: string | null;
          inspected_by_name: string | null;
          inspected_by_credentials: string | null;
          inspected_by_title: string | null;
          inspected_by_station: string | null;
          status: ReportStatus;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reports"]["Row"]> & {
          accident_id: string;
          inspector_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Row"]>;
      };
      cause_picklist: {
        Row: {
          id: string;
          type: CauseType;
          label: string;
          default_text: string;
          active: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["cause_picklist"]["Row"]> & {
          type: CauseType;
          label: string;
          default_text: string;
        };
        Update: Partial<Database["public"]["Tables"]["cause_picklist"]["Row"]>;
      };
      inspections: {
        Row: {
          id: string;
          accident_id: string;
          vt_number: string;
          inspected_at: string;
          inspector_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["inspections"]["Row"]> & {
          accident_id: string;
          vt_number: string;
          inspector_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["inspections"]["Row"]>;
      };
    };
  };
}
