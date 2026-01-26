import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
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
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
}

interface Setor {
  id: string;
  nome: string;
}

interface Demanda {
  id: string;
  numero: number;
  setor_id: string | null;
  responsavel_id: string;
  descricao: string;
  semanas_repeticao: number;
  semana_limite: number[];
  mes: number;
  ano: number;
  prioritaria: boolean;
  muito_urgente?: boolean;
  grupo_id: string | null;
}

interface EditarDemandaIrmaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demanda: Demanda | null;
  profiles: Profile[];
  setores: Setor[];
  siblingCount: number;
  onDemandaEditada: () => void;
}

export default function EditarDemandaIrmaDialog({
  open,
  onOpenChange,
  demanda,
  profiles,
  setores,
  siblingCount,
  onDemandaEditada,
}: EditarDemandaIrmaDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [editScope, setEditScope] = useState<"single" | "all">("single");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    responsavel_id: "",
    setor_id: "",
    descricao: "",
    semanas_repeticao: "1",
    semana_limite: 1,
    mes: String(new Date().getMonth() + 1),
    ano: String(new Date().getFullYear()),
    prioritaria: false,
    muito_urgente: false,
  });

  useEffect(() => {
    if (demanda) {
      setFormData({
        responsavel_id: demanda.responsavel_id,
        setor_id: demanda.setor_id || "",
        descricao: demanda.descricao,
        semanas_repeticao: String(demanda.semanas_repeticao),
        semana_limite: demanda.semana_limite[0] || 1,
        mes: String(demanda.mes),
        ano: String(demanda.ano),
        prioritaria: demanda.prioritaria,
        muito_urgente: demanda.muito_urgente || false,
      });
      setEditScope("single");
    }
  }, [demanda]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.responsavel_id || !formData.descricao.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
      });
      return;
    }

    setIsLoading(true);

    const updateData = {
      responsavel_id: formData.responsavel_id,
      setor_id: formData.setor_id || null,
      descricao: formData.descricao.trim(),
      semanas_repeticao: parseInt(formData.semanas_repeticao),
      mes: parseInt(formData.mes),
      ano: parseInt(formData.ano),
      prioritaria: formData.prioritaria,
      muito_urgente: formData.muito_urgente,
    };

    let query;
    if (editScope === "all" && demanda?.grupo_id) {
      query = supabase
        .from("demandas")
        .update(updateData)
        .eq("grupo_id", demanda.grupo_id);
    } else {
      query = supabase
        .from("demandas")
        .update({
          ...updateData,
          semana_limite: [formData.semana_limite],
        })
        .eq("id", demanda?.id);
    }

    const { error } = await query;

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao editar demanda",
        description: error.message,
      });
    } else {
      toast({
        title: "Demanda atualizada!",
        description:
          editScope === "all"
            ? `${siblingCount} demandas foram atualizadas`
            : "As alterações foram salvas com sucesso",
      });
      onOpenChange(false);
      onDemandaEditada();
    }

    setIsLoading(false);
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

  const semanas = [1, 2, 3, 4, 5];

  const hasSiblings = demanda?.grupo_id && siblingCount > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Demanda #{demanda?.numero}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {hasSiblings && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <Label className="text-sm font-medium">Aplicar alterações em:</Label>
              <RadioGroup
                value={editScope}
                onValueChange={(v) => setEditScope(v as "single" | "all")}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="font-normal cursor-pointer">
                    Apenas esta demanda
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="font-normal cursor-pointer">
                    Todas as {siblingCount} demandas do grupo
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="responsavel">Responsável *</Label>
            <Select
              value={formData.responsavel_id}
              onValueChange={(v) =>
                setFormData((prev) => ({ ...prev, responsavel_id: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o responsável" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.user_id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="setor">Setor</Label>
            <Select
              value={formData.setor_id}
              onValueChange={(v) =>
                setFormData((prev) => ({ ...prev, setor_id: v }))
              }
            >
              <SelectTrigger>
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
            <Textarea
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
              {siblingCount > 1 
                ? `Calculado automaticamente (${siblingCount} demandas no grupo)`
                : "Demanda individual"}
            </p>
          </div>

          {editScope === "single" && (
            <div className="space-y-2">
              <Label>Semana Limite</Label>
              <div className="flex flex-wrap gap-2">
                {semanas.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={formData.semana_limite === s ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, semana_limite: s }))
                    }
                  >
                    {s}ª
                  </Button>
                ))}
              </div>
            </div>
          )}

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

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
