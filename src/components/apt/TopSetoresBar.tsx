import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface Demanda {
  id: string;
  setor_id: string | null;
  status_responsavel: string;
  status_gestor: string;
}

interface Setor {
  id: string;
  nome: string;
  cor?: string;
}

interface TopSetoresBarProps {
  demandas: Demanda[];
  setores: Setor[];
  activeSetorId?: string | null;
  onSetorClick?: (setorId: string | null) => void;
  statusField?: "status_responsavel" | "status_gestor";
}

export default function TopSetoresBar({
  demandas,
  setores,
  activeSetorId,
  onSetorClick,
  statusField = "status_gestor",
}: TopSetoresBarProps) {
  const topSetores = useMemo(() => {
    const countMap: Record<string, { total: number; pendentes: number; concluidos: number }> = {};

    demandas.forEach((d) => {
      const sid = d.setor_id || "sem_setor";
      if (!countMap[sid]) countMap[sid] = { total: 0, pendentes: 0, concluidos: 0 };
      countMap[sid].total++;
      if (d[statusField] === "pendente") {
        countMap[sid].pendentes++;
      } else if (d[statusField] === "executado") {
        countMap[sid].concluidos++;
      }
    });

    return Object.entries(countMap)
      .map(([setorId, data]) => {
        const setor = setores.find((s) => s.id === setorId);
        return {
          setorId,
          nome: setor?.nome || "Sem Setor",
          cor: setor?.cor || "#6B7280",
          ...data,
          pctConcluido: data.total > 0 ? Math.round((data.concluidos / data.total) * 100) : 0,
        };
      })
      .filter((s) => s.pendentes > 0)
      .sort((a, b) => b.pendentes - a.pendentes)
      .slice(0, 10);
  }, [demandas, setores, statusField]);

  if (topSetores.length === 0) return null;

  const handleClick = (setorId: string) => {
    if (!onSetorClick) return;
    onSetorClick(activeSetorId === setorId ? null : setorId);
  };

  return (
    <div className="mb-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-10 gap-2">
        {topSetores.map((s) => {
          const isActive = activeSetorId === s.setorId;
          const isDimmed = activeSetorId != null && !isActive;

          return (
            <div
              key={s.setorId}
              onClick={() => handleClick(s.setorId)}
              className={cn(
                "relative rounded-lg border bg-card p-2.5 overflow-hidden cursor-pointer transition-all duration-200",
                isActive && "ring-2 ring-offset-1 ring-offset-background scale-[1.03]",
                isDimmed && "opacity-35 scale-[0.97]",
                !activeSetorId && "hover:scale-[1.02]"
              )}
              style={isActive ? { borderColor: s.cor, boxShadow: `0 0 12px ${s.cor}44`, ['--tw-ring-color' as any]: s.cor } : undefined}
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  background: `linear-gradient(90deg, ${s.cor} ${s.pctConcluido}%, transparent ${s.pctConcluido}%)`,
                }}
              />
              <div className="relative">
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.cor }}
                  />
                  <span className="text-[11px] font-medium truncate text-foreground">
                    {s.nome}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-foreground leading-none">
                    {s.pendentes}
                  </span>
                  <span className="text-[10px] text-muted-foreground">pend.</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {s.total} dem.
                  </span>
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: s.cor }}
                  >
                    {s.pctConcluido}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
