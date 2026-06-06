export type DemandaModoExecucao = "semanal" | "prazo";

export interface DemandaPrazoFields {
  id: string;
  semana_limite: number[];
  modo_execucao?: DemandaModoExecucao | null;
  semana_inicio_prazo?: number | null;
  semana_fim_prazo?: number | null;
}

export interface DemandaPrazoMeta {
  demanda_id: string;
  modo_execucao: DemandaModoExecucao;
  semana_inicio_prazo: number | null;
  semana_fim_prazo: number | null;
  updated_at: string;
}

export type DemandaPrazoStatusVisual =
  | "no_prazo"
  | "concluida_aguardando_aprovacao"
  | "vencida_nao_concluida"
  | "aprovada"
  | null;

const STORAGE_KEY = "sisramos:demanda-prazo-meta:v1";
const PRAZO_COLUMN_MISSING_RE =
  /modo_execucao|semana_inicio_prazo|semana_fim_prazo|schema cache|could not find the .* column|column .* does not exist/i;

function normalizeWeek(week: number | null | undefined) {
  if (!week || Number.isNaN(week)) return null;
  return Math.min(5, Math.max(1, Math.trunc(week)));
}

export function buildPrazoWeeks(startWeek: number, endWeek: number) {
  const start = normalizeWeek(startWeek) ?? 1;
  const end = normalizeWeek(endWeek) ?? start;
  const min = Math.min(start, end);
  const max = Math.max(start, end);
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

export function isPrazoColumnMissingError(error: { message?: string } | null | undefined) {
  return !!error?.message && PRAZO_COLUMN_MISSING_RE.test(error.message);
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readDemandasPrazoMeta(): DemandaPrazoMeta[] {
  if (!canUseStorage()) return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as DemandaPrazoMeta[];
  } catch {
    return [];
  }
}

export function writeDemandasPrazoMeta(rows: DemandaPrazoMeta[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function saveDemandasPrazoMeta(
  ids: string[],
  payload: {
    modo_execucao: DemandaModoExecucao;
    semana_inicio_prazo?: number | null;
    semana_fim_prazo?: number | null;
  }
) {
  // Mantido apenas para compatibilidade com código antigo. O fluxo oficial agora
  // exige Supabase; não gravamos mais prazo silenciosamente no navegador.
  void ids;
  void payload;
}

export function clearDemandasPrazoMeta(ids: string[]) {
  if (ids.length === 0) return;
  const blocked = new Set(ids);
  writeDemandasPrazoMeta(readDemandasPrazoMeta().filter((row) => !blocked.has(row.demanda_id)));
}

export function mergeDemandasPrazoMeta<T extends DemandaPrazoFields>(rows: T[]): T[] {
  return rows.map((row) => {
    const dbMode = row.modo_execucao ?? null;
    const modo_execucao = (dbMode || "semanal") as DemandaModoExecucao;
    const semana_inicio_prazo = normalizeWeek(row.semana_inicio_prazo);
    const semana_fim_prazo = normalizeWeek(row.semana_fim_prazo);

    if (modo_execucao !== "prazo" || !semana_inicio_prazo || !semana_fim_prazo) {
      return {
        ...row,
        modo_execucao,
        semana_inicio_prazo: null,
        semana_fim_prazo: null,
      };
    }

    return {
      ...row,
      modo_execucao,
      semana_inicio_prazo,
      semana_fim_prazo,
      semana_limite: buildPrazoWeeks(semana_inicio_prazo, semana_fim_prazo),
    };
  });
}

export function isDemandaPrazo(demanda: Partial<DemandaPrazoFields>) {
  return demanda.modo_execucao === "prazo" && !!demanda.semana_inicio_prazo && !!demanda.semana_fim_prazo;
}

export function formatPrazoWindow(
  demanda: Partial<DemandaPrazoFields>,
  mode: "full" | "compact" = "full"
) {
  if (!isDemandaPrazo(demanda)) return null;
  const start = normalizeWeek(demanda.semana_inicio_prazo);
  const end = normalizeWeek(demanda.semana_fim_prazo);
  if (!start || !end) return null;
  if (mode === "compact") return `${start}ª → ${end}ª`;
  if (start === end) return `Até ${end}ª semana`;
  return `${start}ª até ${end}ª semana`;
}

export function getPrazoReferenceWeek({
  viewedMes,
  viewedAno,
  currentWeek,
}: {
  viewedMes: number | null;
  viewedAno: number | null;
  currentWeek: number;
}) {
  if (viewedMes === null || viewedAno === null) return currentWeek;

  const now = new Date();
  const currentMes = now.getMonth() + 1;
  const currentAno = now.getFullYear();

  if (viewedAno < currentAno || (viewedAno === currentAno && viewedMes < currentMes)) return 5;
  if (viewedAno > currentAno || (viewedAno === currentAno && viewedMes > currentMes)) return 0;
  return currentWeek;
}

export function getDemandaPrazoStatusVisual(
  demanda: Partial<DemandaPrazoFields> & {
    status_responsavel?: "pendente" | "executado" | "nao_realizado";
    status_gestor?: "pendente" | "executado" | "nao_realizado";
  },
  referenceWeek: number
): DemandaPrazoStatusVisual {
  if (!isDemandaPrazo(demanda)) return null;

  if (demanda.status_gestor === "executado") return "aprovada";
  if (demanda.status_responsavel === "executado") {
    return "concluida_aguardando_aprovacao";
  }
  if (demanda.status_responsavel === "nao_realizado") return "vencida_nao_concluida";

  const end = normalizeWeek(demanda.semana_fim_prazo) ?? 5;
  const start = normalizeWeek(demanda.semana_inicio_prazo) ?? 1;

  if (referenceWeek === 0 || referenceWeek < start) return "no_prazo";
  if (referenceWeek <= end) return "no_prazo";
  return "vencida_nao_concluida";
}

export function getPrazoToneClasses(status: DemandaPrazoStatusVisual) {
  if (status === "no_prazo") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "concluida_aguardando_aprovacao") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "vencida_nao_concluida") return "border-destructive/30 bg-destructive/10 text-destructive";
  if (status === "aprovada") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-border bg-muted/40 text-muted-foreground";
}

export function getPrazoStatusLabel(status: DemandaPrazoStatusVisual) {
  if (status === "no_prazo") return "No prazo";
  if (status === "concluida_aguardando_aprovacao") return "Aguardando aprovação";
  if (status === "vencida_nao_concluida") return "Prazo vencido";
  if (status === "aprovada") return "Aprovada";
  return null;
}
