import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Circle } from "lucide-react";

type StatusBolinha = "pendente" | "executado" | "nao_realizado";

interface AtualizarStatusEmMassaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandaIds: string[];
  type: "responsavel" | "gestor";
  onStatusAtualizado: () => void;
}

export default function AtualizarStatusEmMassaDialog({
  open,
  onOpenChange,
  demandaIds,
  type,
  onStatusAtualizado,
}: AtualizarStatusEmMassaDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const handleUpdateStatus = async (newStatus: StatusBolinha) => {
    if (demandaIds.length === 0) return;

    setIsLoading(true);

    const column = type === "responsavel" ? "status_responsavel" : "status_gestor";

    const { error } = await supabase
      .from("demandas")
      .update({ [column]: newStatus })
      .in("id", demandaIds);

    setIsLoading(false);

    if (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar status das demandas",
      });
    } else {
      toast({
        title: "Sucesso",
        description: `${demandaIds.length} demanda(s) atualizada(s) para "${getStatusLabel(newStatus)}"`,
      });
      onStatusAtualizado();
      onOpenChange(false);
    }
  };

  const getStatusLabel = (status: StatusBolinha) => {
    switch (status) {
      case "pendente":
        return "Pendente";
      case "executado":
        return type === "responsavel" ? "Feito" : "Aprovado";
      case "nao_realizado":
        return type === "responsavel" ? "Não realizado" : "Rejeitado";
    }
  };

  const title = type === "responsavel" 
    ? "Marcar como Feito em Massa" 
    : "Aprovar em Massa";

  const description = type === "responsavel"
    ? `Atualizar o status "Feito" de ${demandaIds.length} demanda(s) selecionada(s)`
    : `Atualizar o status "Aprovado" de ${demandaIds.length} demanda(s) selecionada(s)`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-4">
          <Button
            variant="outline"
            className="justify-start gap-3 h-12"
            onClick={() => handleUpdateStatus("executado")}
            disabled={isLoading}
          >
            <div className="w-5 h-5 rounded-full bg-[hsl(var(--apt-executado))] flex items-center justify-center">
              <CheckCircle2 className="h-3 w-3 text-white" />
            </div>
            <span>{type === "responsavel" ? "Marcar como Feito" : "Aprovar"}</span>
          </Button>

          <Button
            variant="outline"
            className="justify-start gap-3 h-12"
            onClick={() => handleUpdateStatus("nao_realizado")}
            disabled={isLoading}
          >
            <div className="w-5 h-5 rounded-full bg-[hsl(var(--apt-nao-realizado))] flex items-center justify-center">
              <XCircle className="h-3 w-3 text-white" />
            </div>
            <span>{type === "responsavel" ? "Marcar como Não Realizado" : "Rejeitar"}</span>
          </Button>

          <Button
            variant="outline"
            className="justify-start gap-3 h-12"
            onClick={() => handleUpdateStatus("pendente")}
            disabled={isLoading}
          >
            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground flex items-center justify-center">
              <Circle className="h-3 w-3 text-muted-foreground" />
            </div>
            <span>Voltar para Pendente</span>
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
