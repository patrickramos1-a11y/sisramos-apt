import { CheckCircle2, Circle, Clock, ChevronRight, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AptMomento, AptMomentosConfig } from "@/hooks/useAptMomentos";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MESES_NOMES: Record<number, string> = {
  1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
  5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
  9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro",
};

interface AptMomentosNavigatorProps {
  mes: number;
  ano: number;
  config: AptMomentosConfig | null;
  isGestorOrAdmin: boolean;
  /** Momento selecionado para visualização (pode ser diferente do ativo) */
  momentoSelecionado: number | null;
  onSelecionarMomento: (numero: number) => void;
  onAbrirConfig: () => void;
}

function semanasLabel(semanas: number[]): string {
  if (semanas.length === 1) return `${semanas[0]}ª sem.`;
  if (semanas.length === 2) return `${semanas[0]}ª + ${semanas[1]}ª sem.`;
  return semanas.map((s) => `${s}ª`).join(" + ") + " sem.";
}

function MomentoChip({
  momento,
  isAtivo,
  isSelecionado,
  onClick,
}: {
  momento: AptMomento;
  isAtivo: boolean;
  isSelecionado: boolean;
  onClick: () => void;
}) {
  const concluido = momento.concluido;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "flex flex-col items-start px-3 py-2 rounded-lg border-2 transition-all text-left min-w-[90px]",
              // Concluído
              concluido && !isSelecionado &&
                "bg-green-50 border-green-300 text-green-800 hover:border-green-400",
              // Ativo (em andamento) e não selecionado
              isAtivo && !concluido && !isSelecionado &&
                "bg-blue-50 border-blue-400 text-blue-900 hover:border-blue-500",
              // Selecionado para visualização
              isSelecionado &&
                "ring-2 ring-offset-1 ring-blue-500 border-blue-500 bg-blue-600 text-white",
              // Próximo (não ativo, não concluído)
              !isAtivo && !concluido && !isSelecionado &&
                "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            {/* Ícone + título */}
            <div className="flex items-center gap-1.5">
              {concluido ? (
                <CheckCircle2 className={cn("h-3.5 w-3.5", isSelecionado ? "text-white" : "text-green-500")} />
              ) : isAtivo ? (
                <Clock className={cn("h-3.5 w-3.5", isSelecionado ? "text-white" : "text-blue-500")} />
              ) : (
                <Circle className="h-3.5 w-3.5 text-gray-300" />
              )}
              <span className="text-xs font-bold">{momento.label}</span>
            </div>

            {/* Semanas */}
            <span className={cn(
              "text-[10px] mt-0.5 leading-tight",
              isSelecionado ? "text-blue-100" : "opacity-70"
            )}>
              {semanasLabel(momento.semanas)}
            </span>

            {/* Badge de status */}
            <span className={cn(
              "text-[9px] font-semibold mt-1 px-1.5 py-0.5 rounded-full",
              isSelecionado
                ? "bg-white/20 text-white"
                : concluido
                ? "bg-green-100 text-green-700"
                : isAtivo
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-400"
            )}>
              {concluido ? "Concluído" : isAtivo ? "Em andamento" : "Próximo"}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {concluido && momento.concluidoEm
            ? `Encerrado em ${format(new Date(momento.concluidoEm), "dd/MM 'às' HH:mm", { locale: ptBR })}`
            : isAtivo
            ? "Momento atual em andamento"
            : "Aguardando ativação"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function AptMomentosNavigator({
  mes,
  ano,
  config,
  isGestorOrAdmin,
  momentoSelecionado,
  onSelecionarMomento,
  onAbrirConfig,
}: AptMomentosNavigatorProps) {
  const momentos = config?.momentos ?? [];
  const momentoAtivo = config?.momento_ativo ?? null;

  // Se não há config ainda, mostra apenas o botão de configurar
  if (momentos.length === 0) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-blue-200 bg-blue-50/50">
        <div className="flex-1">
          <p className="text-xs font-semibold text-blue-700">
            Momentos APT não configurados para {MESES_NOMES[mes]} {ano}
          </p>
          <p className="text-[11px] text-blue-500 mt-0.5">
            Configure para definir a sequência de semanas deste mês
          </p>
        </div>
        {isGestorOrAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAbrirConfig}
            className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100 text-xs"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Configurar
          </Button>
        )}
      </div>
    );
  }

  const momentoAtivoObj = momentos.find((m) => m.numero === momentoAtivo);

  return (
    <div className="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50/60 to-transparent px-3 py-2.5">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
          Momentos APT — {MESES_NOMES[mes]} {ano}
        </span>

        {/* Status do momento ativo */}
        {momentoAtivoObj && (
          <span className="flex items-center gap-1 text-[10px] text-blue-500">
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium">{momentoAtivoObj.label}</span>
            <span className="opacity-70">({semanasLabel(momentoAtivoObj.semanas)})</span>
          </span>
        )}

        {/* Botão configurar (admin only) */}
        {isGestorOrAdmin && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onAbrirConfig}
            className="ml-auto h-6 px-2 text-[10px] text-blue-600 hover:bg-blue-100 gap-1"
          >
            <Settings2 className="h-3 w-3" />
            Configurar
          </Button>
        )}
      </div>

      {/* Chips de momentos */}
      <div className="flex items-start gap-2 flex-wrap">
        {momentos.map((momento) => (
          <MomentoChip
            key={momento.numero}
            momento={momento}
            isAtivo={momento.numero === momentoAtivo}
            isSelecionado={momento.numero === momentoSelecionado}
            onClick={() => onSelecionarMomento(momento.numero)}
          />
        ))}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 mt-2">
        <LegendaItem cor="bg-green-400" label="Concluído" />
        <LegendaItem cor="bg-blue-400" label="Em andamento" />
        <LegendaItem cor="bg-gray-200" label="Próximo" />
        {momentoAtivo !== null && (
          <span className="ml-auto text-[10px] text-gray-400 italic">
            Clique em um momento para visualizá-lo
          </span>
        )}
      </div>
    </div>
  );
}

function LegendaItem({ cor, label }: { cor: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-[10px] text-gray-400">
      <span className={cn("w-2 h-2 rounded-full", cor)} />
      {label}
    </span>
  );
}
