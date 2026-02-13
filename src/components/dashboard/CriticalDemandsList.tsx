import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Star, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Demanda {
  id: string;
  numero: number;
  descricao: string;
  responsavel_id: string;
  muito_urgente: boolean;
  prioritaria: boolean;
  status_responsavel: string;
  semana_limite: number[];
  mes: number;
  ano: number;
}

interface Profile {
  user_id: string;
  nome: string;
}

interface CriticalDemandsListProps {
  demandas: Demanda[];
  profiles: Profile[];
  currentWeek?: number;
}

export default function CriticalDemandsList({
  demandas,
  profiles,
  currentWeek,
}: CriticalDemandsListProps) {
  const navigate = useNavigate();

  // Filter critical demands
  const criticalDemandas = demandas.filter((d) => {
    return d.muito_urgente || d.prioritaria;
  }).slice(0, 15);

  const getProfile = (userId: string) => profiles.find((p) => p.user_id === userId);

  const handleDemandaClick = (demanda: Demanda) => {
    // Navigate to APT with filters applied
    const params = new URLSearchParams({
      tab: "execucao",
    });
    navigate(`/apt?${params.toString()}`);
  };

  if (criticalDemandas.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Demandas Críticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhuma demanda crítica no momento 🎉
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Demandas Críticas
          <Badge variant="secondary" className="ml-2">
            {criticalDemandas.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-1 p-4 pt-0">
            {criticalDemandas.map((demanda) => {
              const profile = getProfile(demanda.responsavel_id);
              
              return (
                <button
                  key={demanda.id}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all",
                    "hover:bg-muted/50 hover:shadow-sm",
                    demanda.muito_urgente && "border-l-4 border-l-destructive bg-destructive/5",
                    demanda.prioritaria && !demanda.muito_urgente && "border-l-4 border-l-warning bg-warning/5"
                  )}
                  onClick={() => handleDemandaClick(demanda)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground font-mono">
                      #{demanda.numero}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">{demanda.descricao}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {profile?.nome || "Desconhecido"}
                        </span>
                        {demanda.muito_urgente && (
                          <Badge variant="destructive" className="text-[10px] h-4">
                            <AlertTriangle className="h-3 w-3 mr-0.5" />
                            Urgente
                          </Badge>
                        )}
                        {demanda.prioritaria && !demanda.muito_urgente && (
                          <Badge variant="outline" className="text-[10px] h-4 border-warning text-warning">
                            <Star className="h-3 w-3 mr-0.5" />
                            Prioridade
                          </Badge>
                        )}
                        {demanda.status_responsavel === "nao_realizado" && (
                          <Badge variant="outline" className="text-[10px] h-4 border-destructive text-destructive">
                            <XCircle className="h-3 w-3 mr-0.5" />
                            Não Realizado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
