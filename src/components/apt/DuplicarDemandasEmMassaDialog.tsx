import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Copy } from "lucide-react";

const MESES = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const currentYear = new Date().getFullYear();
const ANOS = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - 2 + i),
  label: String(currentYear - 2 + i),
}));

interface DuplicarDemandasEmMassaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  onComplete: () => void;
}

export default function DuplicarDemandasEmMassaDialog({
  open,
  onOpenChange,
  selectedIds,
  onComplete,
}: DuplicarDemandasEmMassaDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const now = new Date();
  const [targetMes, setTargetMes] = useState(String(now.getMonth() + 1));
  const [targetAno, setTargetAno] = useState(String(now.getFullYear()));
  const { toast } = useToast();

  const handleDuplicate = async () => {
    if (selectedIds.size === 0) return;

    setIsLoading(true);

    try {
      // Fetch the selected demands
      const { data: selectedDemandas, error: fetchError } = await supabase
        .from("demandas")
        .select("*")
        .in("id", Array.from(selectedIds));

      if (fetchError) throw fetchError;

      if (!selectedDemandas || selectedDemandas.length === 0) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Nenhuma demanda encontrada para duplicar",
        });
        return;
      }

      // Check for existing demands in target to avoid duplicates
      const { data: existingDemandas, error: existingError } = await supabase
        .from("demandas")
        .select("descricao, responsavel_id")
        .eq("mes", parseInt(targetMes))
        .eq("ano", parseInt(targetAno))
        .eq("ativa", true);

      if (existingError) throw existingError;

      const existingSignatures = new Set(
        (existingDemandas || []).map(
          (d) => `${d.descricao}-${d.responsavel_id}`
        )
      );

      // Prepare new demands
      const newDemandas = selectedDemandas
        .filter((d) => {
          const signature = `${d.descricao}-${d.responsavel_id}`;
          return !existingSignatures.has(signature);
        })
        .map((d) => ({
          setor_id: d.setor_id,
          responsavel_id: d.responsavel_id,
          descricao: d.descricao,
          semanas_repeticao: d.semanas_repeticao,
          semana_limite: d.semana_limite,
          prioritaria: d.prioritaria,
          ativa: true,
          mes: parseInt(targetMes),
          ano: parseInt(targetAno),
          status_responsavel: "pendente" as const,
          status_gestor: "pendente" as const,
          grupo_id: null,
        }));

      if (newDemandas.length === 0) {
        toast({
          title: "Atenção",
          description: "Todas as demandas selecionadas já existem no mês destino",
        });
        onOpenChange(false);
        return;
      }

      // Insert duplicated demands
      const { error: insertError } = await supabase
        .from("demandas")
        .insert(newDemandas);

      if (insertError) throw insertError;

      const mesLabel = MESES.find((m) => m.value === targetMes)?.label;
      
      toast({
        title: "Sucesso",
        description: `${newDemandas.length} demanda(s) duplicada(s) para ${mesLabel}/${targetAno}`,
      });

      onOpenChange(false);
      onComplete();
    } catch (error) {
      console.error("Duplicate error:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao duplicar demandas",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const targetLabel = MESES.find((m) => m.value === targetMes)?.label;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicar Demandas
          </DialogTitle>
          <DialogDescription>
            Duplicar {selectedIds.size} demanda(s) selecionada(s) para outro mês.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês Destino</Label>
              <Select value={targetMes} onValueChange={setTargetMes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ano Destino</Label>
              <Select value={targetAno} onValueChange={setTargetAno}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANOS.map((ano) => (
                    <SelectItem key={ano.value} value={ano.value}>
                      {ano.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>{selectedIds.size}</strong> demanda(s) serão duplicadas para{" "}
              <strong>{targetLabel}/{targetAno}</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              As demandas originais permanecerão inalteradas. Duplicatas existentes serão ignoradas.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDuplicate}
            disabled={isLoading || selectedIds.size === 0}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            Duplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
