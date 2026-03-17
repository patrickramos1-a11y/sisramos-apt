import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export type BacklogCategoria = 
  | 'nova_funcionalidade' 
  | 'melhoria' 
  | 'correcao_bug' 
  | 'ajuste_tecnico' 
  | 'ux_ui' 
  | 'relatorios' 
  | 'seguranca' 
  | 'infraestrutura';

export type BacklogStatus = 
  | 'ideia' 
  | 'em_analise' 
  | 'refinado' 
  | 'aguardando_recursos' 
  | 'em_implementacao' 
  | 'em_testes' 
  | 'implementado' 
  | 'lancado' 
  | 'validado' 
  | 'arquivado';

export type BacklogPrioridade = 'alta' | 'media' | 'baixa';
export type BacklogImpacto = 'baixo' | 'medio' | 'alto';
export type BacklogEsforco = 'pequeno' | 'medio' | 'grande';
export type BacklogRegistroStatus = 'executado' | 'nao_executado';
export type BacklogTipoValidacao = 'teste_funcional' | 'validacao_visual' | 'validacao_tecnica' | 'regra_negocio';

export interface BacklogProjeto {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface BacklogModulo {
  id: string;
  projeto_id: string;
  nome: string;
  created_at: string;
}

export interface BacklogItem {
  id: string;
  numero: number;
  titulo: string;
  projeto_id: string;
  categoria: BacklogCategoria;
  descricao_detalhada: string | null;
  status: BacklogStatus;
  prioridade: BacklogPrioridade;
  impacto_esperado: BacklogImpacto;
  estimativa_esforco: BacklogEsforco;
  dependente_de_creditos: boolean;
  responsavel_produto_id: string | null;
  responsavel_tecnico_id: string | null;
  data_inicio_implementacao: string | null;
  data_conclusao: string | null;
  data_lancamento: string | null;
  created_at: string;
  updated_at: string;
  projeto?: BacklogProjeto;
  modulos?: BacklogModulo[];
  responsavel_produto?: { id: string; nome: string; cor: string | null };
  responsavel_tecnico?: { id: string; nome: string; cor: string | null };
}

export interface BacklogChangelog {
  id: string;
  backlog_item_id: string;
  usuario_id: string | null;
  acao: string;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  observacao: string | null;
  created_at: string;
  usuario?: { nome: string };
}

export interface BacklogAnexo {
  id: string;
  backlog_item_id: string;
  nome_arquivo: string;
  url: string;
  tipo_arquivo: string;
  tamanho: number;
  uploaded_by: string | null;
  created_at: string;
}

export interface BacklogRegistroImplementacao {
  id: string;
  backlog_item_id: string;
  descricao: string;
  responsavel_id: string | null;
  status: BacklogRegistroStatus;
  data: string;
  created_at: string;
  responsavel?: { nome: string };
}

export interface BacklogValidacao {
  id: string;
  backlog_item_id: string;
  validado: boolean;
  tipo_validacao: BacklogTipoValidacao;
  validado_por: string | null;
  data_validacao: string;
  observacoes: string | null;
  created_at: string;
  validador?: { nome: string };
}

export const CATEGORIAS_LABELS: Record<BacklogCategoria, string> = {
  nova_funcionalidade: "Nova Funcionalidade",
  melhoria: "Melhoria de Funcionalidade",
  correcao_bug: "Correção / Bug",
  ajuste_tecnico: "Ajuste Técnico / Performance",
  ux_ui: "UX / UI / Visual",
  relatorios: "Relatórios / Indicadores",
  seguranca: "Segurança / Permissões",
  infraestrutura: "Infraestrutura / Créditos"
};

export const STATUS_LABELS: Record<BacklogStatus, string> = {
  ideia: "Ideia / Proposta",
  em_analise: "Em Análise",
  refinado: "Refinado",
  aguardando_recursos: "Aguardando Recursos",
  em_implementacao: "Em Implementação",
  em_testes: "Em Testes",
  implementado: "Implementado",
  lancado: "Lançado",
  validado: "Validado",
  arquivado: "Arquivado"
};

export const PRIORIDADE_LABELS: Record<BacklogPrioridade, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa"
};

export const IMPACTO_LABELS: Record<BacklogImpacto, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto"
};

export const ESFORCO_LABELS: Record<BacklogEsforco, string> = {
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande"
};

export const TIPO_VALIDACAO_LABELS: Record<BacklogTipoValidacao, string> = {
  teste_funcional: "Teste Funcional",
  validacao_visual: "Validação Visual",
  validacao_tecnica: "Validação Técnica",
  regra_negocio: "Regra de Negócio"
};

export function useBacklogProjetos() {
  return useQuery({
    queryKey: ["backlog-projetos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_projetos")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      
      if (error) throw error;
      return data as BacklogProjeto[];
    }
  });
}

export function useBacklogModulos(projetoId?: string) {
  return useQuery({
    queryKey: ["backlog-modulos", projetoId],
    queryFn: async () => {
      let query = supabase.from("backlog_modulos").select("*").order("nome");
      
      if (projetoId) {
        query = query.eq("projeto_id", projetoId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as BacklogModulo[];
    },
    enabled: projetoId ? true : false
  });
}

export function useBacklogItems(filters?: {
  projetoIds?: string[];
  categorias?: string[];
  statuses?: string[];
  prioridades?: string[];
  dependenteCreditos?: boolean;
  search?: string;
}) {
  return useQuery({
    queryKey: ["backlog-items", filters],
    queryFn: async () => {
      let query = supabase
        .from("backlog_items")
        .select(`
          *,
          projeto:backlog_projetos(id, nome),
          responsavel_produto:profiles!backlog_items_responsavel_produto_id_fkey(id, nome, cor),
          responsavel_tecnico:profiles!backlog_items_responsavel_tecnico_id_fkey(id, nome, cor)
        `)
        .order("numero", { ascending: false });

      if (filters?.projetoIds && filters.projetoIds.length > 0) {
        query = query.in("projeto_id", filters.projetoIds);
      }
      if (filters?.categorias && filters.categorias.length > 0) {
        query = query.in("categoria", filters.categorias);
      }
      if (filters?.statuses && filters.statuses.length > 0) {
        query = query.in("status", filters.statuses);
      }
      if (filters?.prioridades && filters.prioridades.length > 0) {
        query = query.in("prioridade", filters.prioridades);
      }
      if (filters?.dependenteCreditos !== undefined) {
        query = query.eq("dependente_de_creditos", filters.dependenteCreditos);
      }
      if (filters?.search) {
        query = query.or(`titulo.ilike.%${filters.search}%,descricao_detalhada.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BacklogItem[];
    }
  });
}

export function useBacklogItem(id: string) {
  return useQuery({
    queryKey: ["backlog-item", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_items")
        .select(`
          *,
          projeto:backlog_projetos(id, nome),
          responsavel_produto:profiles!backlog_items_responsavel_produto_id_fkey(id, nome, cor),
          responsavel_tecnico:profiles!backlog_items_responsavel_tecnico_id_fkey(id, nome, cor)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as BacklogItem | null;
    },
    enabled: !!id
  });
}

export function useBacklogChangelog(itemId: string) {
  return useQuery({
    queryKey: ["backlog-changelog", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_changelog")
        .select(`
          *,
          usuario:profiles!backlog_changelog_usuario_id_fkey(nome)
        `)
        .eq("backlog_item_id", itemId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BacklogChangelog[];
    },
    enabled: !!itemId
  });
}

export function useBacklogAnexos(itemId: string) {
  return useQuery({
    queryKey: ["backlog-anexos", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_anexos")
        .select("*")
        .eq("backlog_item_id", itemId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BacklogAnexo[];
    },
    enabled: !!itemId
  });
}

export function useBacklogRegistros(itemId: string) {
  return useQuery({
    queryKey: ["backlog-registros", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_registros_implementacao")
        .select(`
          *,
          responsavel:profiles!backlog_registros_implementacao_responsavel_id_fkey(nome)
        `)
        .eq("backlog_item_id", itemId)
        .order("data", { ascending: false });

      if (error) throw error;
      return data as BacklogRegistroImplementacao[];
    },
    enabled: !!itemId
  });
}

export function useBacklogValidacoes(itemId: string) {
  return useQuery({
    queryKey: ["backlog-validacoes", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_validacoes")
        .select(`
          *,
          validador:profiles!backlog_validacoes_validado_por_fkey(nome)
        `)
        .eq("backlog_item_id", itemId)
        .order("data_validacao", { ascending: false });

      if (error) throw error;
      return data as BacklogValidacao[];
    },
    enabled: !!itemId
  });
}

export function useBacklogStats() {
  return useQuery({
    queryKey: ["backlog-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backlog_items")
        .select("status, dependente_de_creditos");

      if (error) throw error;

      const stats = {
        total: data.length,
        aguardando_recursos: data.filter(i => i.status === "aguardando_recursos").length,
        em_implementacao: data.filter(i => i.status === "em_implementacao").length,
        implementados: data.filter(i => i.status === "implementado").length,
        lancados: data.filter(i => i.status === "lancado").length,
        validados: data.filter(i => i.status === "validado").length,
        dependentes_creditos: data.filter(i => i.dependente_de_creditos).length,
        por_status: {} as Record<BacklogStatus, number>,
      };

      Object.keys(STATUS_LABELS).forEach(status => {
        stats.por_status[status as BacklogStatus] = data.filter(i => i.status === status).length;
      });

      return stats;
    }
  });
}

export function useBacklogMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();

  const registrarChangelog = async (
    itemId: string, 
    acao: string, 
    dadosAnteriores?: Record<string, unknown> | null,
    dadosNovos?: Record<string, unknown> | null,
    observacao?: string
  ) => {
    await supabase.from("backlog_changelog").insert([{
      backlog_item_id: itemId,
      usuario_id: profile?.id || null,
      acao,
      dados_anteriores: dadosAnteriores as unknown as null,
      dados_novos: dadosNovos as unknown as null,
      observacao: observacao || null
    }]);
  };

  const criarProjeto = useMutation({
    mutationFn: async (data: { nome: string; descricao?: string }) => {
      const { data: projeto, error } = await supabase
        .from("backlog_projetos")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return projeto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backlog-projetos"] });
      toast({ title: "Projeto criado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao criar projeto", variant: "destructive" });
    }
  });

  const criarModulo = useMutation({
    mutationFn: async (data: { projeto_id: string; nome: string }) => {
      const { data: modulo, error } = await supabase
        .from("backlog_modulos")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return modulo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backlog-modulos"] });
      toast({ title: "Módulo criado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao criar módulo", variant: "destructive" });
    }
  });

  const criarItem = useMutation({
    mutationFn: async (data: Omit<BacklogItem, "id" | "numero" | "created_at" | "updated_at" | "projeto" | "modulos" | "responsavel_produto" | "responsavel_tecnico">) => {
      const { data: item, error } = await supabase
        .from("backlog_items")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      
      await registrarChangelog(item.id, "criacao", null, data as Record<string, unknown>);
      
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backlog-items"] });
      queryClient.invalidateQueries({ queryKey: ["backlog-stats"] });
      toast({ title: "Item criado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao criar item", variant: "destructive" });
    }
  });

  const atualizarItem = useMutation({
    mutationFn: async ({ id, dados, dadosAnteriores }: { id: string; dados: Partial<BacklogItem>; dadosAnteriores: Partial<BacklogItem> }) => {
      const { error } = await supabase
        .from("backlog_items")
        .update(dados)
        .eq("id", id);

      if (error) throw error;

      // Registrar mudanças específicas no changelog
      const mudancas: string[] = [];
      if (dados.status && dados.status !== dadosAnteriores.status) {
        mudancas.push(`status: ${dadosAnteriores.status} → ${dados.status}`);
      }
      if (dados.prioridade && dados.prioridade !== dadosAnteriores.prioridade) {
        mudancas.push(`prioridade: ${dadosAnteriores.prioridade} → ${dados.prioridade}`);
      }
      
      if (mudancas.length > 0) {
        await registrarChangelog(
          id, 
          "atualizacao", 
          dadosAnteriores as Record<string, unknown>,
          dados as Record<string, unknown>,
          mudancas.join("; ")
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backlog-items"] });
      queryClient.invalidateQueries({ queryKey: ["backlog-item"] });
      queryClient.invalidateQueries({ queryKey: ["backlog-stats"] });
      queryClient.invalidateQueries({ queryKey: ["backlog-changelog"] });
      toast({ title: "Item atualizado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar item", variant: "destructive" });
    }
  });

  const criarRegistro = useMutation({
    mutationFn: async (data: { backlog_item_id: string; descricao: string; status: BacklogRegistroStatus; data: string }) => {
      const { data: registro, error } = await supabase
        .from("backlog_registros_implementacao")
        .insert({ ...data, responsavel_id: profile?.id })
        .select()
        .single();

      if (error) throw error;
      
      await registrarChangelog(data.backlog_item_id, "registro_implementacao", null, data as Record<string, unknown>);
      
      return registro;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backlog-registros"] });
      queryClient.invalidateQueries({ queryKey: ["backlog-changelog"] });
      toast({ title: "Registro adicionado" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar registro", variant: "destructive" });
    }
  });

  const criarValidacao = useMutation({
    mutationFn: async (data: { backlog_item_id: string; tipo_validacao: BacklogTipoValidacao; observacoes?: string }) => {
      const { data: validacao, error } = await supabase
        .from("backlog_validacoes")
        .insert({
          ...data,
          validado: true,
          validado_por: profile?.id
        })
        .select()
        .single();

      if (error) throw error;
      
      await registrarChangelog(data.backlog_item_id, "validacao", null, { ...data, validado: true } as Record<string, unknown>);
      
      return validacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backlog-validacoes"] });
      queryClient.invalidateQueries({ queryKey: ["backlog-changelog"] });
      toast({ title: "Validação registrada" });
    },
    onError: () => {
      toast({ title: "Erro ao registrar validação", variant: "destructive" });
    }
  });

  return {
    criarProjeto,
    criarModulo,
    criarItem,
    atualizarItem,
    criarRegistro,
    criarValidacao
  };
}
