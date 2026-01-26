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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

interface NovoItemChecklistDialogProps {
  onAddItem: (texto: string, semana: number, mes: number, ano: number) => Promise<void>;
  defaultMes?: number;
  defaultAno?: number;
  defaultSemana?: number;
}

const MESES = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const SEMANAS = [
  { value: 1, label: "1ª Semana" },
  { value: 2, label: "2ª Semana" },
  { value: 3, label: "3ª Semana" },
  { value: 4, label: "4ª Semana" },
  { value: 5, label: "5ª Semana" },
];

const currentYear = new Date().getFullYear();
const ANOS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export default function NovoItemChecklistDialog({
  onAddItem,
  defaultMes,
  defaultAno,
  defaultSemana,
}: NovoItemChecklistDialogProps) {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [mes, setMes] = useState(defaultMes ?? now.getMonth() + 1);
  const [ano, setAno] = useState(defaultAno ?? now.getFullYear());
  const [semana, setSemana] = useState(defaultSemana ?? 1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!texto.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAddItem(texto.trim(), semana, mes, ano);
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
      setMes(defaultMes ?? now.getMonth() + 1);
      setAno(defaultAno ?? now.getFullYear());
      setSemana(defaultSemana ?? 1);
    }
  };

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
            Adicione um novo item ao checklist. Selecione o período desejado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Period selection */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ano">Ano</Label>
              <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
                <SelectTrigger id="ano">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANOS.map((a) => (
                    <SelectItem key={a} value={String(a)}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mes">Mês</Label>
              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger id="mes">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="semana">Semana</Label>
              <Select value={String(semana)} onValueChange={(v) => setSemana(Number(v))}>
                <SelectTrigger id="semana">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEMANAS.map((s) => (
                    <SelectItem key={s.value} value={String(s.value)}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
            disabled={!texto.trim() || isSubmitting}
          >
            {isSubmitting ? "Adicionando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
