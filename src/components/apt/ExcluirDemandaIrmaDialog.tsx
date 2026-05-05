import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { playDeleteSound } from "@/lib/audioFeedback";

interface SiblingDemanda {
  id: string;
  numero: number;
  descricao: string;
  semana_limite: number[];
  mes?: number;
  ano?: number;
}

interface ExcluirDemandaIrmaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandaId: string | null;
  demandaNumero: number | null;
  grupoId: string | null;
  siblingCount: number;
  siblings?: SiblingDemanda[];
  onDemandaExcluida: () => void;
  // Heuristic fields for fallback when grupo_id is null
  demandaDescricao?: string;
  demandaResponsavelId?: string;
  demandaMes?: number;
  demandaAno?: number;
  demandaSemanasRepeticao?: number;
}

export default function ExcluirDemandaIrmaDialog({
  open,
  onOpenChange,
  demandaId,
  demandaNumero,
  grupoId,
  siblingCount,
  siblings: passedSiblings = [],
  onDemandaExcluida,
  demandaDescricao,
  demandaResponsavelId,
  demandaMes,
  demandaAno,
  demandaSemanasRepeticao,
}: ExcluirDemandaIrmaDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [allSiblings, setAllSiblings] = useState<SiblingDemanda[]>([]);
  const [actualSiblingCount, setActualSiblingCount] = useState(siblingCount);
  const [resolvedGrupoId, setResolvedGrupoId] = useState<string | null>(grupoId);
  const { toast } = useToast();

  // Fetch all siblings from DB when dialog opens
  useEffect(() => {
    if (!open) return;

    const fetchSiblings = async () => {
      if (grupoId) {
        // Primary path: fetch by grupo_id
        const { data, error } = await supabase
          .from("demandas")
          .select("id, numero, descricao, semana_limite, mes, ano")
          .eq("grupo_id", grupoId)
          .eq("ativa", true);
        
        if (!error && data && data.length > 1) {
          setAllSiblings(data);
          setActualSiblingCount(data.length);
          setResolvedGrupoId(grupoId);
          return;
        }
      }

      // Heuristic fallback: search by descricao + responsavel + mes + ano
      if (demandaSemanasRepeticao && demandaSemanasRepeticao > 1 && demandaDescricao && demandaResponsavelId && demandaMes && demandaAno) {
        const { data, error } = await supabase
          .from("demandas")
          .select("id, numero, descricao, semana_limite, grupo_id, mes, ano")
          .eq("descricao", demandaDescricao)
          .eq("responsavel_id", demandaResponsavelId)
          .eq("mes", demandaMes)
          .eq("ano", demandaAno)
          .eq("ativa", true);

        if (!error && data && data.length > 1) {
          setAllSiblings(
            data.map((d) => ({
              id: d.id,
              numero: d.numero,
              descricao: d.descricao,
              semana_limite: d.semana_limite,
              mes: d.mes,
              ano: d.ano,
            })),
          );
          setActualSiblingCount(data.length);

          // Auto-fix: assign a shared grupo_id to all these orphan siblings
          const newGrupoId = crypto.randomUUID();
          const siblingIds = data.map(d => d.id);
          await supabase
            .from("demandas")
            .update({ grupo_id: newGrupoId })
            .in("id", siblingIds);
          
          setResolvedGrupoId(newGrupoId);
          return;
        }
      }

      // No siblings found
      setAllSiblings(passedSiblings);
      setActualSiblingCount(siblingCount);
      setResolvedGrupoId(grupoId);
    };

    fetchSiblings();
  }, [open, grupoId, demandaDescricao, demandaResponsavelId, demandaMes, demandaAno, demandaSemanasRepeticao, passedSiblings, siblingCount]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setShowPreview(false);
    }
  }, [open]);

  const updateSiblingsRepetitions = async (grupoIdToUpdate: string) => {
    const { data: remainingSiblings, error: fetchError } = await supabase
      .from("demandas")
      .select("id")
      .eq("grupo_id", grupoIdToUpdate)
      .eq("ativa", true);

    if (fetchError) {
      console.error("Error fetching remaining siblings:", fetchError);
      return;
    }

    const remainingCount = remainingSiblings?.length || 0;

    if (remainingCount > 0) {
      const { error: updateError } = await supabase
        .from("demandas")
        .update({ semanas_repeticao: remainingCount })
        .eq("grupo_id", grupoIdToUpdate)
        .eq("ativa", true);

      if (updateError) {
        console.error("Error updating siblings repetitions:", updateError);
      }
    }
  };

  const handleDeleteSingle = async () => {
    if (!demandaId) return;

    setIsLoading(true);

    const { data: deleted, error } = await supabase
      .from("demandas")
      .delete()
      .eq("id", demandaId)
      .select("id");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir demanda",
        description: error.message,
      });
      setIsLoading(false);
      return;
    }

    if (!deleted || deleted.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhuma demanda removida",
        description:
          "A demanda pode já ter sido removida ou está bloqueada por permissões.",
      });
      setIsLoading(false);
      return;
    }

    if (resolvedGrupoId) {
      await updateSiblingsRepetitions(resolvedGrupoId);
    }

    playDeleteSound();

    toast({
      title: "Demanda excluída!",
      description: `Demanda #${demandaNumero} removida permanentemente`,
    });

    onOpenChange(false);
    setIsLoading(false);
    
    setTimeout(() => {
      onDemandaExcluida();
    }, 100);
  };

  const handleDeleteAll = async () => {
    if (!resolvedGrupoId) {
      toast({
        variant: "destructive",
        title: "Grupo não identificado",
        description:
          "Não foi possível identificar o grupo desta demanda. Recarregue a página e tente de novo.",
      });
      return;
    }

    setIsLoading(true);

    const { data: deleted, error } = await supabase
      .from("demandas")
      .delete()
      .eq("grupo_id", resolvedGrupoId)
      .select("id");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir demandas",
        description: error.message,
      });
      setIsLoading(false);
      return;
    }

    const affected = deleted?.length ?? 0;
    if (affected === 0) {
      toast({
        variant: "destructive",
        title: "Nenhuma demanda removida",
        description:
          "O grupo pode já ter sido removido. Recarregue a página e tente novamente.",
      });
      setIsLoading(false);
      return;
    }

    playDeleteSound();

    toast({
      title: "Demandas excluídas!",
      description: `${affected} demandas do grupo removidas permanentemente`,
    });

    onOpenChange(false);
    setIsLoading(false);
    setTimeout(() => {
      onDemandaExcluida();
    }, 100);
  };

  const hasSiblings = resolvedGrupoId && actualSiblingCount > 1;
  
  const otherSiblings = allSiblings.filter(s => s.id !== demandaId);

  const getSemanaLabel = (semanas: number[]) => {
    if (!semanas || semanas.length === 0) return "";
    return semanas.map(s => `${s}ª`).join(", ");
  };

  const getMesLabel = (mes?: number, ano?: number) => {
    if (!mes || !ano) return "";
    const d = new Date(ano, mes - 1, 1);
    return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Demanda #{demandaNumero}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {hasSiblings ? (
                <>
                  <p>
                    Esta demanda faz parte de um grupo com {actualSiblingCount} demandas
                    relacionadas (criadas em semanas diferentes).
                  </p>
                  
                  {otherSiblings.length > 0 && (
                    <div className="space-y-2">
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => setShowPreview(!showPreview)}
                      >
                        {showPreview ? "Ocultar demandas irmãs" : `Ver ${otherSiblings.length} demanda(s) irmã(s)`}
                      </Button>

                      {showPreview && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-muted px-3 py-2 text-xs font-medium">
                            Demandas que serão excluídas junto:
                          </div>
                          <ScrollArea className="max-h-32">
                            <div className="p-2 space-y-1.5">
                              {otherSiblings.map((s) => (
                                <div
                                  key={s.id}
                                  className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs"
                                >
                                  <Badge variant="outline" className="font-mono shrink-0">
                                    #{s.numero}
                                  </Badge>
                                  <span className="truncate flex-1">{s.descricao}</span>
                                  {s.mes && s.ano && (
                                    <Badge variant="outline" className="shrink-0 text-[10px]">
                                      {getMesLabel(s.mes, s.ano)}
                                    </Badge>
                                  )}
                                  <Badge variant="secondary" className="shrink-0">
                                    {getSemanaLabel(s.semana_limite)}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ Esta ação é permanente e não pode ser desfeita.
                  </p>
                </>
              ) : (
                <p>
                  A demanda será removida permanentemente. Esta ação não pode ser desfeita.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={hasSiblings ? "flex-col sm:flex-row gap-2" : ""}>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          {hasSiblings ? (
            <>
              <Button
                variant="secondary"
                onClick={handleDeleteSingle}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Apenas esta
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAll}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Todas ({actualSiblingCount})
              </Button>
            </>
          ) : (
            <Button
              variant="destructive"
              onClick={handleDeleteSingle}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
