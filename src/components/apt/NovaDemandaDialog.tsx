import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormattedTextarea } from "@/components/ui/formatted-textarea";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Loader2, X, ChevronDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
}

interface Setor {
  id: string;
  nome: string;
}

interface NovaDemandaDialogProps {
  profiles: Profile[];
  setores: Setor[];
  onDemandaCriada: () => void;
  lockedSetorId?: string;
}

export default function NovaDemandaDialog({
  profiles,
  setores,
  onDemandaCriada,
  lockedSetorId,
}: NovaDemandaDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [responsaveisPopoverOpen, setResponsaveisPopoverOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    responsavel_ids: [] as string[],
    setor_id: lockedSetorId || "",
    descricao: "",
    observacoes: "",
    semanas_repeticao: "1",
    semana_limite: [1] as number[],
    mes: String(new Date().getMonth() + 1),
    ano: String(new Date().getFullYear()),
    prioritaria: false,
    muito_urgente: false,
  });

  const resetForm = () => {
    setFormData({
      responsavel_ids: [],
      setor_id: lockedSetorId || "",
      descricao: "",
      observacoes: "",
      semanas_repeticao: "1",
      semana_limite: [1],
      mes: String(new Date().getMonth() + 1),
      ano: String(new Date().getFullYear()),
      prioritaria: false,
      muito_urgente: false,
    });
  };

  const isSetorLocked = !!lockedSetorId;

  const toggleResponsavel = (userId: string) => {
    setFormData((prev) => {
      const current = prev.responsavel_ids;
      if (current.includes(userId)) {
        return { ...prev, responsavel_ids: current.filter((id) => id !== userId) };
      } else {
        return { ...prev, responsavel_ids: [...current, userId] };
      }
    });
  };

  const removeResponsavel = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      responsavel_ids: prev.responsavel_ids.filter((id) => id !== userId),
    }));
  };

  const getResponsavelNome = (userId: string) => {
    return profiles.find((p) => p.user_id === userId)?.nome || "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.responsavel_ids.length === 0 || !formData.descricao.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
      });
      return;
    }

    if (formData.semana_limite.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione pelo menos uma semana limite",
      });
      return;
    }

    setIsLoading(true);

    // Create demands for each responsible
    // Each responsible gets their own grupo_id if multiple weeks are selected
    const allDemandas: {
      responsavel_id: string;
      setor_id: string | null;
      descricao: string;
      observacoes: string | null;
      semanas_repeticao: number;
      semana_limite: number[];
      mes: number;
      ano: number;
      prioritaria: boolean;
      muito_urgente: boolean;
      grupo_id: string | null;
    }[] = [];

    for (const responsavelId of formData.responsavel_ids) {
      // Generate a unique group ID for this responsible if multiple weeks
      const grupoId = formData.semana_limite.length > 1 
        ? crypto.randomUUID() 
        : null;

      // Create one demand for each selected week for this responsible
      for (const semana of formData.semana_limite) {
        allDemandas.push({
          responsavel_id: responsavelId,
          setor_id: formData.setor_id || null,
          descricao: formData.descricao.trim(),
          observacoes: formData.observacoes.trim() || null,
          semanas_repeticao: parseInt(formData.semanas_repeticao),
          semana_limite: [semana],
          mes: parseInt(formData.mes),
          ano: parseInt(formData.ano),
          prioritaria: formData.prioritaria,
          muito_urgente: formData.muito_urgente,
          grupo_id: grupoId,
        });
      }
    }

    const { error } = await supabase.from("demandas").insert(allDemandas);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar demanda",
        description: error.message,
      });
    } else {
      const totalDemandas = allDemandas.length;
      const numResponsaveis = formData.responsavel_ids.length;
      const numSemanas = formData.semana_limite.length;
      
      let description = "";
      if (numResponsaveis > 1 && numSemanas > 1) {
        description = `${totalDemandas} demandas criadas (${numResponsaveis} responsáveis × ${numSemanas} semanas)`;
      } else if (numResponsaveis > 1) {
        description = `${totalDemandas} demandas criadas (uma para cada responsável)`;
      } else if (numSemanas > 1) {
        description = `${totalDemandas} demandas criadas (uma para cada semana)`;
      } else {
        description = "A demanda foi adicionada com sucesso";
      }
      
      toast({
        title: totalDemandas > 1 ? "Demandas criadas!" : "Demanda criada!",
        description,
      });
      resetForm();
      setOpen(false);
      onDemandaCriada();
    }

    setIsLoading(false);
  };

  const toggleSemana = (semana: number) => {
    setFormData((prev) => {
      const current = prev.semana_limite;
      let newSemanas: number[];
      if (current.includes(semana)) {
        newSemanas = current.filter((s) => s !== semana);
        // Don't allow empty - keep at least one
        if (newSemanas.length === 0) newSemanas = [semana];
      } else {
        newSemanas = [...current, semana].sort();
      }
      // Auto-update repetições based on selected weeks count
      return { 
        ...prev, 
        semana_limite: newSemanas,
        semanas_repeticao: String(newSemanas.length)
      };
    });
  };

  const meses = [
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
  const anos = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentYear - 2 + i),
    label: String(currentYear - 2 + i),
  }));

  const totalDemandas = formData.responsavel_ids.length * formData.semana_limite.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Demanda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Demanda</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Responsáveis *</Label>
            <Popover open={responsaveisPopoverOpen} onOpenChange={setResponsaveisPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {formData.responsavel_ids.length > 0
                    ? `${formData.responsavel_ids.length} selecionado(s)`
                    : "Selecione os responsáveis"}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <div className="max-h-60 overflow-y-auto p-1">
                  {profiles.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted",
                        formData.responsavel_ids.includes(p.user_id) && "bg-muted"
                      )}
                      onClick={() => toggleResponsavel(p.user_id)}
                    >
                      <div className={cn(
                        "h-4 w-4 border rounded flex items-center justify-center",
                        formData.responsavel_ids.includes(p.user_id) 
                          ? "bg-primary border-primary" 
                          : "border-input"
                      )}>
                        {formData.responsavel_ids.includes(p.user_id) && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <span className="text-sm">{p.nome}</span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Badges dos responsáveis selecionados */}
            {formData.responsavel_ids.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {formData.responsavel_ids.map((userId) => (
                  <Badge
                    key={userId}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {getResponsavelNome(userId)}
                    <button
                      type="button"
                      onClick={() => removeResponsavel(userId)}
                      className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            
            {formData.responsavel_ids.length > 1 && (
              <p className="text-xs text-muted-foreground">
                Será criada uma demanda separada para cada responsável
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="setor">Setor {isSetorLocked && <span className="text-xs text-muted-foreground">(bloqueado)</span>}</Label>
            <Select
              value={formData.setor_id}
              onValueChange={(v) =>
                setFormData((prev) => ({ ...prev, setor_id: v }))
              }
              disabled={isSetorLocked}
            >
              <SelectTrigger className={isSetorLocked ? "bg-muted" : ""}>
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {setores.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição *</Label>
            <FormattedTextarea
              id="descricao"
              placeholder="Descreva a demanda..."
              value={formData.descricao}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, descricao: e.target.value }))
              }
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações adicionais (opcional)..."
              value={formData.observacoes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, observacoes: e.target.value }))
              }
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="semanas">Repetições</Label>
            <Input
              id="semanas"
              type="number"
              min="1"
              max="52"
              value={formData.semanas_repeticao}
              readOnly
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Calculado automaticamente pelas semanas selecionadas
            </p>
          </div>

          <div className="space-y-2">
            <Label>Semanas *</Label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={formData.semana_limite.includes(s) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleSemana(s)}
                >
                  {s}ª
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {formData.semana_limite.length > 1 
                ? `Demandas de múltiplas semanas do mesmo responsável serão irmãs`
                : "Selecione uma ou mais semanas"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select
                value={formData.mes}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, mes: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ano</Label>
              <Select
                value={formData.ano}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, ano: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="prioritaria"
                checked={formData.prioritaria}
                disabled={formData.muito_urgente}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    prioritaria: checked as boolean,
                  }))
                }
              />
              <Label htmlFor="prioritaria" className="cursor-pointer">
                Demanda prioritária (destaque amarelo)
              </Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="muito_urgente"
                checked={formData.muito_urgente}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    muito_urgente: checked as boolean,
                    prioritaria: checked ? false : prev.prioritaria,
                  }))
                }
              />
              <Label htmlFor="muito_urgente" className="cursor-pointer text-destructive">
                Muito urgente (destaque vermelho)
              </Label>
            </div>
          </div>

          {/* Resumo */}
          {totalDemandas > 1 && (
            <div className="bg-muted/50 rounded-md p-3 text-sm">
              <p className="font-medium">Resumo:</p>
              <p className="text-muted-foreground">
                {formData.responsavel_ids.length} responsável(is) × {formData.semana_limite.length} semana(s) = <strong>{totalDemandas} demandas</strong>
              </p>
              {formData.semana_limite.length > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Demandas de cada responsável em diferentes semanas serão irmãs entre si
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                totalDemandas > 1 
                  ? `Criar ${totalDemandas} Demandas`
                  : "Criar Demanda"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
