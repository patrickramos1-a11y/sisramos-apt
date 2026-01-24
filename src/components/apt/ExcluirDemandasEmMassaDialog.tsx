import { useState, useEffect, useRef } from "react";
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
import { Loader2, AlertTriangle, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Demanda {
  id: string;
  numero: number;
  descricao: string;
  semana_limite: number[];
  grupo_id: string | null;
}

interface ExcluirDemandasEmMassaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandaIds: string[];
  allDemandas: Demanda[];
  onDemandasExcluidas: () => void;
}

const UNDO_TIMEOUT = 8000; // 8 seconds to undo

export default function ExcluirDemandasEmMassaDialog({
  open,
  onOpenChange,
  demandaIds,
  allDemandas,
  onDemandasExcluidas,
}: ExcluirDemandasEmMassaDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [includeIrmas, setIncludeIrmas] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast, dismiss } = useToast();
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDeleteRef = useRef<string[] | null>(null);

  // Calculate sibling info
  const selectedDemandas = allDemandas.filter((d) => demandaIds.includes(d.id));
  const grupoIds = [...new Set(selectedDemandas.map((d) => d.grupo_id).filter(Boolean))] as string[];
  
  // Find siblings not selected
  const siblingsNotSelected = allDemandas.filter(
    (d) => d.grupo_id && grupoIds.includes(d.grupo_id) && !demandaIds.includes(d.id)
  );
  
  const hasSiblings = siblingsNotSelected.length > 0;
  const totalWithSiblings = demandaIds.length + siblingsNotSelected.length;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setIncludeIrmas(false);
      setShowPreview(false);
    }
  }, [open]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const handleUndo = async (toastId: string) => {
    if (!pendingDeleteRef.current) return;
    
    // Cancel the pending permanent delete
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    // Restore the demands (set ativa back to true)
    const { error } = await supabase
      .from("demandas")
      .update({ ativa: true })
      .in("id", pendingDeleteRef.current);

    dismiss(toastId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao desfazer",
        description: error.message,
      });
    } else {
      toast({
        title: "Exclusão desfeita!",
        description: `${pendingDeleteRef.current.length} demanda(s) foram restauradas`,
      });
      onDemandasExcluidas();
    }

    pendingDeleteRef.current = null;
  };

  const permanentlyDelete = async (ids: string[]) => {
    const { error } = await supabase
      .from("demandas")
      .delete()
      .in("id", ids);

    if (error) {
      console.error("Error permanently deleting demands:", error);
    }
    
    pendingDeleteRef.current = null;
  };

  const handleDelete = async (withSiblings: boolean = false) => {
    if (demandaIds.length === 0) return;

    setIsLoading(true);

    let idsToDelete = [...demandaIds];

    // If user chose to include siblings, add them
    if (withSiblings && hasSiblings) {
      const siblingIds = siblingsNotSelected.map((d) => d.id);
      idsToDelete = [...new Set([...idsToDelete, ...siblingIds])];
    }

    // Soft delete first (set ativa to false)
    const { error } = await supabase
      .from("demandas")
      .update({ ativa: false })
      .in("id", idsToDelete);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir demandas",
        description: error.message,
      });
      setIsLoading(false);
      return;
    }

    // Store IDs for potential undo
    pendingDeleteRef.current = idsToDelete;

    // Show toast with undo option
    const { id: toastId } = toast({
      title: "Demandas excluídas!",
      description: (
        <div className="flex items-center justify-between gap-2">
          <span>{idsToDelete.length} demanda(s) removidas</span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1"
            onClick={() => handleUndo(toastId)}
          >
            <Undo2 className="h-3 w-3" />
            Desfazer
          </Button>
        </div>
      ),
      duration: UNDO_TIMEOUT,
    });

    // Schedule permanent delete after timeout
    undoTimeoutRef.current = setTimeout(() => {
      if (pendingDeleteRef.current) {
        permanentlyDelete(pendingDeleteRef.current);
      }
    }, UNDO_TIMEOUT + 500);

    onOpenChange(false);
    onDemandasExcluidas();
    setIsLoading(false);
  };

  const getSemanaLabel = (semanas: number[]) => {
    if (!semanas || semanas.length === 0) return "";
    return semanas.map(s => `${s}ª`).join(", ");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Excluir {demandaIds.length} demanda(s)?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                As demandas serão removidas. Você terá alguns segundos para desfazer a ação.
              </p>
              
              {hasSiblings && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-destructive">
                        Demandas irmãs encontradas
                      </p>
                      <p className="text-muted-foreground mt-1">
                        {siblingsNotSelected.length} demanda(s) relacionada(s) não foram selecionadas.
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 mt-1 text-xs"
                        onClick={() => setShowPreview(!showPreview)}
                      >
                        {showPreview ? "Ocultar preview" : "Ver demandas irmãs"}
                      </Button>
                    </div>
                  </div>

                  {showPreview && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted px-3 py-2 text-xs font-medium">
                        Demandas irmãs que serão incluídas:
                      </div>
                      <ScrollArea className="max-h-40">
                        <div className="p-2 space-y-1.5">
                          {siblingsNotSelected.map((d) => (
                            <div
                              key={d.id}
                              className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs"
                            >
                              <Badge variant="outline" className="font-mono shrink-0">
                                #{d.numero}
                              </Badge>
                              <span className="truncate flex-1">{d.descricao}</span>
                              <Badge variant="secondary" className="shrink-0">
                                {getSemanaLabel(d.semana_limite)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
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
                onClick={() => handleDelete(false)}
                disabled={isLoading}
              >
                {isLoading && !includeIrmas ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Apenas selecionadas ({demandaIds.length})
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setIncludeIrmas(true);
                  handleDelete(true);
                }}
                disabled={isLoading}
              >
                {isLoading && includeIrmas ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Incluir irmãs ({totalWithSiblings})
              </Button>
            </>
          ) : (
            <Button
              variant="destructive"
              onClick={() => handleDelete(false)}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                `Excluir ${demandaIds.length} demanda(s)`
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
