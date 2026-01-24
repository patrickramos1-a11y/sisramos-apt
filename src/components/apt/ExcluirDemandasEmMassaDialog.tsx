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

interface ExcluirDemandasEmMassaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandaIds: string[];
  onDemandasExcluidas: () => void;
}

export default function ExcluirDemandasEmMassaDialog({
  open,
  onOpenChange,
  demandaIds,
  onDemandasExcluidas,
}: ExcluirDemandasEmMassaDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (demandaIds.length === 0) return;

    setIsLoading(true);

    const { error } = await supabase
      .from("demandas")
      .delete()
      .in("id", demandaIds);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir demandas",
        description: error.message,
      });
    } else {
      toast({
        title: "Demandas excluídas!",
        description: `${demandaIds.length} demanda(s) foram removidas com sucesso`,
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
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. As demandas selecionadas serão
            permanentemente removidas do sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
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
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
