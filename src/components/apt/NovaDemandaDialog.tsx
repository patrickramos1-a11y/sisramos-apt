import { useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
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

interface NovaDemandaDialogProps {
  profiles: Profile[];
  setores: Setor[];
  onDemandaCriada: () => void;
}

export default function NovaDemandaDialog({
  profiles,
  setores,
  onDemandaCriada,
}: NovaDemandaDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    responsavel_id: "",
    setor_id: "",
    descricao: "",
    semanas_repeticao: "1",
    semana_limite: "1",
    mes: String(new Date().getMonth() + 1),
    ano: String(new Date().getFullYear()),
    prioritaria: false,
  });

  const resetForm = () => {
    setFormData({
      responsavel_id: "",
      setor_id: "",
      descricao: "",
      semanas_repeticao: "1",
      semana_limite: "1",
      mes: String(new Date().getMonth() + 1),
      ano: String(new Date().getFullYear()),
      prioritaria: false,
    });
  };

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

    const { error } = await supabase.from("demandas").insert({
      responsavel_id: formData.responsavel_id,
      setor_id: formData.setor_id || null,
      descricao: formData.descricao.trim(),
      semanas_repeticao: parseInt(formData.semanas_repeticao),
      semana_limite: parseInt(formData.semana_limite),
      mes: parseInt(formData.mes),
      ano: parseInt(formData.ano),
      prioritaria: formData.prioritaria,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar demanda",
        description: error.message,
      });
    } else {
      toast({
        title: "Demanda criada!",
        description: "A demanda foi adicionada com sucesso",
      });
      resetForm();
      setOpen(false);
      onDemandaCriada();
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

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="semanaLimite">Semana Limite</Label>
              <Select
                value={formData.semana_limite}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, semana_limite: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1ª Semana</SelectItem>
                  <SelectItem value="2">2ª Semana</SelectItem>
                  <SelectItem value="3">3ª Semana</SelectItem>
                  <SelectItem value="4">4ª Semana</SelectItem>
                  <SelectItem value="5">5ª Semana</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                "Criar Demanda"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
