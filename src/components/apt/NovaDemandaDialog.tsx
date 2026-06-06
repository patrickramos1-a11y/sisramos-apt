import { useEffect, useState } from "react";
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
import TagSelector from "@/components/apt/TagSelector";
import { AptTag, syncDemandTags } from "@/lib/tags";
import {
  DemandaModoExecucao,
  buildPrazoWeeks,
  isPrazoColumnMissingError,
} from "@/lib/demandas-prazo";

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
  const [availableTags, setAvailableTags] = useState<AptTag[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    responsavel_ids: [] as string[],
    setor_id: lockedSetorId || "",
    descricao: "",
    observacoes: "",
    modo_execucao: "semanal" as DemandaModoExecucao,
    semanas_repeticao: "1",
    semana_limite: [1] as number[],
    semana_inicio_prazo: "1",
    semana_fim_prazo: "1",
    mes: String(new Date().getMonth() + 1),
    ano: String(new Date().getFullYear()),
    prioritaria: false,
    muito_urgente: false,
    repetir_meses: false,
    intervalo_meses: "1",
    ocorrencias_meses: "2",
    tags: [] as string[],
  });

  const resetForm = () => {
    setFormData({
      responsavel_ids: [],
      setor_id: lockedSetorId || "",
      descricao: "",
      observacoes: "",
      modo_execucao: "semanal",
      semanas_repeticao: "1",
      semana_limite: [1],
      semana_inicio_prazo: "1",
      semana_fim_prazo: "1",
      mes: String(new Date().getMonth() + 1),
      ano: String(new Date().getFullYear()),
      prioritaria: false,
      muito_urgente: false,
      repetir_meses: false,
      intervalo_meses: "1",
      ocorrencias_meses: "2",
      tags: [],
    });
  };

  useEffect(() => {
    if (!open) return;
    supabase
      .from("tags")
      .select("id,nome,slug,cor")
      .order("nome")
      .then(({ data }) => setAvailableTags((data || []) as AptTag[]));
  }, [open]);

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

    if (
      formData.modo_execucao === "prazo" &&
      parseInt(formData.semana_inicio_prazo, 10) > parseInt(formData.semana_fim_prazo, 10)
    ) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A semana inicial não pode ser maior que a semana final do prazo.",
      });
      return;
    }

    setIsLoading(true);

    // Compute target months based on monthly recurrence
    const baseMes = parseInt(formData.mes);
    const baseAno = parseInt(formData.ano);
    const intervaloMeses = formData.repetir_meses ? parseInt(formData.intervalo_meses) : 1;
    const ocorrenciasMeses = formData.repetir_meses ? parseInt(formData.ocorrencias_meses) : 1;
    const targetMonths: { mes: number; ano: number }[] = [];
    for (let i = 0; i < ocorrenciasMeses; i++) {
      const offset = i * intervaloMeses;
      const d = new Date(baseAno, baseMes - 1 + offset, 1);
      targetMonths.push({ mes: d.getMonth() + 1, ano: d.getFullYear() });
    }

    // Create demands for each responsible
    // Each responsible gets their own grupo_id if multiple (week × month) combinations exist
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

    const prazoWeeks =
      formData.modo_execucao === "prazo"
        ? buildPrazoWeeks(
            parseInt(formData.semana_inicio_prazo, 10),
            parseInt(formData.semana_fim_prazo, 10)
          )
        : [];
    const totalPerResponsavel =
      (formData.modo_execucao === "prazo" ? 1 : formData.semana_limite.length) * targetMonths.length;

    for (const responsavelId of formData.responsavel_ids) {
      // Generate a unique group ID for this responsible if more than 1 demand will be created
      const grupoId = totalPerResponsavel > 1 ? crypto.randomUUID() : null;

      for (const { mes, ano } of targetMonths) {
        if (formData.modo_execucao === "prazo") {
          allDemandas.push({
            responsavel_id: responsavelId,
            setor_id: formData.setor_id || null,
            descricao: formData.descricao.trim(),
            observacoes: formData.observacoes.trim() || null,
            semanas_repeticao: 1,
            semana_limite: prazoWeeks,
            mes,
            ano,
            prioritaria: formData.prioritaria,
            muito_urgente: formData.muito_urgente,
            grupo_id: null,
          });
          continue;
        }

        for (const semana of formData.semana_limite) {
          allDemandas.push({
            responsavel_id: responsavelId,
            setor_id: formData.setor_id || null,
            descricao: formData.descricao.trim(),
            observacoes: formData.observacoes.trim() || null,
            semanas_repeticao: formData.semana_limite.length,
            semana_limite: [semana],
            mes,
            ano,
            prioritaria: formData.prioritaria,
            muito_urgente: formData.muito_urgente,
            grupo_id: grupoId,
          });
        }
      }
    }

    const { data: insertedDemandas, error } = await supabase
      .from("demandas")
      .insert(allDemandas)
      .select("id");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar demanda",
        description: error.message,
      });
    } else {
      const insertedIds = (insertedDemandas || []).map((item) => item.id);
      if (formData.modo_execucao === "prazo" && insertedIds.length > 0) {
        const patch = {
          modo_execucao: "prazo" as DemandaModoExecucao,
          semana_inicio_prazo: parseInt(formData.semana_inicio_prazo, 10),
          semana_fim_prazo: parseInt(formData.semana_fim_prazo, 10),
        };

        const { error: prazoError } = await supabase.from("demandas").update(patch).in("id", insertedIds);
        if (prazoError && isPrazoColumnMissingError(prazoError)) {
          toast({
            variant: "destructive",
            title: "Prazo não salvo",
            description: "As colunas de demanda com prazo não estão disponíveis no Supabase. Nada foi salvo apenas neste navegador.",
          });
          setIsLoading(false);
          return;
        } else if (prazoError) {
          toast({
            variant: "destructive",
            title: "Erro ao salvar prazo",
            description: prazoError.message,
          });
          setIsLoading(false);
          return;
        }
      }

      await syncDemandTags((insertedDemandas || []).map((item) => item.id), formData.tags);

      const totalDemandas = allDemandas.length;
      const numResponsaveis = formData.responsavel_ids.length;
      const numSemanas =
        formData.modo_execucao === "prazo" ? 1 : formData.semana_limite.length;
      const numMeses = targetMonths.length;

      const parts: string[] = [];
      if (numResponsaveis > 1) parts.push(`${numResponsaveis} responsáveis`);
      if (numMeses > 1) parts.push(`${numMeses} meses`);
      if (formData.modo_execucao === "prazo") parts.push("janela de prazo");
      else if (numSemanas > 1) parts.push(`${numSemanas} semanas`);
      const description = parts.length > 0
        ? `${totalDemandas} demandas criadas (${parts.join(" × ")})`
        : "A demanda foi adicionada com sucesso";
      
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

  const ocorrenciasMesesNum = formData.repetir_meses
    ? Math.max(1, parseInt(formData.ocorrencias_meses) || 1)
    : 1;
  const intervaloMesesNum = formData.repetir_meses
    ? Math.max(1, parseInt(formData.intervalo_meses) || 1)
    : 1;
  const totalDemandas =
    formData.responsavel_ids.length *
    (formData.modo_execucao === "prazo" ? 1 : formData.semana_limite.length) *
    ocorrenciasMesesNum;

  // Preview of target months for the recurrence block
  const previewMonths = (() => {
    const baseMes = parseInt(formData.mes);
    const baseAno = parseInt(formData.ano);
    const out: string[] = [];
    for (let i = 0; i < ocorrenciasMesesNum; i++) {
      const d = new Date(baseAno, baseMes - 1 + i * intervaloMesesNum, 1);
      out.push(
        d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
          .replace(".", "")
      );
    }
    return out;
  })();

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
                  {profiles.filter((p: any) => !p.deleted_at).map((p) => (
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

          <TagSelector
            tags={formData.tags}
            availableTags={availableTags}
            onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))}
          />

          <div className="space-y-2">
            <Label>Tipo de demanda</Label>
            <Select
              value={formData.modo_execucao}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  modo_execucao: value as DemandaModoExecucao,
                  semanas_repeticao: value === "prazo" ? "1" : String(prev.semana_limite.length),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semanal">Semanal / recorrente</SelectItem>
                <SelectItem value="prazo">Com prazo</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formData.modo_execucao === "prazo"
                ? "Fica disponível em uma única linha, da semana inicial até a semana final."
                : "Cria uma demanda por semana selecionada."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="semanas">Repetições</Label>
            <Input
              id="semanas"
              type="number"
              min="1"
              max="52"
              value={formData.modo_execucao === "prazo" ? "Prazo" : formData.semanas_repeticao}
              readOnly
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              {formData.modo_execucao === "prazo"
                ? "A demanda aparece como uma linha única dentro da janela definida."
                : "Calculado automaticamente pelas semanas selecionadas"}
            </p>
          </div>

          {formData.modo_execucao === "prazo" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Semana inicial</Label>
                <Select
                  value={formData.semana_inicio_prazo}
                  onValueChange={(value) =>
                    setFormData((prev) => {
                      const start = parseInt(value, 10);
                      const end = Math.max(start, parseInt(prev.semana_fim_prazo, 10));
                      return {
                        ...prev,
                        semana_inicio_prazo: value,
                        semana_fim_prazo: String(end),
                        semana_limite: buildPrazoWeeks(start, end),
                      };
                    })
                  }
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
                <Select
                  value={formData.semana_fim_prazo}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      semana_fim_prazo: value,
                      semana_limite: buildPrazoWeeks(
                        parseInt(prev.semana_inicio_prazo, 10),
                        parseInt(value, 10)
                      ),
                    }))
                  }
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

              <div className="col-span-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                Disponível da {formData.semana_inicio_prazo}ª até a {formData.semana_fim_prazo}ª semana.
              </div>
            </div>
          ) : (
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

          {/* Repetição mensal */}
          <div className="space-y-3 rounded-md border border-border p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="repetir_meses"
                checked={formData.repetir_meses}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    repetir_meses: checked as boolean,
                  }))
                }
              />
              <Label htmlFor="repetir_meses" className="cursor-pointer">
                Repetir em outros meses
              </Label>
            </div>

            {formData.repetir_meses && (
              <div className="space-y-3 pl-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">A cada</Label>
                    <Select
                      value={formData.intervalo_meses}
                      onValueChange={(v) =>
                        setFormData((prev) => ({ ...prev, intervalo_meses: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 6, 12].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n === 1 ? "1 mês" : `${n} meses`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ocorrências</Label>
                    <Input
                      type="number"
                      min={2}
                      max={12}
                      value={formData.ocorrencias_meses}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ocorrencias_meses: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Será criada{" "}
                  <strong>
                    {formData.modo_execucao === "prazo"
                      ? `na janela ${formData.semana_inicio_prazo}ª → ${formData.semana_fim_prazo}ª`
                      : `nas semanas ${formData.semana_limite.map((s) => `${s}ª`).join(", ")}`}
                  </strong>{" "}
                  de <strong>{previewMonths.join(", ")}</strong>
                </p>
              </div>
            )}
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
                {formData.responsavel_ids.length} responsável(is) ×{" "}
                {ocorrenciasMesesNum} mês(es) ×{" "}
                {formData.modo_execucao === "prazo" ? "1 janela" : `${formData.semana_limite.length} semana(s)`} ={" "}
                <strong>{totalDemandas} demandas</strong>
              </p>
              {(formData.modo_execucao === "semanal" && (formData.semana_limite.length > 1 || ocorrenciasMesesNum > 1)) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Demandas de cada responsável serão irmãs entre si (mesmo grupo)
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
