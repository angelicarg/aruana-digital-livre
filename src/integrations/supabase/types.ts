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
      intranet_clients: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          company: string | null
          email: string | null
          phone: string | null
          status: "lead" | "prospect" | "active" | "paused" | "past"
          source: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          company?: string | null
          email?: string | null
          phone?: string | null
          status?: "lead" | "prospect" | "active" | "paused" | "past"
          source?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          company?: string | null
          email?: string | null
          phone?: string | null
          status?: "lead" | "prospect" | "active" | "paused" | "past"
          source?: string | null
          notes?: string | null
        }
        Relationships: []
      }
      intranet_projects: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          client_id: string
          name: string
          package_tier: "essencial" | "profissional" | "avancado" | "sob_medida" | null
          status: "proposta" | "em_andamento" | "pausado" | "concluido" | "cancelado"
          setup_value: number | null
          monthly_value: number | null
          start_date: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          client_id: string
          name: string
          package_tier?: "essencial" | "profissional" | "avancado" | "sob_medida" | null
          status?: "proposta" | "em_andamento" | "pausado" | "concluido" | "cancelado"
          setup_value?: number | null
          monthly_value?: number | null
          start_date?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          client_id?: string
          name?: string
          package_tier?: "essencial" | "profissional" | "avancado" | "sob_medida" | null
          status?: "proposta" | "em_andamento" | "pausado" | "concluido" | "cancelado"
          setup_value?: number | null
          monthly_value?: number | null
          start_date?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intranet_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "intranet_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      intranet_transactions: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          client_id: string | null
          project_id: string | null
          type: "receita" | "despesa"
          description: string
          amount: number
          due_date: string | null
          paid_date: string | null
          status: "pendente" | "pago" | "atrasado" | "cancelado"
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          client_id?: string | null
          project_id?: string | null
          type: "receita" | "despesa"
          description: string
          amount: number
          due_date?: string | null
          paid_date?: string | null
          status?: "pendente" | "pago" | "atrasado" | "cancelado"
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          client_id?: string | null
          project_id?: string | null
          type?: "receita" | "despesa"
          description?: string
          amount?: number
          due_date?: string | null
          paid_date?: string | null
          status?: "pendente" | "pago" | "atrasado" | "cancelado"
        }
        Relationships: [
          {
            foreignKeyName: "intranet_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "intranet_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intranet_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "intranet_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      intranet_meetings: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          client_id: string | null
          title: string
          meeting_type: "prospeccao" | "andamento" | "outro"
          scheduled_at: string
          status: "agendado" | "realizado" | "cancelado"
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          client_id?: string | null
          title: string
          meeting_type?: "prospeccao" | "andamento" | "outro"
          scheduled_at: string
          status?: "agendado" | "realizado" | "cancelado"
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          client_id?: string | null
          title?: string
          meeting_type?: "prospeccao" | "andamento" | "outro"
          scheduled_at?: string
          status?: "agendado" | "realizado" | "cancelado"
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intranet_meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "intranet_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      intranet_documents: {
        Row: {
          id: string
          created_at: string
          client_id: string | null
          project_id: string | null
          name: string
          category: "contrato" | "proposta" | "outro"
          storage_path: string
        }
        Insert: {
          id?: string
          created_at?: string
          client_id?: string | null
          project_id?: string | null
          name: string
          category?: "contrato" | "proposta" | "outro"
          storage_path: string
        }
        Update: {
          id?: string
          created_at?: string
          client_id?: string | null
          project_id?: string | null
          name?: string
          category?: "contrato" | "proposta" | "outro"
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "intranet_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "intranet_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intranet_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "intranet_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          id: string
          created_at: string
          nome: string
          whatsapp: string
          email: string | null
          tipo_negocio: string
          precisa_agendamento: boolean
          interesse_avancado: "nenhum" | "loja" | "loja_ia" | "sob_medida"
          tem_site: boolean | null
          pacote_sugerido: "essencial" | "profissional" | "avancado" | "sob_medida"
          origem: "banner" | "simulador"
          status: "novo" | "contatado" | "convertido" | "descartado"
        }
        Insert: {
          id?: string
          created_at?: string
          nome: string
          whatsapp: string
          email?: string | null
          tipo_negocio: string
          precisa_agendamento: boolean
          interesse_avancado: "nenhum" | "loja" | "loja_ia" | "sob_medida"
          tem_site?: boolean | null
          pacote_sugerido: "essencial" | "profissional" | "avancado" | "sob_medida"
          origem?: "banner" | "simulador"
          status?: "novo" | "contatado" | "convertido" | "descartado"
        }
        Update: {
          id?: string
          created_at?: string
          nome?: string
          whatsapp?: string
          email?: string | null
          tipo_negocio?: string
          precisa_agendamento?: boolean
          interesse_avancado?: "nenhum" | "loja" | "loja_ia" | "sob_medida"
          tem_site?: boolean | null
          pacote_sugerido?: "essencial" | "profissional" | "avancado" | "sob_medida"
          origem?: "banner" | "simulador"
          status?: "novo" | "contatado" | "convertido" | "descartado"
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
