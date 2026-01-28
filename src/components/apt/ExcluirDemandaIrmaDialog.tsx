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
}

export default function ExcluirDemandaIrmaDialog({
  open,
  onOpenChange,
  demandaId,
  demandaNumero,
  grupoId,
  siblingCount,
  siblings = [],
  onDemandaExcluida,
}: ExcluirDemandaIrmaDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setShowPreview(false);
    }
  }, [open]);

  const updateSiblingsRepetitions = async (grupoIdToUpdate: string) => {
    // Get remaining siblings in the group
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
      // Update semanas_repeticao for all remaining siblings
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

    // Hard delete - permanently remove from database
    const { error } = await supabase
      .from("demandas")
      .delete()
      .eq("id", demandaId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir demanda",
        description: error.message,
      });
      setIsLoading(false);
      return;
    }

    // Update siblings' repetitions if this is part of a group
    if (grupoId) {
      await updateSiblingsRepetitions(grupoId);
    }

    // Play delete sound
    playDeleteSound();

    toast({
      title: "Demanda excluída!",
      description: `Demanda #${demandaNumero} removida permanentemente`,
    });

    onOpenChange(false);
    setIsLoading(false);
    
    // Small delay to ensure DB update is complete before refresh
    setTimeout(() => {
      onDemandaExcluida();
    }, 100);
  };

  const handleDeleteAll = async () => {
    if (!grupoId) return;

    setIsLoading(true);

    // Hard delete - permanently remove all siblings from database
    const { error } = await supabase
      .from("demandas")
      .delete()
      .eq("grupo_id", grupoId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir demandas",
        description: error.message,
      });
      setIsLoading(false);
      return;
    }

    // Play delete sound
    playDeleteSound();

    toast({
      title: "Demandas excluídas!",
      description: `${siblingCount} demandas do grupo removidas permanentemente`,
    });

    onOpenChange(false);
    onDemandaExcluida();
    setIsLoading(false);
  };

  const hasSiblings = grupoId && siblingCount > 1;
  
  // Get other siblings (excluding current demand)
  const otherSiblings = siblings.filter(s => s.id !== demandaId);

  const getSemanaLabel = (semanas: number[]) => {
    if (!semanas || semanas.length === 0) return "";
    return semanas.map(s => `${s}ª`).join(", ");
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
                    Esta demanda faz parte de um grupo com {siblingCount} demandas
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
                Todas ({siblingCount})
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
