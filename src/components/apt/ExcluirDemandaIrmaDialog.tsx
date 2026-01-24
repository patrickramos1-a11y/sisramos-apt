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
import { Loader2, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

const UNDO_TIMEOUT = 8000; // 8 seconds to undo

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
  const { toast, dismiss } = useToast();
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDeleteRef = useRef<{ ids: string[]; byGroup: boolean } | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
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

    const { ids, byGroup } = pendingDeleteRef.current;

    // Restore the demands (set ativa back to true)
    let query = supabase.from("demandas").update({ ativa: true });
    
    if (byGroup && grupoId) {
      query = query.eq("grupo_id", grupoId);
    } else {
      query = query.in("id", ids);
    }

    const { error } = await query;

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
        description: byGroup 
          ? `${siblingCount} demandas foram restauradas`
          : "A demanda foi restaurada",
      });
      onDemandaExcluida();
    }

    pendingDeleteRef.current = null;
  };

  const permanentlyDelete = async (ids: string[], byGroup: boolean) => {
    let query = supabase.from("demandas").delete();
    
    if (byGroup && grupoId) {
      query = query.eq("grupo_id", grupoId);
    } else {
      query = query.in("id", ids);
    }

    const { error } = await query;

    if (error) {
      console.error("Error permanently deleting demands:", error);
    }
    
    pendingDeleteRef.current = null;
  };

  const handleDeleteSingle = async () => {
    if (!demandaId) return;

    setIsLoading(true);

    // Soft delete first (set ativa to false)
    const { error } = await supabase
      .from("demandas")
      .update({ ativa: false })
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

    // Store for potential undo
    pendingDeleteRef.current = { ids: [demandaId], byGroup: false };

    // Show toast with undo option
    const { id: toastId } = toast({
      title: "Demanda excluída!",
      description: (
        <div className="flex items-center justify-between gap-2">
          <span>Demanda #{demandaNumero} removida</span>
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
        permanentlyDelete(pendingDeleteRef.current.ids, pendingDeleteRef.current.byGroup);
      }
    }, UNDO_TIMEOUT + 500);

    onOpenChange(false);
    onDemandaExcluida();
    setIsLoading(false);
  };

  const handleDeleteAll = async () => {
    if (!grupoId) return;

    setIsLoading(true);

    // Soft delete first (set ativa to false)
    const { error } = await supabase
      .from("demandas")
      .update({ ativa: false })
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

    // Store for potential undo
    pendingDeleteRef.current = { ids: [], byGroup: true };

    // Show toast with undo option
    const { id: toastId } = toast({
      title: "Demandas excluídas!",
      description: (
        <div className="flex items-center justify-between gap-2">
          <span>{siblingCount} demandas do grupo removidas</span>
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
        permanentlyDelete(pendingDeleteRef.current.ids, pendingDeleteRef.current.byGroup);
      }
    }, UNDO_TIMEOUT + 500);

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
                  
                  <p className="text-sm text-muted-foreground">
                    Você terá alguns segundos para desfazer a ação.
                  </p>
                </>
              ) : (
                <p>
                  A demanda será removida. Você terá alguns segundos para desfazer a ação.
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
