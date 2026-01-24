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
  DialogTrigger,
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
import { Loader2, ArrowRight, Copy, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

interface RolloverDemandasDialogProps {
  onRolloverComplete: () => void;
}

export default function RolloverDemandasDialog({
  onRolloverComplete,
}: RolloverDemandasDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    wouldCopy: number;
    wouldSkip: number;
  } | null>(null);

  const now = new Date();
  const lastMonth = now.getMonth(); // 0-based, so this is actually the previous month
  const lastMonthYear = lastMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const lastMonthNumber = lastMonth === 0 ? 12 : lastMonth;

  const [sourceMes, setSourceMes] = useState(String(lastMonthNumber));
  const [sourceAno, setSourceAno] = useState(String(lastMonthYear));
  const [targetMes, setTargetMes] = useState(String(now.getMonth() + 1));
  const [targetAno, setTargetAno] = useState(String(now.getFullYear()));

  const { toast } = useToast();

  const handlePreview = async () => {
    setIsLoading(true);
    setPreviewData(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "rollover-demandas",
        {
          body: {
            sourceMes: parseInt(sourceMes),
            sourceAno: parseInt(sourceAno),
            targetMes: parseInt(targetMes),
            targetAno: parseInt(targetAno),
            dryRun: true,
          },
        }
      );

      if (error) throw error;

      setPreviewData({
        wouldCopy: data.wouldCopy || 0,
        wouldSkip: data.wouldSkip || 0,
      });
    } catch (error) {
      console.error("Preview error:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao visualizar rollover",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollover = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "rollover-demandas",
        {
          body: {
            sourceMes: parseInt(sourceMes),
            sourceAno: parseInt(sourceAno),
            targetMes: parseInt(targetMes),
            targetAno: parseInt(targetAno),
            dryRun: false,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: data.message || `${data.copied} demandas copiadas`,
      });

      setOpen(false);
      setPreviewData(null);
      onRolloverComplete();
    } catch (error) {
      console.error("Rollover error:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao executar rollover",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sourceLabel = MESES.find((m) => m.value === sourceMes)?.label;
  const targetLabel = MESES.find((m) => m.value === targetMes)?.label;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Copy className="h-4 w-4" />
          <span className="hidden sm:inline">Copiar para próximo mês</span>
          <span className="sm:hidden">Copiar mês</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copiar Demandas para Outro Mês</DialogTitle>
          <DialogDescription>
            Copie as demandas de um mês para outro, mantendo o histórico original.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              As demandas serão <strong>copiadas</strong>, não movidas. O mês de
              origem manterá seu histórico intacto.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês Origem</Label>
              <Select value={sourceMes} onValueChange={setSourceMes}>
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
              <Label>Ano Origem</Label>
              <Select value={sourceAno} onValueChange={setSourceAno}>
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

          <div className="flex justify-center py-2">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>

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

          {previewData && (
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <p className="text-sm">
                <strong>{previewData.wouldCopy}</strong> demandas serão copiadas
              </p>
              <p className="text-xs text-muted-foreground">
                {previewData.wouldSkip} já existem no destino e serão ignoradas
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Visualizar
          </Button>
          <Button
            onClick={handleRollover}
            disabled={isLoading || !previewData || previewData.wouldCopy === 0}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Copiar {previewData ? `${previewData.wouldCopy}` : ""} Demandas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
