import { useMemo } from "react";
import {
  defaultMomentos,
  useAptMomentos,
  type AptMomentosConfig,
} from "@/hooks/useAptMomentos";

export function resolveAptViewDate(
  meses: string[],
  anos: string[],
  fallbackMes = new Date().getMonth() + 1,
  fallbackAno = new Date().getFullYear()
) {
  return {
    mes: meses.length === 1 ? parseInt(meses[0], 10) : fallbackMes,
    ano: anos.length === 1 ? parseInt(anos[0], 10) : fallbackAno,
  };
}

export function isAptFinalizada(config: AptMomentosConfig | null | undefined) {
  return (
    Boolean(config) &&
    config?.momento_ativo === null &&
    (config?.momentos.length ?? 0) > 0 &&
    config?.momentos.every((momento) => momento.concluido)
  );
}

export function normalizeAptWeeks(semanas: number[]) {
  return [...new Set(semanas)]
    .filter((semana) => semana >= 1 && semana <= 5)
    .sort((a, b) => a - b);
}

interface UseAptContextParams {
  mes: number | null;
  ano: number | null;
  momentoSelecionado?: number | null;
  suggestedWeek?: number | null;
  currentWeek: number;
}

export function useAptContext({
  mes,
  ano,
  momentoSelecionado = null,
  suggestedWeek = null,
  currentWeek,
}: UseAptContextParams) {
  const aptMomentos = useAptMomentos(mes, ano);

  const defaultMomentosConfig = useMemo(() => defaultMomentos(5), []);
  const visualMomentosConfig = useMemo<AptMomentosConfig>(
    () =>
      aptMomentos.config ?? {
        id: "visual-default",
        mes: mes ?? new Date().getMonth() + 1,
        ano: ano ?? new Date().getFullYear(),
        momentos: defaultMomentosConfig,
        momento_ativo: momentoSelecionado ?? suggestedWeek ?? currentWeek,
        created_at: "",
        updated_at: "",
      },
    [ano, aptMomentos.config, currentWeek, defaultMomentosConfig, mes, momentoSelecionado, suggestedWeek]
  );

  const aptFinalizada = isAptFinalizada(aptMomentos.config);
  const activeMomentNumber = momentoSelecionado ?? visualMomentosConfig.momento_ativo ?? null;

  const activeMomentWeeks = useMemo(() => {
    if (momentoSelecionado !== null) {
      const semanasConfiguradas = aptMomentos.semanasDoMomento(momentoSelecionado);
      if (semanasConfiguradas.length > 0) return normalizeAptWeeks(semanasConfiguradas);
      return normalizeAptWeeks(
        visualMomentosConfig.momentos.find((momento) => momento.numero === momentoSelecionado)?.semanas ?? []
      );
    }

    if (aptMomentos.config && aptMomentos.config.momento_ativo === null) return [];

    const semanasAtivas = aptMomentos.semanasDoMomentoAtivo();
    if (semanasAtivas.length > 0) return normalizeAptWeeks(semanasAtivas);
    if (suggestedWeek !== null) return [suggestedWeek];
    return [currentWeek];
  }, [aptMomentos, currentWeek, momentoSelecionado, suggestedWeek, visualMomentosConfig]);

  return {
    ...aptMomentos,
    visualMomentosConfig,
    activeMomentNumber,
    activeMomentWeeks,
    isAptFinalizada: aptFinalizada,
  };
}
