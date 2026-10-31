import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DemandStatus, Role, SectorMessage, Employee, TeamAllocation } from '../types';

type AccountStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

interface Database {
  public: {
    Tables: {
      employees: { Row: Employee; Insert: never; Update: never; Relationships: [] };
      team_allocations: { Row: TeamAllocation; Insert: never; Update: never; Relationships: [] };
      sector_messages: {
        Row: SectorMessage;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: Role;
          department: string;
          status: AccountStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: Role;
          department?: string;
          status?: AccountStatus;
        };
        Update: {
          role?: Role;
          department?: string;
          status?: AccountStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      demands: {
        Row: {
          id: string;
          status: DemandStatus;
        };
        Insert: {
          client_name: string;
          title: string;
          description: string;
          budget_total: number;
          commercial_responsible_id: string;
        };
        Update: {
          status?: DemandStatus;
          payment_terms?: string | null;
          invoiced_value?: number | null;
          cost_estimate?: number | null;
          financial_approved?: boolean;
          required_roles?: string[];
          assigned_staff_count?: number;
          rh_approved?: boolean;
        };
        Relationships: [];
      };
      demand_history: {
        Row: {
          id: string;
          demand_id: string;
          timestamp: string;
          author_id: string | null;
          author_name: string;
          department: string;
          action: string;
          details: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      save_employee: {
        Args: { p_id: string | null; p_name: string; p_job_title: string; p_skills: string[]; p_capacity: number; p_active: boolean };
        Returns: string;
      };
      allocate_employee: {
        Args: { p_employee: string; p_demand: string; p_role: string; p_start: string; p_end: string; p_dedication: number };
        Returns: string;
      };
      cancel_team_allocation: { Args: { p_id: string; p_reason: string }; Returns: undefined };
      confirm_hr_team: { Args: { p_demand: string; p_note: string }; Returns: undefined };
      send_sector_message: {
        Args: { p_demand_id: string | null; p_scope: string; p_kind: string; p_body: string };
        Returns: string;
      };
      review_demand_with_note: {
        Args: { p_id: string; p_action: string; p_note: string; p_data: Record<string, string | number | boolean | string[]> };
        Returns: undefined;
      };
      get_visible_demands: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          code: string;
          client_name: string;
          title: string;
          description: string;
          status: DemandStatus;
          budget_total: number | null;
          commercial_responsible_id: string;
          payment_terms: string | null;
          invoiced_value: number | null;
          cost_estimate: number | null;
          financial_approved: boolean | null;
          required_roles: string[] | null;
          assigned_staff_count: number | null;
          rh_approved: boolean | null;
          created_at: string;
          updated_at: string;
        }[];
      };
      get_visible_demand_history: {
        Args: { p_demand_id: string };
        Returns: {
          id: string;
          demand_id: string;
          timestamp: string;
          author_id: string | null;
          author_name: string;
          department: string;
          action: string;
          details: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

let client: SupabaseClient<Database> | undefined;

export const getSupabase = (): SupabaseClient<Database> => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error('Supabase não configurado. Preencha frontend/.env.local a partir de frontend/.env.example.');
  }
  if (!client) {
    client = createClient<Database>(url, publishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
};
