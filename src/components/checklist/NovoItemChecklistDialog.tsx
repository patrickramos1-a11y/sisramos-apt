import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { Plus } from "lucide-react";

interface NovoItemChecklistDialogProps {
  onAddItem: (texto: string, semana: number, mes: number, ano: number) => Promise<void>;
  defaultMes?: number;
  defaultAno?: number;
  defaultSemana?: number;
}

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

const SEMANAS = [
  { value: "1", label: "1ª Semana" },
  { value: "2", label: "2ª Semana" },
  { value: "3", label: "3ª Semana" },
  { value: "4", label: "4ª Semana" },
  { value: "5", label: "5ª Semana" },
];

const currentYear = new Date().getFullYear();
const ANOS = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - 2 + i),
  label: String(currentYear - 2 + i),
}));

export default function NovoItemChecklistDialog({
  onAddItem,
  defaultMes,
  defaultAno,
  defaultSemana,
}: NovoItemChecklistDialogProps) {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [meses, setMeses] = useState<string[]>([String(defaultMes ?? now.getMonth() + 1)]);
  const [anos, setAnos] = useState<string[]>([String(defaultAno ?? now.getFullYear())]);
  const [semanas, setSemanas] = useState<string[]>([String(defaultSemana ?? 1)]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate total items that will be created
  const totalItems = anos.length * meses.length * semanas.length;

  const handleSubmit = async () => {
    if (!texto.trim() || anos.length === 0 || meses.length === 0 || semanas.length === 0) return;
    
    setIsSubmitting(true);
    try {
      // Create an item for each combination of year, month, and week
      for (const ano of anos) {
        for (const mes of meses) {
          for (const semana of semanas) {
            await onAddItem(texto.trim(), parseInt(semana), parseInt(mes), parseInt(ano));
          }
        }
      }
      setTexto("");
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Reset to defaults when opening
      setTexto("");
      setMeses([String(defaultMes ?? now.getMonth() + 1)]);
      setAnos([String(defaultAno ?? now.getFullYear())]);
      setSemanas([String(defaultSemana ?? 1)]);
    }
  };

  const isValid = texto.trim() && anos.length > 0 && meses.length > 0 && semanas.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Item</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Item do Checklist</DialogTitle>
          <DialogDescription>
            Adicione um novo item ao checklist. Selecione os períodos desejados (pode selecionar múltiplos).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Period selection - multi-select */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Ano</Label>
              <MultiSelectDropdown
                options={ANOS}
                selected={anos}
                onChange={setAnos}
                placeholder="Ano"
              />
            </div>

            <div className="space-y-2">
              <Label>Mês</Label>
              <MultiSelectDropdown
                options={MESES}
                selected={meses}
                onChange={setMeses}
                placeholder="Mês"
              />
            </div>

            <div className="space-y-2">
              <Label>Semana</Label>
              <MultiSelectDropdown
                options={SEMANAS}
                selected={semanas}
                onChange={setSemanas}
                placeholder="Semana"
              />
            </div>
          </div>

          {/* Info about how many items will be created */}
          {totalItems > 1 && (
            <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
              Serão criados <strong>{totalItems} itens</strong> (1 para cada combinação de ano/mês/semana selecionada)
            </p>
          )}

          {/* Text input */}
          <div className="space-y-2">
            <Label htmlFor="texto">Descrição do Item</Label>
            <Textarea
              id="texto"
              placeholder="Digite a descrição do item do checklist..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="min-h-[100px] resize-none"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? "Adicionando..." : totalItems > 1 ? `Adicionar ${totalItems} itens` : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
