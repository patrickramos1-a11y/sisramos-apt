import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  title?: string;
  selectedCount: number;
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: {
    semana_inicio_prazo: number;
    semana_fim_prazo: number;
    comportamento: "colapsar" | "preservar";
  }) => Promise<void> | void;
}

export default function TransformarDemandaPrazoDialog({
  open,
  title = "Transformar em demanda com prazo",
  selectedCount,
  isSaving = false,
  onOpenChange,
  onConfirm,
}: Props) {
  const [semanaInicio, setSemanaInicio] = useState("1");
  const [semanaFim, setSemanaFim] = useState("4");
  const [comportamento, setComportamento] = useState<"colapsar" | "preservar">("colapsar");

  useEffect(() => {
    if (!open) {
      setSemanaInicio("1");
      setSemanaFim("4");
      setComportamento("colapsar");
    }
  }, [open]);

  const handleConfirm = async () => {
    await onConfirm({
      semana_inicio_prazo: parseInt(semanaInicio, 10),
      semana_fim_prazo: parseInt(semanaFim, 10),
      comportamento,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {selectedCount} demanda(s) selecionada(s). A demanda com prazo aparece como linha única no mês, disponível dentro da janela definida.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Semana inicial</Label>
              <Select
                value={semanaInicio}
                onValueChange={(value) => {
                  setSemanaInicio(value);
                  if (parseInt(value, 10) > parseInt(semanaFim, 10)) setSemanaFim(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((week) => (
                    <SelectItem key={week} value={String(week)}>
                      {week}ª semana
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Semana final</Label>
              <Select value={semanaFim} onValueChange={setSemanaFim}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((week) => (
                    <SelectItem key={week} value={String(week)}>
                      {week}ª semana
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">
            Disponível da {semanaInicio}ª até a {semanaFim}ª semana.
          </div>

          <div className="space-y-2">
            <Label>Como converter</Label>
            <RadioGroup
              value={comportamento}
              onValueChange={(value) => setComportamento(value as "colapsar" | "preservar")}
              className="space-y-2"
            >
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3">
                <RadioGroupItem value="colapsar" id="prazo-colapsar" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Colapsar irmãs em uma linha única</p>
                  <p className="text-xs text-muted-foreground">
                    Recomendado para demandas repetidas por semana que devem virar uma única demanda com prazo.
                  </p>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3">
                <RadioGroupItem value="preservar" id="prazo-preservar" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Preservar linhas existentes</p>
                  <p className="text-xs text-muted-foreground">
                    Mantém todas as linhas selecionadas, aplicando a mesma janela de prazo em cada uma.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Aplicar"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
