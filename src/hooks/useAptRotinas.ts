import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type AptTipoItem = "demanda_comum" | "rotina_persistente";
export type AptRotinaStatusOcorrencia = "pendente" | "executado" | "nao_realizado";
export type AptRotinaStatusAvaliacao = "pendente" | "aprovado" | "reprovado";

export interface AptRotinaModelo {
  id: string;
  setor_id: string | null;
  nome: string;
  descricao: string;
  responsavel_padrao_id: string | null;
  dias_semana: number[];
  semanas_aplicaveis: number[];
  ativo: boolean;
  exige_aprovacao: boolean;
  entra_calculo_apt: boolean;
  cor: string;
  icone: string;
  origem_demanda_ids?: string[] | null;
  origem_grupo_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AptRotinaOcorrencia {
  id: string;
  modelo_id: string;
  data: string;
  mes: number;
  ano: number;
  semana_apt: number;
  responsavel_id: string | null;
  setor_id: string | null;
  status_execucao: AptRotinaStatusOcorrencia;
  marcado_em: string | null;
  marcado_por: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface AptRotinaAvaliacao {
  id: string;
  modelo_id: string;
  responsavel_id: string | null;
  setor_id: string | null;
  mes: number;
  ano: number;
  momento: number | null;
  semanas_agrupadas: number[];
  previstas: number;
  feitas: number;
  nao_feitas: number;
  percentual: number;
  status_gestor: AptRotinaStatusAvaliacao;
  observacao_gestor: string | null;
  avaliado_em: string | null;
  avaliado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface AptRotinaResumo {
  key: string;
  modelo: AptRotinaModelo;
  responsavel_id: string | null;
  setor_id: string | null;
  ocorrencias: AptRotinaOcorrencia[];
  previstas: number;
  feitas: number;
  nao_feitas: number;
  pendentes: number;
  percentual: number;
  avaliacao?: AptRotinaAvaliacao;
}

interface UseAptRotinasParams {
  mes: number;
  ano: number;
  semanas?: number[];
  momento?: number | null;
  setorId?: string | null;
  enabled?: boolean;
}

interface RotinaModeloPayload {
  setor_id?: string | null;
  nome: string;
  descricao: string;
  responsavel_padrao_id?: string | null;
  dias_semana: number[];
  semanas_aplicaveis: number[];
  ativo?: boolean;
  exige_aprovacao?: boolean;
  entra_calculo_apt?: boolean;
  cor?: string;
  icone?: string;
  origem_demanda_ids?: string[] | null;
  origem_grupo_id?: string | null;
}

const TABLE_MISSING_CODES = new Set(["42P01", "PGRST205"]);
const TABLE_MISSING_RE = /(?:could not find the table|relation\s+["']?public\.apt_rotina_|relation\s+["']?apt_rotina_).*does not exist|apt_rotina_.*schema cache/i;
const EMPTY_WEEKS: number[] = [];
const LOCAL_MODELOS_KEY = "sisramos:apt_rotina_modelos:v1";
const LOCAL_OCORRENCIAS_KEY = "sisramos:apt_rotina_ocorrencias:v1";
const LOCAL_AVALIACOES_KEY = "sisramos:apt_rotina_avaliacoes:v1";

function readLocalArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
}

function writeLocalArray<T>(key: string, rows: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(rows));
}

function removeLocalRowsByModelIds(modelIds: Set<string>) {
  writeLocalArray(
    LOCAL_MODELOS_KEY,
    readLocalArray<AptRotinaModelo>(LOCAL_MODELOS_KEY).filter((modelo) => !modelIds.has(modelo.id))
  );
  writeLocalArray(
    LOCAL_OCORRENCIAS_KEY,
    readLocalArray<AptRotinaOcorrencia>(LOCAL_OCORRENCIAS_KEY).filter((ocorrencia) => !modelIds.has(ocorrencia.modelo_id))
  );
  writeLocalArray(
    LOCAL_AVALIACOES_KEY,
    readLocalArray<AptRotinaAvaliacao>(LOCAL_AVALIACOES_KEY).filter((avaliacao) => !modelIds.has(avaliacao.modelo_id))
  );
}

function normalizeWeeks(semanas: number[] | undefined) {
  return [...new Set(semanas || [])].filter((semana) => semana >= 1 && semana <= 5).sort((a, b) => a - b);
}

function normalizeDiasSemana(dias: number[] | undefined) {
  return [...new Set(dias || [])].filter((dia) => dia >= 0 && dia <= 6).sort((a, b) => a - b);
}

function toDateString(ano: number, mes: number, dia: number) {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function semanaAptDoDia(dia: number) {
  return Math.min(5, Math.ceil(dia / 7));
}

function percentual(feitas: number, previstas: number) {
  if (previstas <= 0) return 0;
  return Math.round((feitas / previstas) * 10000) / 100;
}

function rotinaSignature(modelo: Pick<AptRotinaModelo, "nome" | "setor_id" | "responsavel_padrao_id" | "dias_semana" | "semanas_aplicaveis">) {
  return [
    modelo.nome.trim().toLocaleLowerCase("pt-BR"),
    modelo.setor_id || "",
    modelo.responsavel_padrao_id || "",
    normalizeDiasSemana(modelo.dias_semana).join(","),
    normalizeWeeks(modelo.semanas_aplicaveis).join(","),
  ].join("|");
}

export function useAptRotinas({
  mes,
  ano,
  semanas = EMPTY_WEEKS,
  momento = null,
  setorId = null,
  enabled = true,
}: UseAptRotinasParams) {
  const { user, isGestorOrAdmin } = useAuth();
  const { toast } = useToast();

  const [modelos, setModelos] = useState<AptRotinaModelo[]>([]);
  const [ocorrencias, setOcorrencias] = useState<AptRotinaOcorrencia[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<AptRotinaAvaliacao[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [tableUnavailable, setTableUnavailable] = useState(false);
  const [hasLegacyLocalRows, setHasLegacyLocalRows] = useState(false);

  const semanasKey = normalizeWeeks(semanas).join("|");
  const semanasAtivas = useMemo(
    () => (semanasKey ? semanasKey.split("|").map((semana) => parseInt(semana, 10)) : []),
    [semanasKey]
  );

  const handleTableError = useCallback((error: { code?: string; message?: string; details?: string } | null) => {
    const message = [error?.message, error?.details].filter(Boolean).join(" ");
    if ((error?.code && TABLE_MISSING_CODES.has(error.code)) || TABLE_MISSING_RE.test(message)) {
      setTableUnavailable(true);
      return true;
    }
    return false;
  }, []);

  const migrateLocalRowsToSupabase = useCallback(
    async (remoteModelos: AptRotinaModelo[]) => {
      const localModelos = readLocalArray<AptRotinaModelo>(LOCAL_MODELOS_KEY)
        .filter((modelo) => !setorId || modelo.setor_id === setorId);

      if (localModelos.length === 0) return false;

      const remoteSignatures = new Set(remoteModelos.map(rotinaSignature));
      const modelosToMigrate = localModelos.filter((modelo) => !remoteSignatures.has(rotinaSignature(modelo)));
      const duplicateModelIds = localModelos
        .filter((modelo) => remoteSignatures.has(rotinaSignature(modelo)))
        .map((modelo) => modelo.id);

      if (duplicateModelIds.length > 0) {
        removeLocalRowsByModelIds(new Set(duplicateModelIds));
      }

      if (modelosToMigrate.length === 0) return false;

      const modelIds = new Set(modelosToMigrate.map((modelo) => modelo.id));
      const ocorrenciasToMigrate = readLocalArray<AptRotinaOcorrencia>(LOCAL_OCORRENCIAS_KEY)
        .filter((ocorrencia) => modelIds.has(ocorrencia.modelo_id));
      const avaliacoesToMigrate = readLocalArray<AptRotinaAvaliacao>(LOCAL_AVALIACOES_KEY)
        .filter((avaliacao) => modelIds.has(avaliacao.modelo_id));

      const modelosPayload = modelosToMigrate.map((modelo) => ({
        id: modelo.id,
        setor_id: modelo.setor_id,
        nome: modelo.nome,
        descricao: modelo.descricao,
        responsavel_padrao_id: modelo.responsavel_padrao_id,
        dias_semana: normalizeDiasSemana(modelo.dias_semana),
        semanas_aplicaveis: normalizeWeeks(modelo.semanas_aplicaveis),
        ativo: modelo.ativo,
        exige_aprovacao: modelo.exige_aprovacao,
        entra_calculo_apt: modelo.entra_calculo_apt,
        cor: modelo.cor || "#f97316",
        icone: modelo.icone || "refresh",
        origem_demanda_ids: modelo.origem_demanda_ids ?? null,
        origem_grupo_id: modelo.origem_grupo_id ?? null,
        created_at: modelo.created_at,
        updated_at: modelo.updated_at,
      }));

      let result = await (supabase as any)
        .from("apt_rotina_modelos")
        .insert(modelosPayload)
        .select("*");

      if (result.error) {
        console.error("Erro ao migrar rotinas locais para Supabase:", result.error);
        return false;
      }

      if (ocorrenciasToMigrate.length > 0) {
        const { error } = await (supabase as any)
          .from("apt_rotina_ocorrencias")
          .upsert(ocorrenciasToMigrate, { onConflict: "modelo_id,data", ignoreDuplicates: true });
        if (error) console.error("Erro ao migrar ocorrências locais:", error);
      }

      if (avaliacoesToMigrate.length > 0) {
        const { error } = await (supabase as any)
          .from("apt_rotina_avaliacoes")
          .upsert(avaliacoesToMigrate, { onConflict: "modelo_id,responsavel_id,mes,ano,momento", ignoreDuplicates: true });
        if (error) console.error("Erro ao migrar avaliações locais:", error);
      }

      removeLocalRowsByModelIds(modelIds);
      toast({
        title: "Rotinas locais recuperadas",
        description: `${modelosToMigrate.length} rotina(s) persistente(s) foram enviadas para o Supabase.`,
      });
      return {
        modelos: modelosToMigrate,
        ocorrencias: ocorrenciasToMigrate,
        avaliacoes: avaliacoesToMigrate,
      };
    },
    [setorId, toast]
  );

  const fetchRotinas = useCallback(async () => {
    if (!enabled || !user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setTableUnavailable(false);

    let modelosQuery = (supabase as any)
      .from("apt_rotina_modelos")
      .select("*")
      .order("nome", { ascending: true });

    if (setorId) modelosQuery = modelosQuery.eq("setor_id", setorId);

    const modelosResult = await modelosQuery;
    if (modelosResult.error) {
      if (!handleTableError(modelosResult.error)) {
        console.error("Erro ao carregar modelos de rotina:", modelosResult.error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar rotinas persistentes",
          description: modelosResult.error.message,
        });
        setModelos([]);
        setOcorrencias([]);
        setAvaliacoes([]);
        setIsLoading(false);
        return;
      }
      setModelos([]);
      setOcorrencias([]);
      setAvaliacoes([]);
      setIsLoading(false);
      return;
    }

    let ocorrenciasQuery = (supabase as any)
      .from("apt_rotina_ocorrencias")
      .select("*")
      .eq("mes", mes)
      .eq("ano", ano)
      .order("data", { ascending: true });

    if (semanasAtivas.length > 0) ocorrenciasQuery = ocorrenciasQuery.in("semana_apt", semanasAtivas);
    if (setorId) ocorrenciasQuery = ocorrenciasQuery.eq("setor_id", setorId);
    if (!isGestorOrAdmin) ocorrenciasQuery = ocorrenciasQuery.eq("responsavel_id", user.id);

    const ocorrenciasResult = await ocorrenciasQuery;
    if (ocorrenciasResult.error) {
      if (!handleTableError(ocorrenciasResult.error)) {
        console.error("Erro ao carregar ocorrências de rotina:", ocorrenciasResult.error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar ocorrências persistentes",
          description: ocorrenciasResult.error.message,
        });
        setOcorrencias([]);
        setAvaliacoes([]);
        setIsLoading(false);
        return;
      }
      setOcorrencias([]);
      setAvaliacoes([]);
      setIsLoading(false);
      return;
    }

    let avaliacoesQuery = (supabase as any)
      .from("apt_rotina_avaliacoes")
      .select("*")
      .eq("mes", mes)
      .eq("ano", ano)
      .order("created_at", { ascending: false });

    if (momento !== null) avaliacoesQuery = avaliacoesQuery.eq("momento", momento);
    if (setorId) avaliacoesQuery = avaliacoesQuery.eq("setor_id", setorId);
    if (!isGestorOrAdmin) avaliacoesQuery = avaliacoesQuery.eq("responsavel_id", user.id);

    const avaliacoesResult = await avaliacoesQuery;
    if (avaliacoesResult.error) {
      if (!handleTableError(avaliacoesResult.error)) {
        console.error("Erro ao carregar avaliações de rotina:", avaliacoesResult.error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar avaliações persistentes",
          description: avaliacoesResult.error.message,
        });
        setAvaliacoes([]);
        setIsLoading(false);
        return;
      }
      setAvaliacoes([]);
      setIsLoading(false);
      return;
    }

    const remoteModelos = (modelosResult.data || []) as AptRotinaModelo[];
    const legacyRows = readLocalArray<AptRotinaModelo>(LOCAL_MODELOS_KEY).filter(
      (modelo) => !setorId || modelo.setor_id === setorId
    );

    setHasLegacyLocalRows(legacyRows.length > 0);
    setModelos(remoteModelos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
    setOcorrencias((ocorrenciasResult.data || []) as AptRotinaOcorrencia[]);
    setAvaliacoes((avaliacoesResult.data || []) as AptRotinaAvaliacao[]);
    setIsLoading(false);
  }, [ano, enabled, handleTableError, isGestorOrAdmin, mes, momento, semanasAtivas, setorId, user]);

  useEffect(() => {
    void fetchRotinas();
  }, [fetchRotinas]);

  const createModelo = useCallback(
    async (payload: RotinaModeloPayload): Promise<AptRotinaModelo | false> => {
      if (!isGestorOrAdmin) return false;

      const localCreate = async (): Promise<false> => {
        setTableUnavailable(true);
        toast({
          variant: "destructive",
          title: "Rotina não salva",
          description: "A estrutura de rotinas persistentes não está completa no Supabase. Nada foi salvo apenas neste navegador.",
        });
        return false;
      };

      if (tableUnavailable) return localCreate();

      const insertPayload = {
        setor_id: payload.setor_id ?? setorId ?? null,
        nome: payload.nome.trim(),
        descricao: payload.descricao.trim(),
        responsavel_padrao_id: payload.responsavel_padrao_id ?? null,
        dias_semana: normalizeDiasSemana(payload.dias_semana).length > 0 ? normalizeDiasSemana(payload.dias_semana) : [1, 2, 3, 4, 5],
        semanas_aplicaveis: normalizeWeeks(payload.semanas_aplicaveis).length > 0 ? normalizeWeeks(payload.semanas_aplicaveis) : [1, 2, 3, 4, 5],
        ativo: payload.ativo ?? true,
        exige_aprovacao: payload.exige_aprovacao ?? true,
        entra_calculo_apt: payload.entra_calculo_apt ?? true,
        cor: payload.cor || "#f97316",
        icone: payload.icone || "refresh",
        origem_demanda_ids: payload.origem_demanda_ids ?? null,
        origem_grupo_id: payload.origem_grupo_id ?? null,
      };

      setIsMutating(true);
      const result = await (supabase as any).from("apt_rotina_modelos").insert(insertPayload).select("*").single();
      setIsMutating(false);
      const { data, error } = result;

      if (error) {
        if (!handleTableError(error)) {
          toast({ variant: "destructive", title: "Erro ao criar rotina", description: error.message });
          return false;
        }
        return localCreate();
      }

      toast({ title: "Rotina criada", description: "A demanda persistente foi adicionada ao setor." });
      await fetchRotinas();
      return data as AptRotinaModelo;
    },
    [fetchRotinas, handleTableError, isGestorOrAdmin, setorId, tableUnavailable, toast]
  );

  const recuperarRotinasLocais = useCallback(async () => {
    if (!isGestorOrAdmin) return false;

    const migratedRows = await migrateLocalRowsToSupabase(modelos);
    if (!migratedRows) {
      toast({
        title: "Nenhuma rotina local para recuperar",
        description: "Não encontrei rotinas antigas deste setor salvas apenas neste navegador.",
      });
      return false;
    }

    await fetchRotinas();
    return true;
  }, [fetchRotinas, isGestorOrAdmin, migrateLocalRowsToSupabase, modelos, toast]);

  const updateModelo = useCallback(
    async (id: string, payload: Partial<RotinaModeloPayload>) => {
      if (!isGestorOrAdmin) return false;

      const updatePayload: Record<string, unknown> = {};
      if (payload.setor_id !== undefined) updatePayload.setor_id = payload.setor_id;
      if (payload.nome !== undefined) updatePayload.nome = payload.nome.trim();
      if (payload.descricao !== undefined) updatePayload.descricao = payload.descricao.trim();
      if (payload.responsavel_padrao_id !== undefined) updatePayload.responsavel_padrao_id = payload.responsavel_padrao_id;
      if (payload.dias_semana !== undefined) updatePayload.dias_semana = normalizeDiasSemana(payload.dias_semana);
      if (payload.semanas_aplicaveis !== undefined) updatePayload.semanas_aplicaveis = normalizeWeeks(payload.semanas_aplicaveis);
      if (payload.ativo !== undefined) updatePayload.ativo = payload.ativo;
      if (payload.exige_aprovacao !== undefined) updatePayload.exige_aprovacao = payload.exige_aprovacao;
      if (payload.entra_calculo_apt !== undefined) updatePayload.entra_calculo_apt = payload.entra_calculo_apt;
      if (payload.cor !== undefined) updatePayload.cor = payload.cor;
      if (payload.icone !== undefined) updatePayload.icone = payload.icone;
      if (payload.origem_demanda_ids !== undefined) updatePayload.origem_demanda_ids = payload.origem_demanda_ids;
      if (payload.origem_grupo_id !== undefined) updatePayload.origem_grupo_id = payload.origem_grupo_id;

      const localUpdate = async () => {
        setTableUnavailable(true);
        toast({
          variant: "destructive",
          title: "Rotina não atualizada",
          description: "A estrutura de rotinas persistentes não está completa no Supabase. A alteração não foi salva localmente.",
        });
        return false;
      };

      if (tableUnavailable) return localUpdate();

      setIsMutating(true);
      const { error } = await (supabase as any).from("apt_rotina_modelos").update(updatePayload).eq("id", id);
      setIsMutating(false);

      if (error) {
        if (!handleTableError(error)) {
          toast({ variant: "destructive", title: "Erro ao atualizar rotina", description: error.message });
          return false;
        }
        return localUpdate();
      }

      await fetchRotinas();
      return true;
    },
    [fetchRotinas, handleTableError, isGestorOrAdmin, tableUnavailable, toast]
  );

  const deleteModelo = useCallback(
    async (id: string) => {
      if (!isGestorOrAdmin) return false;

      const localDelete = async () => {
        setTableUnavailable(true);
        toast({
          variant: "destructive",
          title: "Rotina não removida",
          description: "A estrutura de rotinas persistentes não está completa no Supabase. A remoção não foi salva localmente.",
        });
        return false;
      };

      if (tableUnavailable) return localDelete();

      setIsMutating(true);
      const { error } = await (supabase as any).from("apt_rotina_modelos").delete().eq("id", id);
      setIsMutating(false);

      if (error) {
        if (!handleTableError(error)) {
          toast({ variant: "destructive", title: "Erro ao remover rotina", description: error.message });
          return false;
        }
        return localDelete();
      }

      await fetchRotinas();
      return true;
    },
    [fetchRotinas, handleTableError, isGestorOrAdmin, tableUnavailable, toast]
  );

  const gerarOcorrenciasDoPeriodo = useCallback(
    async (modelosAlvo = modelos) => {
      if (!isGestorOrAdmin || modelosAlvo.length === 0) return 0;

      const ultimoDia = new Date(ano, mes, 0).getDate();
      const rows = modelosAlvo
        .filter((modelo) => modelo.ativo)
        .flatMap((modelo) => {
          const semanasModelo = normalizeWeeks(modelo.semanas_aplicaveis);
          const semanasPermitidas = semanasAtivas.length > 0
            ? semanasModelo.filter((semana) => semanasAtivas.includes(semana))
            : semanasModelo;

          return Array.from({ length: ultimoDia }, (_, idx) => idx + 1)
            .filter((dia) => {
              const semanaApt = semanaAptDoDia(dia);
              const day = new Date(ano, mes - 1, dia).getDay();
              return modelo.dias_semana.includes(day) && semanasPermitidas.includes(semanaApt);
            })
            .map((dia) => ({
              modelo_id: modelo.id,
              data: toDateString(ano, mes, dia),
              mes,
              ano,
              semana_apt: semanaAptDoDia(dia),
              responsavel_id: modelo.responsavel_padrao_id,
              setor_id: modelo.setor_id,
            }));
        });

      if (rows.length === 0) return 0;

      const localGenerate = async () => {
        setTableUnavailable(true);
        toast({
          variant: "destructive",
          title: "Ocorrências não geradas",
          description: "A estrutura de rotinas persistentes não está completa no Supabase. Nenhuma ocorrência foi salva localmente.",
        });
        return 0;
      };

      if (tableUnavailable) return localGenerate();

      setIsMutating(true);
      const { error } = await (supabase as any)
        .from("apt_rotina_ocorrencias")
        .upsert(rows, { onConflict: "modelo_id,data" });
      setIsMutating(false);

      if (error) {
        if (!handleTableError(error)) {
          toast({ variant: "destructive", title: "Erro ao gerar ocorrências", description: error.message });
          return 0;
        }
        return localGenerate();
      }

      await fetchRotinas();
      return rows.length;
    },
    [ano, fetchRotinas, handleTableError, isGestorOrAdmin, mes, modelos, semanasAtivas, tableUnavailable, toast]
  );

  const marcarOcorrencia = useCallback(
    async (ocorrenciaId: string, status: AptRotinaStatusOcorrencia, observacao?: string) => {
      if (!user) return false;

      const localUpdate = async () => {
        setTableUnavailable(true);
        toast({
          variant: "destructive",
          title: "Rotina não marcada",
          description: "A estrutura de rotinas persistentes não está completa no Supabase. A marcação não foi salva localmente.",
        });
        return false;
      };

      if (tableUnavailable) return localUpdate();

      const { error } = await (supabase as any)
        .from("apt_rotina_ocorrencias")
        .update({
          status_execucao: status,
          marcado_em: new Date().toISOString(),
          marcado_por: user.id,
          observacao: observacao ?? null,
        })
        .eq("id", ocorrenciaId);

      if (error) {
        if (!handleTableError(error)) {
          toast({ variant: "destructive", title: "Erro ao marcar rotina", description: error.message });
          return false;
        }
        return localUpdate();
      }

      setOcorrencias((prev) =>
        prev.map((item) =>
          item.id === ocorrenciaId
            ? {
                ...item,
                status_execucao: status,
                marcado_em: new Date().toISOString(),
                marcado_por: user.id,
                observacao: observacao ?? null,
              }
            : item
        )
      );
      return true;
    },
    [handleTableError, tableUnavailable, toast, user]
  );

  const resumos = useMemo<AptRotinaResumo[]>(() => {
    const modelosById = new Map(modelos.map((modelo) => [modelo.id, modelo]));
    const avaliacoesByKey = new Map(
      avaliacoes.map((avaliacao) => [
        `${avaliacao.modelo_id}|${avaliacao.responsavel_id ?? ""}|${avaliacao.momento ?? ""}`,
        avaliacao,
      ])
    );
    const map = new Map<string, AptRotinaResumo>();

    ocorrencias.forEach((ocorrencia) => {
      const modelo = modelosById.get(ocorrencia.modelo_id);
      if (!modelo) return;

      const key = `${ocorrencia.modelo_id}|${ocorrencia.responsavel_id ?? ""}`;
      const existing = map.get(key);
      if (existing) {
        existing.ocorrencias.push(ocorrencia);
        return;
      }

      map.set(key, {
        key,
        modelo,
        responsavel_id: ocorrencia.responsavel_id,
        setor_id: ocorrencia.setor_id,
        ocorrencias: [ocorrencia],
        previstas: 0,
        feitas: 0,
        nao_feitas: 0,
        pendentes: 0,
        percentual: 0,
        avaliacao: avaliacoesByKey.get(`${ocorrencia.modelo_id}|${ocorrencia.responsavel_id ?? ""}|${momento ?? ""}`),
      });
    });

    return Array.from(map.values())
      .map((resumo) => {
        const previstas = resumo.ocorrencias.length;
        const feitas = resumo.ocorrencias.filter((item) => item.status_execucao === "executado").length;
        const naoFeitas = resumo.ocorrencias.filter((item) => item.status_execucao === "nao_realizado").length;
        const pendentes = previstas - feitas - naoFeitas;
        return {
          ...resumo,
          ocorrencias: [...resumo.ocorrencias].sort((a, b) => a.data.localeCompare(b.data)),
          previstas,
          feitas,
          nao_feitas: naoFeitas,
          pendentes,
          percentual: percentual(feitas, previstas),
        };
      })
      .sort((a, b) => a.modelo.nome.localeCompare(b.modelo.nome, "pt-BR"));
  }, [avaliacoes, modelos, momento, ocorrencias]);

  const calcularResumoDoMomento = useCallback(async () => {
    if (!isGestorOrAdmin || resumos.length === 0) return false;

    const rows = resumos.map((resumo) => ({
      modelo_id: resumo.modelo.id,
      responsavel_id: resumo.responsavel_id,
      setor_id: resumo.setor_id,
      mes,
      ano,
      momento,
      semanas_agrupadas: semanasAtivas,
      previstas: resumo.previstas,
      feitas: resumo.feitas,
      nao_feitas: resumo.nao_feitas,
      percentual: resumo.percentual,
      status_gestor: resumo.avaliacao?.status_gestor ?? "pendente",
      observacao_gestor: resumo.avaliacao?.observacao_gestor ?? null,
      avaliado_em: resumo.avaliacao?.avaliado_em ?? null,
      avaliado_por: resumo.avaliacao?.avaliado_por ?? null,
    }));

    const localCalculate = async () => {
      setTableUnavailable(true);
      toast({
        variant: "destructive",
        title: "Resumo não calculado",
        description: "A estrutura de rotinas persistentes não está completa no Supabase. O resumo não foi salvo localmente.",
      });
      return false;
    };

    if (tableUnavailable) return localCalculate();

    const { error } = await (supabase as any)
      .from("apt_rotina_avaliacoes")
      .upsert(rows, { onConflict: "modelo_id,responsavel_id,mes,ano,momento" });

    if (error) {
      if (!handleTableError(error)) {
        toast({ variant: "destructive", title: "Erro ao calcular resumo", description: error.message });
        return false;
      }
      return localCalculate();
    }

    await fetchRotinas();
    return true;
  }, [ano, fetchRotinas, handleTableError, isGestorOrAdmin, mes, momento, resumos, semanasAtivas, tableUnavailable, toast]);

  const atualizarAvaliacao = useCallback(
    async (avaliacaoId: string, status: AptRotinaStatusAvaliacao, observacao?: string) => {
      if (!isGestorOrAdmin || !user) return false;

      const localUpdate = async () => {
        setTableUnavailable(true);
        toast({
          variant: "destructive",
          title: "Avaliação não salva",
          description: "A estrutura de rotinas persistentes não está completa no Supabase. A avaliação não foi salva localmente.",
        });
        return false;
      };

      if (tableUnavailable) return localUpdate();

      const { error } = await (supabase as any)
        .from("apt_rotina_avaliacoes")
        .update({
          status_gestor: status,
          observacao_gestor: observacao ?? null,
          avaliado_em: new Date().toISOString(),
          avaliado_por: user.id,
        })
        .eq("id", avaliacaoId);

      if (error) {
        if (!handleTableError(error)) {
          toast({ variant: "destructive", title: "Erro ao avaliar rotina", description: error.message });
          return false;
        }
        return localUpdate();
      }

      await fetchRotinas();
      return true;
    },
    [fetchRotinas, handleTableError, isGestorOrAdmin, tableUnavailable, toast, user]
  );

  return {
    modelos,
    ocorrencias,
    avaliacoes,
    resumos,
    isLoading,
    isMutating,
    tableUnavailable,
    hasLegacyLocalRows,
    recuperarRotinasLocais,
    fetchRotinas,
    createModelo,
    updateModelo,
    deleteModelo,
    gerarOcorrenciasDoPeriodo,
    marcarOcorrencia,
    calcularResumoDoMomento,
    atualizarAvaliacao,
  };
}
