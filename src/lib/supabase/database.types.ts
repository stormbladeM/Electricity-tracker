// Generated via Supabase MCP `generate_typescript_types` against project
// zqkdsbbrhbcyftzmcxlk. Regenerate after any schema migration — do not edit
// by hand.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          notes: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      areas: {
        Row: {
          created_at: string
          disco_id: string | null
          id: string
          lga_id: string
          name: string | null
          slug: string | null
        }
        Insert: {
          created_at?: string
          disco_id?: string | null
          id?: string
          lga_id: string
          name?: string | null
          slug?: string | null
        }
        Update: {
          created_at?: string
          disco_id?: string | null
          id?: string
          lga_id?: string
          name?: string | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_disco_id_fkey"
            columns: ["disco_id"]
            isOneToOne: false
            referencedRelation: "discos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
        ]
      }
      discos: {
        Row: {
          created_at: string
          id: string
          name: string
          short_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          short_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          short_name?: string | null
        }
        Relationships: []
      }
      fault_confirmations: {
        Row: {
          created_at: string
          fault_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fault_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fault_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fault_confirmations_fault_id_fkey"
            columns: ["fault_id"]
            isOneToOne: false
            referencedRelation: "fault_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      fault_reports: {
        Row: {
          area_id: string
          confirm_count: number
          created_at: string
          description: string | null
          disco_id: string | null
          fault_type: Database["public"]["Enums"]["fault_type"]
          id: string
          latitude: number | null
          lga_id: string
          longitude: number | null
          photo_url: string | null
          reported_at: string
          resolution_note: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["fault_severity"]
          state_id: string
          status: Database["public"]["Enums"]["fault_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          area_id: string
          confirm_count?: number
          created_at?: string
          description?: string | null
          disco_id?: string | null
          fault_type: Database["public"]["Enums"]["fault_type"]
          id?: string
          latitude?: number | null
          lga_id: string
          longitude?: number | null
          photo_url?: string | null
          reported_at?: string
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["fault_severity"]
          state_id: string
          status?: Database["public"]["Enums"]["fault_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          area_id?: string
          confirm_count?: number
          created_at?: string
          description?: string | null
          disco_id?: string | null
          fault_type?: Database["public"]["Enums"]["fault_type"]
          id?: string
          latitude?: number | null
          lga_id?: string
          longitude?: number | null
          photo_url?: string | null
          reported_at?: string
          resolution_note?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["fault_severity"]
          state_id?: string
          status?: Database["public"]["Enums"]["fault_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fault_reports_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fault_reports_disco_id_fkey"
            columns: ["disco_id"]
            isOneToOne: false
            referencedRelation: "discos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fault_reports_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fault_reports_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      grid_events: {
        Row: {
          agreement: number
          area_id: string
          baseline_rate: number | null
          computed_at: string
          contributing_logs: number
          created_at: string
          detected_at: string
          distinct_contributors: number
          event_type: Database["public"]["Enums"]["grid_event_type"]
          id: string
          lga_id: string
          method: Database["public"]["Enums"]["grid_event_method"]
          occurred_at: string
          state_id: string
          window_seconds: number
        }
        Insert: {
          agreement: number
          area_id: string
          baseline_rate?: number | null
          computed_at?: string
          contributing_logs: number
          created_at?: string
          detected_at?: string
          distinct_contributors: number
          event_type: Database["public"]["Enums"]["grid_event_type"]
          id?: string
          lga_id: string
          method?: Database["public"]["Enums"]["grid_event_method"]
          occurred_at: string
          state_id: string
          window_seconds: number
        }
        Update: {
          agreement?: number
          area_id?: string
          baseline_rate?: number | null
          computed_at?: string
          contributing_logs?: number
          created_at?: string
          detected_at?: string
          distinct_contributors?: number
          event_type?: Database["public"]["Enums"]["grid_event_type"]
          id?: string
          lga_id?: string
          method?: Database["public"]["Enums"]["grid_event_method"]
          occurred_at?: string
          state_id?: string
          window_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "grid_events_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grid_events_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grid_events_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      lgas: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string | null
          state_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug?: string | null
          state_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string | null
          state_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lgas_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      outage_intervals: {
        Row: {
          area_id: string
          computed_at: string
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          started_at: string
        }
        Insert: {
          area_id: string
          computed_at?: string
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          started_at: string
        }
        Update: {
          area_id?: string
          computed_at?: string
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outage_intervals_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      power_logs: {
        Row: {
          area_id: string
          created_at: string
          flag_reason: string | null
          id: string
          is_flagged: boolean
          lga_id: string
          logged_at: string
          power_source: Database["public"]["Enums"]["power_source"] | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: Database["public"]["Enums"]["log_source"]
          state_id: string
          status: Database["public"]["Enums"]["power_status"]
          user_id: string
        }
        Insert: {
          area_id: string
          created_at?: string
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean
          lga_id: string
          logged_at?: string
          power_source?: Database["public"]["Enums"]["power_source"] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: Database["public"]["Enums"]["log_source"]
          state_id: string
          status: Database["public"]["Enums"]["power_status"]
          user_id: string
        }
        Update: {
          area_id?: string
          created_at?: string
          flag_reason?: string | null
          id?: string
          is_flagged?: boolean
          lga_id?: string
          logged_at?: string
          power_source?: Database["public"]["Enums"]["power_source"] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: Database["public"]["Enums"]["log_source"]
          state_id?: string
          status?: Database["public"]["Enums"]["power_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "power_logs_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "power_logs_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "power_logs_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          area_id: string | null
          created_at: string
          display_name: string | null
          id: string
          is_banned: boolean
          lga_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          state_id: string | null
          trust_score: number
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_banned?: boolean
          lga_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          state_id?: string | null
          trust_score?: number
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_banned?: boolean
          lga_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          state_id?: string | null
          trust_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      states: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_audit_feed: {
        Args: { p_action_prefix?: string; p_days?: number; p_limit?: number }
        Returns: {
          action: string
          admin_id: string
          admin_name: string
          admin_role: Database["public"]["Enums"]["user_role"]
          created_at: string
          id: string
          notes: string
          target_id: string
          target_type: string
        }[]
      }
      admin_contributors: {
        Args: { p_flagged_only?: boolean; p_limit?: number }
        Returns: {
          display_name: string
          fault_count: number
          first_logged_at: string
          flagged_count: number
          is_banned: boolean
          last_logged_at: string
          lga_name: string
          log_count: number
          pending_flag_count: number
          role: Database["public"]["Enums"]["user_role"]
          state_name: string
          trust_score: number
          user_id: string
        }[]
      }
      admin_fault_metrics: {
        Args: { p_days?: number }
        Returns: {
          avg_hours: number
          dimension: string
          label: string
          median_hours: number
          open_count: number
          resolved_count: number
        }[]
      }
      admin_flagged_logs: {
        Args: { p_limit?: number }
        Returns: {
          display_name: string
          flag_reason: string
          id: string
          is_banned: boolean
          lga_name: string
          logged_at: string
          power_source: Database["public"]["Enums"]["power_source"]
          state_name: string
          status: Database["public"]["Enums"]["power_status"]
          trust_score: number
          user_flagged_count: number
          user_id: string
          user_log_count: number
        }[]
      }
      admin_growth_series: {
        Args: { p_days?: number }
        Returns: {
          contributors: number
          day: string
          faults: number
          logs: number
          new_users: number
        }[]
      }
      admin_lga_coverage: {
        Args: { p_days?: number }
        Returns: {
          contributor_count: number
          fault_count: number
          last_log_at: string
          lga_id: string
          lga_name: string
          lga_slug: string
          log_count: number
          state_id: string
          state_name: string
        }[]
      }
      admin_merge_areas: {
        Args: { p_note?: string; p_source_id: string; p_target_id: string }
        Returns: undefined
      }
      admin_overview_stats: {
        Args: { p_days?: number }
        Returns: {
          audit_actions_window: number
          banned_users: number
          contributors_total: number
          contributors_window: number
          faults_open: number
          faults_resolved_window: number
          faults_untriaged: number
          faults_window: number
          flagged_logs_open: number
          lgas_total: number
          lgas_tracked: number
          logs_prev_window: number
          logs_total: number
          logs_window: number
          median_resolution_hours: number
          national_uptime_percent: number
          new_users_window: number
          users_total: number
          window_days: number
        }[]
      }
      admin_save_area: {
        Args: {
          p_area_id?: string
          p_disco_id?: string
          p_lga_id?: string
          p_name?: string
          p_slug?: string
        }
        Returns: string
      }
      admin_save_disco: {
        Args: { p_disco_id?: string; p_name?: string; p_short_name?: string }
        Returns: string
      }
      admin_save_lga: {
        Args: {
          p_lga_id?: string
          p_name?: string
          p_slug?: string
          p_state_id?: string
        }
        Returns: string
      }
      admin_save_state: {
        Args: {
          p_code?: string
          p_name?: string
          p_slug?: string
          p_state_id?: string
        }
        Returns: string
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      derive_outage_intervals: { Args: never; Returns: number }
      detect_grid_events: { Args: never; Returns: number }
      flag_suspect_power_logs: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      is_current_user_banned: { Args: never; Returns: boolean }
      is_moderator_or_admin: { Args: never; Returns: boolean }
      lga_uptime_ranking: {
        Args: { p_days?: number }
        Returns: {
          area_count: number
          contributor_count: number
          lga_id: string
          lga_name: string
          lga_slug: string
          log_count: number
          off_minutes: number
          outage_count: number
          state_id: string
          state_name: string
          state_slug: string
          uptime_percent: number
        }[]
      }
      lga_uptime_shift: {
        Args: { p_baseline_days?: number; p_recent_days?: number }
        Returns: {
          baseline_contributor_count: number
          baseline_log_count: number
          baseline_uptime_percent: number
          delta_percent: number
          lga_id: string
          lga_name: string
          lga_slug: string
          recent_contributor_count: number
          recent_log_count: number
          recent_outage_count: number
          recent_uptime_percent: number
          state_id: string
          state_name: string
          state_slug: string
        }[]
      }
      merge_fault_reports: {
        Args: { p_duplicate_id: string; p_note?: string; p_primary_id: string }
        Returns: undefined
      }
      review_power_logs: {
        Args: { p_keep: boolean; p_log_ids: string[]; p_note?: string }
        Returns: number
      }
      set_fault_status: {
        Args: {
          p_fault_id: string
          p_note?: string
          p_status: Database["public"]["Enums"]["fault_status"]
        }
        Returns: undefined
      }
      set_user_moderation: {
        Args: {
          p_is_banned?: boolean
          p_note?: string
          p_trust_score?: number
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      fault_severity: "low" | "medium" | "high" | "critical"
      fault_status:
        | "reported"
        | "confirmed"
        | "acknowledged"
        | "in_progress"
        | "resolved"
        | "rejected"
      fault_type:
        | "transformer"
        | "pole_down"
        | "cable_snap"
        | "meter_issue"
        | "low_voltage"
        | "vandalism"
        | "billing"
        | "other"
      grid_event_method: "log_sync"
      grid_event_type: "restoration" | "outage"
      log_source: "manual" | "auto"
      power_source: "grid" | "generator" | "solar" | "inverter"
      power_status: "on" | "off"
      user_role: "user" | "moderator" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      fault_severity: ["low", "medium", "high", "critical"],
      fault_status: [
        "reported",
        "confirmed",
        "acknowledged",
        "in_progress",
        "resolved",
        "rejected",
      ],
      fault_type: [
        "transformer",
        "pole_down",
        "cable_snap",
        "meter_issue",
        "low_voltage",
        "vandalism",
        "billing",
        "other",
      ],
      grid_event_method: ["log_sync"],
      grid_event_type: ["restoration", "outage"],
      log_source: ["manual", "auto"],
      power_source: ["grid", "generator", "solar", "inverter"],
      power_status: ["on", "off"],
      user_role: ["user", "moderator", "admin"],
    },
  },
} as const
