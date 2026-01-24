import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Demanda {
  id: string;
  grupo_id: string | null;
}

interface ExcluirDemandasEmMassaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandaIds: string[];
  allDemandas: Demanda[];
  onDemandasExcluidas: () => void;
}

export default function ExcluirDemandasEmMassaDialog({
  open,
  onOpenChange,
  demandaIds,
  allDemandas,
  onDemandasExcluidas,
}: ExcluirDemandasEmMassaDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [includeIrmas, setIncludeIrmas] = useState(false);
  const { toast } = useToast();

  // Calculate sibling info
  const selectedDemandas = allDemandas.filter((d) => demandaIds.includes(d.id));
  const grupoIds = [...new Set(selectedDemandas.map((d) => d.grupo_id).filter(Boolean))] as string[];
  
  // Find siblings not selected
  const siblingsNotSelected = allDemandas.filter(
    (d) => d.grupo_id && grupoIds.includes(d.grupo_id) && !demandaIds.includes(d.id)
  );
  
  const hasSiblings = siblingsNotSelected.length > 0;
  const totalWithSiblings = demandaIds.length + siblingsNotSelected.length;

  // Reset includeIrmas when dialog opens
  useEffect(() => {
    if (open) {
      setIncludeIrmas(false);
    }
  }, [open]);

  const handleDelete = async () => {
    if (demandaIds.length === 0) return;

    setIsLoading(true);

    let idsToDelete = [...demandaIds];

    // If user chose to include siblings, add them
    if (includeIrmas && hasSiblings) {
      const siblingIds = siblingsNotSelected.map((d) => d.id);
      idsToDelete = [...new Set([...idsToDelete, ...siblingIds])];
    }

    const { error } = await supabase
      .from("demandas")
      .delete()
      .in("id", idsToDelete);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir demandas",
        description: error.message,
      });
    } else {
      toast({
        title: "Demandas excluídas!",
        description: `${idsToDelete.length} demanda(s) foram removidas com sucesso`,
      });
      onOpenChange(false);
      onDemandasExcluidas();
    }

    setIsLoading(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Excluir {demandaIds.length} demanda(s)?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Esta ação não pode ser desfeita. As demandas selecionadas serão
                permanentemente removidas do sistema.
              </p>
              
              {hasSiblings && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive">
                      Demandas irmãs encontradas
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {siblingsNotSelected.length} demanda(s) relacionada(s) não foram selecionadas 
                      (criadas em semanas diferentes do mesmo grupo).
                    </p>
                  </div>
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
                onClick={() => {
                  setIncludeIrmas(false);
                  handleDelete();
                }}
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
                  setTimeout(handleDelete, 0);
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
              onClick={handleDelete}
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
