import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AptMomento, AptMomentosConfig, defaultMomentos } from "@/hooks/useAptMomentos";
import { GripVertical, Plus, Trash2, Info } from "lucide-react";

const MESES_NOMES: Record<number, string> = {
  1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
  5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
  9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro",
};

const TODAS_SEMANAS = [1, 2, 3, 4, 5];

interface ConfigurarAptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mes: number;
  ano: number;
  config: AptMomentosConfig | null;
  onSave: (momentos: AptMomento[], momentoAtivo: number | null) => Promise<boolean>;
  isSaving?: boolean;
}

export default function ConfigurarAptDialog({
  open,
  onOpenChange,
  mes,
  ano,
  config,
  onSave,
  isSaving = false,
}: ConfigurarAptDialogProps) {
  const [momentos, setMomentos] = useState<AptMomento[]>([]);

  // Inicializa com a config existente ou padrão
  useEffect(() => {
    if (open) {
      if (config && config.momentos.length > 0) {
        setMomentos(config.momentos.map((m) => ({ ...m })));
      } else {
        setMomentos(defaultMomentos(5));
      }
    }
  }, [open, config]);

  // Semanas já alocadas em outros momentos (para evitar duplicata)
  const semanasAlocadas = (excludeNumero: number): Set<number> => {
    const alocadas = new Set<number>();
    momentos.forEach((m) => {
      if (m.numero !== excludeNumero) {
        m.semanas.forEach((s) => alocadas.add(s));
      }
    });
    return alocadas;
  };

  const toggleSemana = (momentoNumero: number, semana: number) => {
    const alocadas = semanasAlocadas(momentoNumero);
    // Se a semana está em outro momento, não deixa adicionar
    if (alocadas.has(semana)) return;

    setMomentos((prev) =>
      prev.map((m) => {
        if (m.numero !== momentoNumero) return m;
        const jaTemSemana = m.semanas.includes(semana);
        // Não pode remover se ficar sem nenhuma semana
        if (jaTemSemana && m.semanas.length === 1) return m;
        return {
          ...m,
          semanas: jaTemSemana
            ? m.semanas.filter((s) => s !== semana)
            : [...m.semanas, semana].sort((a, b) => a - b),
        };
      })
    );
  };

  // Adicionar novo momento (com semanas ainda não alocadas)
  const adicionarMomento = () => {
    const todasAlocadas = new Set(momentos.flatMap((m) => m.semanas));
    const livres = TODAS_SEMANAS.filter((s) => !todasAlocadas.has(s));
    if (livres.length === 0) return; // Todas semanas já alocadas

    const novoNumero = Math.max(...momentos.map((m) => m.numero), 0) + 1;
    setMomentos((prev) => [
      ...prev,
      {
        numero: novoNumero,
        semanas: [livres[0]],
        label: `Momento ${novoNumero}`,
        concluido: false,
        concluidoEm: null,
        concluidoPor: null,
      },
    ]);
  };

  // Remover momento (só se não estiver concluído)
  const removerMomento = (numero: number) => {
    const m = momentos.find((m) => m.numero === numero);
    if (m?.concluido) return; // Não pode remover concluído
    setMomentos((prev) => prev.filter((m) => m.numero !== numero));
  };

  // Semanas sem momento atribuído
  const semanasLivres = TODAS_SEMANAS.filter(
    (s) => !momentos.flatMap((m) => m.semanas).includes(s)
  );

  const handleSave = async () => {
    // Valida: pelo menos 1 momento com pelo menos 1 semana
    if (momentos.length === 0) return;
    const momentoAtivo = config?.momento_ativo ?? (momentos[0]?.numero ?? null);
    const ok = await onSave(momentos, momentoAtivo);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ⚙️ Configurar Momentos APT
          </DialogTitle>
          <DialogDescription>
            {MESES_NOMES[mes]} {ano} — Defina quais semanas pertencem a cada momento.
            Você pode aglutinar semanas num mesmo momento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 max-h-[400px] overflow-y-auto pr-1">
          {/* Aviso sobre semanas livres */}
          {semanasLivres.length > 0 && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-yellow-500" />
              <span>
                Semanas sem momento:{" "}
                <strong>{semanasLivres.map((s) => `${s}ª`).join(", ")}</strong>.
                Adicione-as a um momento ou crie um novo.
              </span>
            </div>
          )}

          {momentos.map((momento) => {
            const alocadas = semanasAlocadas(momento.numero);
            const podeDeletar = !momento.concluido && momentos.length > 1;

            return (
              <div
                key={momento.numero}
                className={cn(
                  "rounded-lg border p-3 bg-white",
                  momento.concluido
                    ? "border-green-200 bg-green-50/40"
                    : "border-gray-200"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
                  {/* Número do momento */}
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
                      momento.concluido
                        ? "bg-green-500 text-white"
                        : "bg-blue-500 text-white"
                    )}
                  >
                    {momento.numero}
                  </div>
                  <span className="text-sm font-semibold text-gray-700 flex-1">
                    {momento.label}
                  </span>
                  {momento.concluido && (
                    <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 border-green-200">
                      Concluído
                    </Badge>
                  )}
                  {podeDeletar && (
                    <button
                      onClick={() => removerMomento(momento.numero)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                      title="Remover momento"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Chips de semanas */}
                <div className="flex gap-2 flex-wrap ml-8">
                  {TODAS_SEMANAS.map((semana) => {
                    const pertenceAquiMomento = momento.semanas.includes(semana);
                    const alocadaEmOutro = alocadas.has(semana);
                    const bloqueada = momento.concluido || alocadaEmOutro;

                    return (
                      <button
                        key={semana}
                        onClick={() => !bloqueada && toggleSemana(momento.numero, semana)}
                        disabled={bloqueada}
                        title={
                          alocadaEmOutro
                            ? `Semana ${semana} já está em outro momento`
                            : momento.concluido
                            ? "Momento já concluído"
                            : undefined
                        }
                        className={cn(
                          "px-3 py-1 rounded-full text-xs font-semibold border transition-all",
                          pertenceAquiMomento
                            ? "bg-blue-500 border-blue-500 text-white"
                            : alocadaEmOutro
                            ? "bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed"
                            : "bg-white border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600"
                        )}
                      >
                        {semana}ª sem.
                      </button>
                    );
                  })}
                </div>

                {/* Label das semanas aglutinadas */}
                {momento.semanas.length > 1 && (
                  <p className="text-[10px] text-blue-500 ml-8 mt-1.5">
                    ↳ Semanas {momento.semanas.join(" e ")} aglutinadas neste momento
                  </p>
                )}
              </div>
            );
          })}

          {/* Botão adicionar momento */}
          {semanasLivres.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={adicionarMomento}
              className="w-full border-dashed text-gray-400 hover:text-blue-600 hover:border-blue-300 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar momento
            </Button>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || momentos.length === 0}>
            {isSaving ? "Salvando..." : "Salvar configuração"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
