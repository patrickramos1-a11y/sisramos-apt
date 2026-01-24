import { useState } from "react";
import { Button } from "@/components/ui/button";
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

interface ExcluirDemandaIrmaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandaId: string | null;
  demandaNumero: number | null;
  grupoId: string | null;
  siblingCount: number;
  onDemandaExcluida: () => void;
}

export default function ExcluirDemandaIrmaDialog({
  open,
  onOpenChange,
  demandaId,
  demandaNumero,
  grupoId,
  siblingCount,
  onDemandaExcluida,
}: ExcluirDemandaIrmaDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDeleteSingle = async () => {
    if (!demandaId) return;

    setIsLoading(true);

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
    } else {
      toast({
        title: "Demanda excluída!",
        description: `A demanda #${demandaNumero} foi removida com sucesso`,
      });
      onOpenChange(false);
      onDemandaExcluida();
    }

    setIsLoading(false);
  };

  const handleDeleteAll = async () => {
    if (!grupoId) return;

    setIsLoading(true);

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
    } else {
      toast({
        title: "Demandas excluídas!",
        description: `${siblingCount} demandas do grupo foram removidas`,
      });
      onOpenChange(false);
      onDemandaExcluida();
    }

    setIsLoading(false);
  };

  const hasSiblings = grupoId && siblingCount > 1;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Demanda #{demandaNumero}?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasSiblings ? (
              <>
                Esta demanda faz parte de um grupo com {siblingCount} demandas
                relacionadas (criadas em semanas diferentes). Deseja excluir
                apenas esta ou todas do grupo?
              </>
            ) : (
              <>
                Esta ação não pode ser desfeita. A demanda será permanentemente
                removida do sistema.
              </>
            )}
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
