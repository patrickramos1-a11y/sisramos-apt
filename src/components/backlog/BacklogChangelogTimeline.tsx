import { useBacklogChangelog } from "@/hooks/useBacklog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Plus, 
  RefreshCw, 
  CheckCircle, 
  Code, 
  FileText,
  User
} from "lucide-react";

interface BacklogChangelogTimelineProps {
  itemId: string;
}

const ACAO_ICONS: Record<string, React.ReactNode> = {
  criacao: <Plus className="h-4 w-4" />,
  atualizacao: <RefreshCw className="h-4 w-4" />,
  validacao: <CheckCircle className="h-4 w-4" />,
  registro_implementacao: <Code className="h-4 w-4" />,
  anexo: <FileText className="h-4 w-4" />
};

const ACAO_LABELS: Record<string, string> = {
  criacao: "Item criado",
  atualizacao: "Item atualizado",
  validacao: "Validação registrada",
  registro_implementacao: "Registro de implementação",
  anexo: "Anexo adicionado"
};

const ACAO_COLORS: Record<string, string> = {
  criacao: "bg-green-500",
  atualizacao: "bg-blue-500",
  validacao: "bg-emerald-500",
  registro_implementacao: "bg-purple-500",
  anexo: "bg-orange-500"
};

export default function BacklogChangelogTimeline({ itemId }: BacklogChangelogTimelineProps) {
  const { data: changelog, isLoading } = useBacklogChangelog(itemId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!changelog || changelog.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum registro no histórico</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Linha vertical */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-6">
        {changelog.map((entry, index) => (
          <div key={entry.id} className="relative flex gap-4 pl-1">
            {/* Ícone do evento */}
            <div 
              className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-white ${ACAO_COLORS[entry.acao] || "bg-gray-500"}`}
            >
              {ACAO_ICONS[entry.acao] || <RefreshCw className="h-4 w-4" />}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">
                  {ACAO_LABELS[entry.acao] || entry.acao}
                </span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>

              {entry.usuario && (
                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{entry.usuario.nome}</span>
                </div>
              )}

              {entry.observacao && (
                <p className="mt-2 text-sm bg-muted/50 rounded-lg p-2">
                  {entry.observacao}
                </p>
              )}

              {/* Dados de mudança */}
              {entry.dados_anteriores && entry.dados_novos && (
                <div className="mt-2 grid gap-2 text-xs">
                  {Object.keys(entry.dados_novos).map(key => {
                    const anterior = (entry.dados_anteriores as Record<string, unknown>)?.[key];
                    const novo = (entry.dados_novos as Record<string, unknown>)?.[key];
                    
                    if (anterior === novo) return null;
                    
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span>
                        <span className="text-red-500 line-through">{String(anterior || "-")}</span>
                        <span>→</span>
                        <span className="text-green-500">{String(novo || "-")}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
