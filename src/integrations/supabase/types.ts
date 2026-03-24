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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      checklist_instance_assignees: {
        Row: {
          created_at: string
          id: string
          instance_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_instance_assignees_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "checklist_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_instances: {
        Row: {
          ano: number
          created_at: string
          descricao_override: string | null
          id: string
          is_group: boolean
          link_override: string | null
          mes: number
          ordem_override: number | null
          parent_id: string | null
          semana: number
          status: string
          template_id: string | null
          tipo_item: string
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          descricao_override?: string | null
          id?: string
          is_group?: boolean
          link_override?: string | null
          mes: number
          ordem_override?: number | null
          parent_id?: string | null
          semana: number
          status?: string
          template_id?: string | null
          tipo_item?: string
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          descricao_override?: string | null
          id?: string
          is_group?: boolean
          link_override?: string | null
          mes?: number
          ordem_override?: number | null
          parent_id?: string | null
          semana?: number
          status?: string
          template_id?: string | null
          tipo_item?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_instances_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "checklist_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_item_assignees: {
        Row: {
          checklist_item_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          checklist_item_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          checklist_item_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_item_assignees_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_item_completions: {
        Row: {
          checklist_item_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist_item_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checklist_item_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_item_completions_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          ano: number
          concluido: boolean
          created_at: string
          id: string
          link: string | null
          mes: number
          ordem: number
          semana: number
          status: string
          texto: string
          updated_at: string
        }
        Insert: {
          ano?: number
          concluido?: boolean
          created_at?: string
          id?: string
          link?: string | null
          mes?: number
          ordem?: number
          semana: number
          status?: string
          texto: string
          updated_at?: string
        }
        Update: {
          ano?: number
          concluido?: boolean
          created_at?: string
          id?: string
          link?: string | null
          mes?: number
          ordem?: number
          semana?: number
          status?: string
          texto?: string
          updated_at?: string
        }
        Relationships: []
      }
      checklist_template_assignees: {
        Row: {
          created_at: string
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_assignees_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          id: string
          link_default: string | null
          ordem_global: number
          semanas_aplicaveis: number[]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao: string
          id?: string
          link_default?: string | null
          ordem_global?: number
          semanas_aplicaveis?: number[]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          id?: string
          link_default?: string | null
          ordem_global?: number
          semanas_aplicaveis?: number[]
          updated_at?: string
        }
        Relationships: []
      }
      checklist_timers: {
        Row: {
          accumulated_seconds: number
          ano: number
          created_at: string | null
          duration_seconds: number | null
          id: string
          merged_weeks: number[] | null
          mes: number
          paused_at: string | null
          semana: number
          started_at: string
          started_by: string | null
          stopped_at: string | null
        }
        Insert: {
          accumulated_seconds?: number
          ano: number
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          merged_weeks?: number[] | null
          mes: number
          paused_at?: string | null
          semana: number
          started_at?: string
          started_by?: string | null
          stopped_at?: string | null
        }
        Update: {
          accumulated_seconds?: number
          ano?: number
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          merged_weeks?: number[] | null
          mes?: number
          paused_at?: string | null
          semana?: number
          started_at?: string
          started_by?: string | null
          stopped_at?: string | null
        }
        Relationships: []
      }
      demandas: {
        Row: {
          ano: number
          ativa: boolean
          created_at: string
          data_limite: string | null
          descricao: string
          grupo_id: string | null
          id: string
          mes: number
          muito_urgente: boolean
          numero: number
          prioritaria: boolean
          responsavel_id: string
          semana_limite: number[]
          semanas_repeticao: number
          setor_id: string | null
          status_gestor: Database["public"]["Enums"]["status_bolinha"]
          status_responsavel: Database["public"]["Enums"]["status_bolinha"]
          updated_at: string
        }
        Insert: {
          ano: number
          ativa?: boolean
          created_at?: string
          data_limite?: string | null
          descricao: string
          grupo_id?: string | null
          id?: string
          mes: number
          muito_urgente?: boolean
          numero?: number
          prioritaria?: boolean
          responsavel_id: string
          semana_limite?: number[]
          semanas_repeticao?: number
          setor_id?: string | null
          status_gestor?: Database["public"]["Enums"]["status_bolinha"]
          status_responsavel?: Database["public"]["Enums"]["status_bolinha"]
          updated_at?: string
        }
        Update: {
          ano?: number
          ativa?: boolean
          created_at?: string
          data_limite?: string | null
          descricao?: string
          grupo_id?: string | null
          id?: string
          mes?: number
          muito_urgente?: boolean
          numero?: number
          prioritaria?: boolean
          responsavel_id?: string
          semana_limite?: number[]
          semanas_repeticao?: number
          setor_id?: string | null
          status_gestor?: Database["public"]["Enums"]["status_bolinha"]
          status_responsavel?: Database["public"]["Enums"]["status_bolinha"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandas_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      momento_apt_settings: {
        Row: {
          ano: number
          bloqueado: boolean
          bloqueado_em: string | null
          bloqueado_por: string | null
          created_at: string
          id: string
          mes: number
          updated_at: string
        }
        Insert: {
          ano: number
          bloqueado?: boolean
          bloqueado_em?: string | null
          bloqueado_por?: string | null
          created_at?: string
          id?: string
          mes: number
          updated_at?: string
        }
        Update: {
          ano?: number
          bloqueado?: boolean
          bloqueado_em?: string | null
          bloqueado_por?: string | null
          created_at?: string
          id?: string
          mes?: number
          updated_at?: string
        }
        Relationships: []
      }
      month_settings: {
        Row: {
          ano: number
          created_at: string
          id: string
          mes: number
          status_ativo: boolean
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          id?: string
          mes: number
          status_ativo?: boolean
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          mes?: number
          status_ativo?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cor: string | null
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          email: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      setores: {
        Row: {
          cor: string | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      solicitacoes_exclusao: {
        Row: {
          created_at: string
          decided_at: string | null
          decisor_id: string | null
          demanda_id: string
          grupo_id: string | null
          id: string
          justificativa: string
          justificativa_recusa: string | null
          solicitante_id: string
          status: string
          tipo_exclusao: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decisor_id?: string | null
          demanda_id: string
          grupo_id?: string | null
          id?: string
          justificativa: string
          justificativa_recusa?: string | null
          solicitante_id: string
          status?: string
          tipo_exclusao?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decisor_id?: string | null
          demanda_id?: string
          grupo_id?: string | null
          id?: string
          justificativa?: string
          justificativa_recusa?: string | null
          solicitante_id?: string
          status?: string
          tipo_exclusao?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_exclusao_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_gestor_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "gestor" | "colaborador"
      status_bolinha: "pendente" | "executado" | "nao_realizado"
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
      app_role: ["admin", "gestor", "colaborador"],
      status_bolinha: ["pendente", "executado", "nao_realizado"],
    },
  },
} as const
