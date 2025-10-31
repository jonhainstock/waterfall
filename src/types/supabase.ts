/**
 * Supabase Database Types
 *
 * Auto-generated types for Supabase tables and views.
 * Run `pnpm supabase:types` to regenerate from your Supabase project.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          name: string
          account_type: 'company' | 'firm'
          subscription_tier: 'free' | 'starter' | 'pro'
          subscription_status: 'trial' | 'active' | 'cancelled'
          trial_ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          account_type: 'company' | 'firm'
          subscription_tier?: 'free' | 'starter' | 'pro'
          subscription_status?: 'trial' | 'active' | 'cancelled'
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          account_type?: 'company' | 'firm'
          subscription_tier?: 'free' | 'starter' | 'pro'
          subscription_status?: 'trial' | 'active' | 'cancelled'
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      account_users: {
        Row: {
          id: string
          account_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          account_id: string
          name: string
          slug: string | null
          quickbooks_realm_id: string | null
          quickbooks_access_token: string | null
          quickbooks_refresh_token: string | null
          quickbooks_expires_at: string | null
          quickbooks_connected_at: string | null
          account_mapping: Json
          settings: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          name: string
          slug?: string | null
          quickbooks_realm_id?: string | null
          quickbooks_access_token?: string | null
          quickbooks_refresh_token?: string | null
          quickbooks_expires_at?: string | null
          quickbooks_connected_at?: string | null
          account_mapping?: Json
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          name?: string
          slug?: string | null
          quickbooks_realm_id?: string | null
          quickbooks_access_token?: string | null
          quickbooks_refresh_token?: string | null
          quickbooks_expires_at?: string | null
          quickbooks_connected_at?: string | null
          account_mapping?: Json
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      contracts: {
        Row: {
          id: string
          organization_id: string
          invoice_id: string
          customer_name: string | null
          description: string | null
          contract_amount: number
          start_date: string
          end_date: string
          term_months: number
          monthly_recognition: number
          status: 'active' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          invoice_id: string
          customer_name?: string | null
          description?: string | null
          contract_amount: number
          start_date: string
          end_date: string
          term_months: number
          monthly_recognition: number
          status?: 'active' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          invoice_id?: string
          customer_name?: string | null
          description?: string | null
          contract_amount?: number
          start_date?: string
          end_date?: string
          term_months?: number
          monthly_recognition?: number
          status?: 'active' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      recognition_schedules: {
        Row: {
          id: string
          contract_id: string
          organization_id: string
          recognition_month: string
          recognition_amount: number
          journal_entry_id: string | null
          posted: boolean
          posted_at: string | null
          posted_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          organization_id: string
          recognition_month: string
          recognition_amount: number
          journal_entry_id?: string | null
          posted?: boolean
          posted_at?: string | null
          posted_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          contract_id?: string
          organization_id?: string
          recognition_month?: string
          recognition_amount?: number
          journal_entry_id?: string | null
          posted?: boolean
          posted_at?: string | null
          posted_by?: string | null
          created_at?: string
        }
      }
      import_logs: {
        Row: {
          id: string
          organization_id: string
          imported_by: string
          filename: string
          rows_processed: number
          rows_succeeded: number
          rows_failed: number
          error_details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          imported_by: string
          filename: string
          rows_processed: number
          rows_succeeded: number
          rows_failed: number
          error_details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          imported_by?: string
          filename?: string
          rows_processed?: number
          rows_succeeded?: number
          rows_failed?: number
          error_details?: Json | null
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
