import { useMemo } from "react";

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
}

export default function TopSetoresBar({ demandas, setores }: TopSetoresBarProps) {
  const topSetores = useMemo(() => {
    const countMap: Record<string, { total: number; pendentesGestor: number; aprovados: number }> = {};

    demandas.forEach((d) => {
      const sid = d.setor_id || "sem_setor";
      if (!countMap[sid]) countMap[sid] = { total: 0, pendentesGestor: 0, aprovados: 0 };
      countMap[sid].total++;
      if (d.status_gestor === "pendente") {
        countMap[sid].pendentesGestor++;
      } else if (d.status_gestor === "executado") {
        countMap[sid].aprovados++;
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
          pctAprovado: data.total > 0 ? Math.round((data.aprovados / data.total) * 100) : 0,
        };
      })
      .filter((s) => s.pendentesGestor > 0)
      .sort((a, b) => b.pendentesGestor - a.pendentesGestor)
      .slice(0, 10);
  }, [demandas, setores]);

  if (topSetores.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-10 gap-2">
        {topSetores.map((s) => (
          <div
            key={s.setorId}
            className="relative rounded-lg border bg-card p-2.5 overflow-hidden"
          >
            <div
              className="absolute inset-0 opacity-10"
              style={{ 
                background: `linear-gradient(90deg, ${s.cor} ${s.pctAprovado}%, transparent ${s.pctAprovado}%)` 
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
                  {s.total}
                </span>
                <span className="text-[10px] text-muted-foreground">dem.</span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[10px] text-muted-foreground">
                  {s.pendentesGestor} pend.
                </span>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: s.cor }}
                >
                  {s.pctAprovado}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
