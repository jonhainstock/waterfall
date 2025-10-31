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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_users: {
        Row: {
          account_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_users_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_type: string
          created_at: string
          id: string
          name: string
          subscription_status: string
          subscription_tier: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          account_type: string
          created_at?: string
          id?: string
          name: string
          subscription_status?: string
          subscription_tier?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          created_at?: string
          id?: string
          name?: string
          subscription_status?: string
          subscription_tier?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          contract_amount: number
          created_at: string
          customer_name: string | null
          description: string | null
          end_date: string
          id: string
          invoice_id: string
          monthly_recognition: number
          organization_id: string
          start_date: string
          status: string
          term_months: number
          updated_at: string
        }
        Insert: {
          contract_amount: number
          created_at?: string
          customer_name?: string | null
          description?: string | null
          end_date: string
          id?: string
          invoice_id: string
          monthly_recognition: number
          organization_id: string
          start_date: string
          status?: string
          term_months: number
          updated_at?: string
        }
        Update: {
          contract_amount?: number
          created_at?: string
          customer_name?: string | null
          description?: string | null
          end_date?: string
          id?: string
          invoice_id?: string
          monthly_recognition?: number
          organization_id?: string
          start_date?: string
          status?: string
          term_months?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          created_at: string
          error_details: Json | null
          filename: string
          id: string
          imported_by: string
          organization_id: string
          rows_failed: number
          rows_processed: number
          rows_succeeded: number
        }
        Insert: {
          created_at?: string
          error_details?: Json | null
          filename: string
          id?: string
          imported_by: string
          organization_id: string
          rows_failed: number
          rows_processed: number
          rows_succeeded: number
        }
        Update: {
          created_at?: string
          error_details?: Json | null
          filename?: string
          id?: string
          imported_by?: string
          organization_id?: string
          rows_failed?: number
          rows_processed?: number
          rows_succeeded?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          account_id: string
          account_mapping: Json | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          quickbooks_access_token: string | null
          quickbooks_connected_at: string | null
          quickbooks_expires_at: string | null
          quickbooks_realm_id: string | null
          quickbooks_refresh_token: string | null
          settings: Json | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          account_mapping?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          quickbooks_access_token?: string | null
          quickbooks_connected_at?: string | null
          quickbooks_expires_at?: string | null
          quickbooks_realm_id?: string | null
          quickbooks_refresh_token?: string | null
          settings?: Json | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_mapping?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          quickbooks_access_token?: string | null
          quickbooks_connected_at?: string | null
          quickbooks_expires_at?: string | null
          quickbooks_realm_id?: string | null
          quickbooks_refresh_token?: string | null
          settings?: Json | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      recognition_schedules: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          journal_entry_id: string | null
          organization_id: string
          posted: boolean
          posted_at: string | null
          posted_by: string | null
          recognition_amount: number
          recognition_month: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          organization_id: string
          posted?: boolean
          posted_at?: string | null
          posted_by?: string | null
          recognition_amount: number
          recognition_month: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          journal_entry_id?: string | null
          organization_id?: string
          posted?: boolean
          posted_at?: string | null
          posted_by?: string | null
          recognition_amount?: number
          recognition_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognition_schedules_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recognition_schedules_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_account_ids: {
        Args: { p_user_id: string }
        Returns: {
          account_id: string
        }[]
      }
      user_is_owner_or_admin: {
        Args: { p_account_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
