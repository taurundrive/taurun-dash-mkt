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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cac_monthly: {
        Row: {
          closed_sales: number
          created_at: string
          general_avg_ticket: number
          id: string
          leads_closed_sales: number
          month: string
          paid_leads: number
          paid_revenue: number
          source: string | null
          updated_at: string
        }
        Insert: {
          closed_sales?: number
          created_at?: string
          general_avg_ticket?: number
          id?: string
          leads_closed_sales?: number
          month: string
          paid_leads?: number
          paid_revenue?: number
          source?: string | null
          updated_at?: string
        }
        Update: {
          closed_sales?: number
          created_at?: string
          general_avg_ticket?: number
          id?: string
          leads_closed_sales?: number
          month?: string
          paid_leads?: number
          paid_revenue?: number
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      campaigns_daily: {
        Row: {
          batch_id: string | null
          campanha: string
          cliques: number
          created_at: string
          custo_por_clique: number
          data: string
          id: string
          objetivo: string | null
          range_end: string | null
          range_start: string | null
          resultado: number
          valor_usado: number
        }
        Insert: {
          batch_id?: string | null
          campanha: string
          cliques?: number
          created_at?: string
          custo_por_clique?: number
          data: string
          id?: string
          objetivo?: string | null
          range_end?: string | null
          range_start?: string | null
          resultado?: number
          valor_usado?: number
        }
        Update: {
          batch_id?: string | null
          campanha?: string
          cliques?: number
          created_at?: string
          custo_por_clique?: number
          data?: string
          id?: string
          objetivo?: string | null
          range_end?: string | null
          range_start?: string | null
          resultado?: number
          valor_usado?: number
        }
        Relationships: []
      }
      instagram_metrics_daily: {
        Row: {
          comments: number
          created_at: string
          date: string
          followers: number
          id: string
          impressions: number
          likes: number
          posts_published: number
          profile_views: number
          reach: number
          saves: number
          shares: number
          source: string
          updated_at: string
          website_clicks: number
        }
        Insert: {
          comments?: number
          created_at?: string
          date: string
          followers?: number
          id?: string
          impressions?: number
          likes?: number
          posts_published?: number
          profile_views?: number
          reach?: number
          saves?: number
          shares?: number
          source?: string
          updated_at?: string
          website_clicks?: number
        }
        Update: {
          comments?: number
          created_at?: string
          date?: string
          followers?: number
          id?: string
          impressions?: number
          likes?: number
          posts_published?: number
          profile_views?: number
          reach?: number
          saves?: number
          shares?: number
          source?: string
          updated_at?: string
          website_clicks?: number
        }
        Relationships: []
      }
      sales_monthly: {
        Row: {
          created_at: string
          id: string
          month: string
          source: string | null
          total_sales: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          source?: string | null
          total_sales?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          source?: string | null
          total_sales?: number
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_leads: {
        Row: {
          created_at: string
          data_lead: string
          id: string
          mensagem: string | null
          nome: string | null
          raw: Json | null
          source: string
          telefone: string | null
          vendedor: string | null
        }
        Insert: {
          created_at?: string
          data_lead?: string
          id?: string
          mensagem?: string | null
          nome?: string | null
          raw?: Json | null
          source?: string
          telefone?: string | null
          vendedor?: string | null
        }
        Update: {
          created_at?: string
          data_lead?: string
          id?: string
          mensagem?: string | null
          nome?: string | null
          raw?: Json | null
          source?: string
          telefone?: string | null
          vendedor?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
