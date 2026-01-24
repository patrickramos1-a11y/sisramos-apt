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

interface ExcluirDemandaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandaId: string | null;
  demandaNumero: number | null;
  onDemandaExcluida: () => void;
}

export default function ExcluirDemandaDialog({
  open,
  onOpenChange,
  demandaId,
  demandaNumero,
  onDemandaExcluida,
}: ExcluirDemandaDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
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

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Demanda #{demandaNumero}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. A demanda será permanentemente
            removida do sistema.
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
              "Excluir"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
