import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
}

interface EditarDemandaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demanda: Demanda | null;
  profiles: Profile[];
  setores: Setor[];
  onDemandaEditada: () => void;
}

export default function EditarDemandaDialog({
  open,
  onOpenChange,
  demanda,
  profiles,
  setores,
  onDemandaEditada,
}: EditarDemandaDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    responsavel_id: "",
    setor_id: "",
    descricao: "",
    semanas_repeticao: "1",
    semana_limite: [] as number[],
    mes: String(new Date().getMonth() + 1),
    ano: String(new Date().getFullYear()),
    prioritaria: false,
  });

  useEffect(() => {
    if (demanda) {
      setFormData({
        responsavel_id: demanda.responsavel_id,
        setor_id: demanda.setor_id || "",
        descricao: demanda.descricao,
        semanas_repeticao: String(demanda.semanas_repeticao),
        semana_limite: demanda.semana_limite || [1],
        mes: String(demanda.mes),
        ano: String(demanda.ano),
        prioritaria: demanda.prioritaria,
      });
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

    if (formData.semana_limite.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione pelo menos uma semana limite",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase
      .from("demandas")
      .update({
        responsavel_id: formData.responsavel_id,
        setor_id: formData.setor_id || null,
        descricao: formData.descricao.trim(),
        semanas_repeticao: parseInt(formData.semanas_repeticao),
        semana_limite: formData.semana_limite,
        mes: parseInt(formData.mes),
        ano: parseInt(formData.ano),
        prioritaria: formData.prioritaria,
      })
      .eq("id", demanda?.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao editar demanda",
        description: error.message,
      });
    } else {
      toast({
        title: "Demanda atualizada!",
        description: "As alterações foram salvas com sucesso",
      });
      onOpenChange(false);
      onDemandaEditada();
    }

    setIsLoading(false);
  };

  const toggleSemana = (semana: number) => {
    setFormData((prev) => {
      const current = prev.semana_limite;
      if (current.includes(semana)) {
        return { ...prev, semana_limite: current.filter((s) => s !== semana) };
      } else {
        return { ...prev, semana_limite: [...current, semana].sort() };
      }
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

  const semanas = [1, 2, 3, 4, 5];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Demanda #{demanda?.numero}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="semanas">Semanas (X)</Label>
            <Input
              id="semanas"
              type="number"
              min="1"
              max="52"
              value={formData.semanas_repeticao}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  semanas_repeticao: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Semana(s) Limite *</Label>
            <div className="flex flex-wrap gap-2">
              {semanas.map((s) => (
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
              Selecione uma ou mais semanas
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

          <div className="flex items-center gap-2">
            <Checkbox
              id="prioritaria"
              checked={formData.prioritaria}
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
