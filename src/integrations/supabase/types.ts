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
      backlog_anexos: {
        Row: {
          backlog_item_id: string
          created_at: string
          id: string
          nome_arquivo: string
          tamanho: number
          tipo_arquivo: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          backlog_item_id: string
          created_at?: string
          id?: string
          nome_arquivo: string
          tamanho: number
          tipo_arquivo: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          backlog_item_id?: string
          created_at?: string
          id?: string
          nome_arquivo?: string
          tamanho?: number
          tipo_arquivo?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "backlog_anexos_backlog_item_id_fkey"
            columns: ["backlog_item_id"]
            isOneToOne: false
            referencedRelation: "backlog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlog_anexos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backlog_changelog: {
        Row: {
          acao: string
          backlog_item_id: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          observacao: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          backlog_item_id: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          observacao?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          backlog_item_id?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          observacao?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backlog_changelog_backlog_item_id_fkey"
            columns: ["backlog_item_id"]
            isOneToOne: false
            referencedRelation: "backlog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlog_changelog_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backlog_item_modulos: {
        Row: {
          backlog_item_id: string
          id: string
          modulo_id: string
        }
        Insert: {
          backlog_item_id: string
          id?: string
          modulo_id: string
        }
        Update: {
          backlog_item_id?: string
          id?: string
          modulo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backlog_item_modulos_backlog_item_id_fkey"
            columns: ["backlog_item_id"]
            isOneToOne: false
            referencedRelation: "backlog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlog_item_modulos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "backlog_modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      backlog_items: {
        Row: {
          categoria: Database["public"]["Enums"]["backlog_categoria"]
          created_at: string
          data_conclusao: string | null
          data_inicio_implementacao: string | null
          data_lancamento: string | null
          dependente_de_creditos: boolean
          descricao_detalhada: string | null
          estimativa_esforco: Database["public"]["Enums"]["backlog_esforco"]
          id: string
          impacto_esperado: Database["public"]["Enums"]["backlog_impacto"]
          numero: number
          prioridade: Database["public"]["Enums"]["backlog_prioridade"]
          projeto_id: string
          responsavel_produto_id: string | null
          responsavel_tecnico_id: string | null
          status: Database["public"]["Enums"]["backlog_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria: Database["public"]["Enums"]["backlog_categoria"]
          created_at?: string
          data_conclusao?: string | null
          data_inicio_implementacao?: string | null
          data_lancamento?: string | null
          dependente_de_creditos?: boolean
          descricao_detalhada?: string | null
          estimativa_esforco?: Database["public"]["Enums"]["backlog_esforco"]
          id?: string
          impacto_esperado?: Database["public"]["Enums"]["backlog_impacto"]
          numero?: number
          prioridade?: Database["public"]["Enums"]["backlog_prioridade"]
          projeto_id: string
          responsavel_produto_id?: string | null
          responsavel_tecnico_id?: string | null
          status?: Database["public"]["Enums"]["backlog_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["backlog_categoria"]
          created_at?: string
          data_conclusao?: string | null
          data_inicio_implementacao?: string | null
          data_lancamento?: string | null
          dependente_de_creditos?: boolean
          descricao_detalhada?: string | null
          estimativa_esforco?: Database["public"]["Enums"]["backlog_esforco"]
          id?: string
          impacto_esperado?: Database["public"]["Enums"]["backlog_impacto"]
          numero?: number
          prioridade?: Database["public"]["Enums"]["backlog_prioridade"]
          projeto_id?: string
          responsavel_produto_id?: string | null
          responsavel_tecnico_id?: string | null
          status?: Database["public"]["Enums"]["backlog_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backlog_items_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "backlog_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlog_items_responsavel_produto_id_fkey"
            columns: ["responsavel_produto_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlog_items_responsavel_tecnico_id_fkey"
            columns: ["responsavel_tecnico_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backlog_modulos: {
        Row: {
          created_at: string
          id: string
          nome: string
          projeto_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          projeto_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          projeto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backlog_modulos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "backlog_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      backlog_projetos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      backlog_registros_implementacao: {
        Row: {
          backlog_item_id: string
          created_at: string
          data: string
          descricao: string
          id: string
          responsavel_id: string | null
          status: Database["public"]["Enums"]["backlog_registro_status"]
        }
        Insert: {
          backlog_item_id: string
          created_at?: string
          data?: string
          descricao: string
          id?: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["backlog_registro_status"]
        }
        Update: {
          backlog_item_id?: string
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["backlog_registro_status"]
        }
        Relationships: [
          {
            foreignKeyName: "backlog_registros_implementacao_backlog_item_id_fkey"
            columns: ["backlog_item_id"]
            isOneToOne: false
            referencedRelation: "backlog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlog_registros_implementacao_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backlog_validacoes: {
        Row: {
          backlog_item_id: string
          created_at: string
          data_validacao: string
          id: string
          observacoes: string | null
          tipo_validacao: Database["public"]["Enums"]["backlog_tipo_validacao"]
          validado: boolean
          validado_por: string | null
        }
        Insert: {
          backlog_item_id: string
          created_at?: string
          data_validacao?: string
          id?: string
          observacoes?: string | null
          tipo_validacao: Database["public"]["Enums"]["backlog_tipo_validacao"]
          validado?: boolean
          validado_por?: string | null
        }
        Update: {
          backlog_item_id?: string
          created_at?: string
          data_validacao?: string
          id?: string
          observacoes?: string | null
          tipo_validacao?: Database["public"]["Enums"]["backlog_tipo_validacao"]
          validado?: boolean
          validado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backlog_validacoes_backlog_item_id_fkey"
            columns: ["backlog_item_id"]
            isOneToOne: false
            referencedRelation: "backlog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backlog_validacoes_validado_por_fkey"
            columns: ["validado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      notification_dismissals: {
        Row: {
          dismissed_at: string
          id: string
          notification_id: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          id?: string
          notification_id: string
          user_id: string
        }
        Update: {
          dismissed_at?: string
          id?: string
          notification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_dismissals_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          ano: number
          created_at: string
          gestor_id: string
          gestor_nome: string
          id: string
          mensagem: string
          mes: number
          responsavel_id: string
          semana: number
          tipo: string
        }
        Insert: {
          ano: number
          created_at?: string
          gestor_id: string
          gestor_nome: string
          id?: string
          mensagem: string
          mes: number
          responsavel_id: string
          semana: number
          tipo?: string
        }
        Update: {
          ano?: number
          created_at?: string
          gestor_id?: string
          gestor_nome?: string
          id?: string
          mensagem?: string
          mes?: number
          responsavel_id?: string
          semana?: number
          tipo?: string
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
      cleanup_old_notifications: { Args: never; Returns: undefined }
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
      backlog_categoria:
        | "nova_funcionalidade"
        | "melhoria"
        | "correcao_bug"
        | "ajuste_tecnico"
        | "ux_ui"
        | "relatorios"
        | "seguranca"
        | "infraestrutura"
      backlog_esforco: "pequeno" | "medio" | "grande"
      backlog_impacto: "baixo" | "medio" | "alto"
      backlog_prioridade: "alta" | "media" | "baixa"
      backlog_registro_status: "executado" | "nao_executado"
      backlog_status:
        | "ideia"
        | "em_analise"
        | "refinado"
        | "aguardando_recursos"
        | "em_implementacao"
        | "em_testes"
        | "implementado"
        | "lancado"
        | "validado"
        | "arquivado"
      backlog_tipo_validacao:
        | "teste_funcional"
        | "validacao_visual"
        | "validacao_tecnica"
        | "regra_negocio"
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
      backlog_categoria: [
        "nova_funcionalidade",
        "melhoria",
        "correcao_bug",
        "ajuste_tecnico",
        "ux_ui",
        "relatorios",
        "seguranca",
        "infraestrutura",
      ],
      backlog_esforco: ["pequeno", "medio", "grande"],
      backlog_impacto: ["baixo", "medio", "alto"],
      backlog_prioridade: ["alta", "media", "baixa"],
      backlog_registro_status: ["executado", "nao_executado"],
      backlog_status: [
        "ideia",
        "em_analise",
        "refinado",
        "aguardando_recursos",
        "em_implementacao",
        "em_testes",
        "implementado",
        "lancado",
        "validado",
        "arquivado",
      ],
      backlog_tipo_validacao: [
        "teste_funcional",
        "validacao_visual",
        "validacao_tecnica",
        "regra_negocio",
      ],
      status_bolinha: ["pendente", "executado", "nao_realizado"],
    },
  },
} as const
