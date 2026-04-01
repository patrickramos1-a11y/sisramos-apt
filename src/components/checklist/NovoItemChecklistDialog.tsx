import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TipoItem, Prioridade } from "@/hooks/useChecklistV2";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
}

interface NovoItemChecklistDialogProps {
  onAddItem: (params: {
    descricao: string;
    tipo_item: TipoItem;
    semanas: number[];
    meses: number[];
    anos: number[];
    link?: string;
    assignees?: string[];
    prioridade?: Prioridade;
  }) => Promise<void>;
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
  const [link, setLink] = useState("");
  const [tipoItem, setTipoItem] = useState<TipoItem>("recorrente");
  const [prioridade, setPrioridade] = useState<Prioridade>(null);
  const [meses, setMeses] = useState<string[]>([String(defaultMes ?? now.getMonth() + 1)]);
  const [anos, setAnos] = useState<string[]>([String(defaultAno ?? now.getFullYear())]);
  const [semanas, setSemanas] = useState<string[]>([String(defaultSemana ?? 1)]);
  const [selectedResponsaveis, setSelectedResponsaveis] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase.from("profiles").select("id, user_id, nome");
      setProfiles((data as Profile[]) || []);
    };
    fetchProfiles();
  }, []);

  const totalItems = anos.length * meses.length * semanas.length;

  const responsavelOptions = profiles.map(p => ({
    value: p.user_id,
    label: p.nome,
  }));

  const handleSubmit = async () => {
    if (!texto.trim() || anos.length === 0 || meses.length === 0 || semanas.length === 0) return;

    setIsSubmitting(true);
    try {
      await onAddItem({
        descricao: texto.trim(),
        tipo_item: tipoItem,
        semanas: semanas.map(Number),
        meses: meses.map(Number),
        anos: anos.map(Number),
        link: link.trim() || undefined,
        assignees: selectedResponsaveis.length > 0 ? selectedResponsaveis : undefined,
        prioridade,
      });
      setTexto("");
      setLink("");
      setSelectedResponsaveis([]);
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setTexto("");
      setLink("");
      setTipoItem("recorrente");
      setPrioridade(null);
      setMeses([String(defaultMes ?? now.getMonth() + 1)]);
      setAnos([String(defaultAno ?? now.getFullYear())]);
      setSemanas([String(defaultSemana ?? 1)]);
      setSelectedResponsaveis([]);
    }
  };

  const isValid = texto.trim() && anos.length > 0 && meses.length > 0 && semanas.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="h-7 gap-1 text-xs">
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Novo Item</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Item do Checklist</DialogTitle>
          <DialogDescription>
            Selecione o tipo e os períodos desejados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type selection */}
          <div className="space-y-2">
            <Label>Tipo do Item</Label>
            <Select value={tipoItem} onValueChange={(v) => setTipoItem(v as TipoItem)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recorrente">
                  <div>
                    <span className="font-medium">Recorrente</span>
                    <span className="text-xs text-muted-foreground ml-2">— Persiste entre meses</span>
                  </div>
                </SelectItem>
                <SelectItem value="avulso_semana">
                  <div>
                    <span className="font-medium">Avulso da Semana</span>
                    <span className="text-xs text-muted-foreground ml-2">— Não copia</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority selection */}
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={prioridade} onValueChange={(v) => setPrioridade(v as Prioridade)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alta">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="font-medium">Alta</span>
                  </span>
                </SelectItem>
                <SelectItem value="media">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="font-medium">Média</span>
                  </span>
                </SelectItem>
                <SelectItem value="baixa">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="font-medium">Baixa</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
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

          {/* Responsáveis */}
          <div className="space-y-2">
            <Label>Responsáveis (opcional)</Label>
            <MultiSelectDropdown
              options={responsavelOptions}
              selected={selectedResponsaveis}
              onChange={setSelectedResponsaveis}
              placeholder="Selecionar responsáveis..."
            />
          </div>

          {/* Info */}
          {totalItems > 1 && (
            <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
              Serão criados <strong>{totalItems} itens</strong> (1 para cada combinação)
            </p>
          )}

          {tipoItem === "avulso_semana" && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-md">
              ⚠ Itens avulsos da semana <strong>não serão copiados</strong> ao usar "Copiar mês".
            </p>
          )}

          {/* Text */}
          <div className="space-y-2">
            <Label htmlFor="texto">Descrição</Label>
            <Textarea
              id="texto"
              placeholder="Digite a descrição do item..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="min-h-[80px] resize-none"
              autoFocus
            />
          </div>

          {/* Link */}
          <div className="space-y-2">
            <Label htmlFor="link">Link de referência (opcional)</Label>
            <Input
              id="link"
              placeholder="https://link-de-referencia.com"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? "Adicionando..." : totalItems > 1 ? `Adicionar ${totalItems} itens` : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
