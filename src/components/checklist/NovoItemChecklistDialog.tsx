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
import { Layers, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { TipoItem, Prioridade } from "@/hooks/useChecklistV2";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
}

interface ChecklistMomentOption {
  id: string;
  label: string;
  description: string;
  semanas: number[];
  isActive?: boolean;
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
  defaultSemanas?: number[];
  momentOptions?: ChecklistMomentOption[];
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
  defaultSemanas,
  momentOptions = [],
}: NovoItemChecklistDialogProps) {
  const now = new Date();
  const getDefaultSemanaValues = () => {
    const source = defaultSemanas?.length ? defaultSemanas : [defaultSemana ?? 1];
    return [...new Set(source)]
      .filter((week) => week >= 1 && week <= 5)
      .sort((a, b) => a - b)
      .map(String);
  };

  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [link, setLink] = useState("");
  const [tipoItem, setTipoItem] = useState<TipoItem>("recorrente");
  const [prioridade, setPrioridade] = useState<Prioridade>(null);
  const [meses, setMeses] = useState<string[]>([String(defaultMes ?? now.getMonth() + 1)]);
  const [anos, setAnos] = useState<string[]>([String(defaultAno ?? now.getFullYear())]);
  const [semanas, setSemanas] = useState<string[]>(getDefaultSemanaValues);
  const [selectedResponsaveis, setSelectedResponsaveis] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, nome")
        .is("deleted_at", null);
      setProfiles((data as Profile[]) || []);
    };
    fetchProfiles();
  }, []);

  const totalItems = anos.length * meses.length * (tipoItem === "avulso_mes" ? 1 : semanas.length);

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
      setSemanas(getDefaultSemanaValues());
      setSelectedResponsaveis([]);
    }
  };

  const isValid = texto.trim() && anos.length > 0 && meses.length > 0 && semanas.length > 0;
  const selectedSemanaNumbers = semanas.map(Number).sort((a, b) => a - b);

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
          {momentOptions.length > 0 && tipoItem !== "avulso_mes" && (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <Label className="text-sm">Momento APT</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {momentOptions.map((option) => {
                  const optionWeeks = [...option.semanas].sort((a, b) => a - b);
                  const active =
                    optionWeeks.length === selectedSemanaNumbers.length &&
                    optionWeeks.every((week, index) => week === selectedSemanaNumbers[index]);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSemanas(optionWeeks.map(String))}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-xs transition-all",
                        active
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-background hover:border-primary/40 hover:bg-primary/5"
                      )}
                    >
                      <span className="block font-semibold">{option.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{option.description}</span>
                      {option.isActive && (
                        <span className="mt-1 inline-flex rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          Em andamento
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Escolha outro momento para preencher automaticamente as semanas do item recorrente.
              </p>
            </div>
          )}

          {/* Type selection */}
          <div className="space-y-2">
            <Label>Tipo do Item</Label>
            <Select
              value={tipoItem}
              onValueChange={(value) => {
                const nextType = value as TipoItem;
                setTipoItem(nextType);
                setSemanas(nextType === "avulso_mes" ? ["1"] : getDefaultSemanaValues());
              }}
            >
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
                <SelectItem value="avulso_mes">
                  <div>
                    <span className="font-medium">Avulso do mês</span>
                    <span className="text-xs text-muted-foreground ml-2">— Fica ativo até receber um resultado</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority selection */}
          <div className="space-y-2">
            <Label>Prioridade <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
            <div className="flex items-center gap-1">
              {([
                { value: "alta" as const, label: "Alta", dotClass: "bg-red-500" },
                { value: "media" as const, label: "Média", dotClass: "bg-amber-500" },
                { value: "baixa" as const, label: "Baixa", dotClass: "bg-green-500" },
              ]).map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPrioridade(prioridade === p.value ? null : p.value)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                    prioridade === p.value
                      ? p.value === "alta" ? "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30"
                      : p.value === "media" ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30"
                      : "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"
                      : "bg-muted/30 text-muted-foreground border-transparent hover:border-border"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", p.dotClass)} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className={cn("grid gap-3", tipoItem === "avulso_mes" ? "grid-cols-2" : "grid-cols-3")}>
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
            {tipoItem !== "avulso_mes" && (
              <div className="space-y-2">
                <Label>Semana</Label>
                <MultiSelectDropdown
                  options={SEMANAS}
                  selected={semanas}
                  onChange={setSemanas}
                  placeholder="Semana"
                />
              </div>
            )}
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

          {tipoItem === "avulso_mes" && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-md">
              O item ficará na fila mensal até ser marcado como feito, não feito, não relevante ou não consegui fazer.
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
