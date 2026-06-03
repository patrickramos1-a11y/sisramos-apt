import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormattedTextarea } from "@/components/ui/formatted-textarea";
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
import TagSelector from "@/components/apt/TagSelector";
import { AptTag, syncDemandTags } from "@/lib/tags";
import {
  DemandaModoExecucao,
  buildPrazoWeeks,
  clearDemandasPrazoMeta,
  isDemandaPrazo,
  isPrazoColumnMissingError,
  saveDemandasPrazoMeta,
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

interface Demanda {
  id: string;
  numero: number;
  setor_id: string | null;
  responsavel_id: string;
  descricao: string;
  observacoes?: string | null;
  semanas_repeticao: number;
  semana_limite: number[];
  mes: number;
  ano: number;
  prioritaria: boolean;
  muito_urgente?: boolean;
  grupo_id: string | null;
  modo_execucao?: DemandaModoExecucao | null;
  semana_inicio_prazo?: number | null;
  semana_fim_prazo?: number | null;
  tags?: AptTag[];
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
  const [actualSiblingCount, setActualSiblingCount] = useState(siblingCount);
  const [resolvedGrupoId, setResolvedGrupoId] = useState<string | null>(null);
  const [siblingMonths, setSiblingMonths] = useState<{ mes: number; ano: number }[]>([]);
  const [availableTags, setAvailableTags] = useState<AptTag[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    responsavel_id: "",
    setor_id: "",
    descricao: "",
    observacoes: "",
    modo_execucao: "semanal" as DemandaModoExecucao,
    semanas_selecionadas: [1] as number[],
    semana_inicio_prazo: "1",
    semana_fim_prazo: "1",
    mes: String(new Date().getMonth() + 1),
    ano: String(new Date().getFullYear()),
    prioritaria: false,
    muito_urgente: false,
    tags: [] as string[],
  });

  useEffect(() => {
    if (!open) return;
    supabase
      .from("tags")
      .select("id,nome,slug,cor")
      .order("nome")
      .then(({ data }) => setAvailableTags((data || []) as AptTag[]));
  }, [open]);

  // Fetch actual sibling count from database when dialog opens (ignoring filters)
  // Uses heuristic fallback when grupo_id is null but semanas_repeticao > 1
  useEffect(() => {
    if (!open || !demanda) return;

    const fetchActualSiblingCount = async () => {
      // Primary: fetch by grupo_id
      if (demanda.grupo_id) {
        const { data, error } = await supabase
          .from("demandas")
          .select("id, mes, ano")
          .eq("grupo_id", demanda.grupo_id)
          .eq("ativa", true);
        
        if (!error && data && data.length > 1) {
          setActualSiblingCount(data.length);
          setResolvedGrupoId(demanda.grupo_id);
          setSiblingMonths(data.map((d) => ({ mes: d.mes, ano: d.ano })));
          return;
        }
      }

      // Heuristic fallback #1: same descricao + responsavel + mes + ano
      if (demanda.semanas_repeticao > 1) {
        const { data, error } = await supabase
          .from("demandas")
          .select("id, grupo_id, mes, ano")
          .eq("descricao", demanda.descricao)
          .eq("responsavel_id", demanda.responsavel_id)
          .eq("mes", demanda.mes)
          .eq("ano", demanda.ano)
          .eq("ativa", true);

        if (!error && data && data.length > 1) {
          setActualSiblingCount(data.length);

          // Auto-fix: assign grupo_id if missing
          const existingGrupoId = data.find((d) => d.grupo_id)?.grupo_id ?? null;
          let groupId: string | null = demanda.grupo_id ?? existingGrupoId;
          if (!groupId) {
            groupId = crypto.randomUUID();
            const siblingIds = data.map((d) => d.id);
            const { error: fixError } = await supabase
              .from("demandas")
              .update({ grupo_id: groupId })
              .in("id", siblingIds);
            if (fixError) {
              console.error("Error assigning grupo_id to orphan siblings:", fixError);
            }
          }
          setResolvedGrupoId(groupId);
          setSiblingMonths(data.map((d) => ({ mes: d.mes, ano: d.ano })));
          return;
        }

        // Heuristic fallback #2: descrição pode ter divergido por edições
        // parciais. Procurar por (responsavel_id, mes, ano, semanas_repeticao)
        // e validar que cobrem semanas distintas (1 demanda por semana).
        const { data: data2, error: error2 } = await supabase
          .from("demandas")
          .select("id, grupo_id, mes, ano, semana_limite, semanas_repeticao")
          .eq("responsavel_id", demanda.responsavel_id)
          .eq("mes", demanda.mes)
          .eq("ano", demanda.ano)
          .eq("semanas_repeticao", demanda.semanas_repeticao)
          .eq("ativa", true);

        if (!error2 && data2 && data2.length === demanda.semanas_repeticao) {
          // Validar: cada demanda deve cobrir uma semana única
          const allWeeks = data2.flatMap((d) => d.semana_limite || []);
          const uniqueWeeks = new Set(allWeeks);
          if (uniqueWeeks.size === allWeeks.length && data2.length > 1) {
            // É um grupo quebrado de irmãs — reagrupar
            let groupId =
              demanda.grupo_id ??
              data2.find((d) => d.grupo_id)?.grupo_id ??
              null;
            if (!groupId) groupId = crypto.randomUUID();

            const siblingIds = data2.map((d) => d.id);
            const { error: fixError } = await supabase
              .from("demandas")
              .update({ grupo_id: groupId })
              .in("id", siblingIds);
            if (fixError) {
              console.error("Error re-grouping broken siblings:", fixError);
            }

            setActualSiblingCount(data2.length);
            setResolvedGrupoId(groupId);
            setSiblingMonths(data2.map((d) => ({ mes: d.mes, ano: d.ano })));
            return;
          }
        }
      }

      setActualSiblingCount(siblingCount);
      setResolvedGrupoId(demanda.grupo_id ?? null);
      setSiblingMonths(demanda ? [{ mes: demanda.mes, ano: demanda.ano }] : []);
    };

    fetchActualSiblingCount();
  }, [open, demanda?.id, demanda?.grupo_id, siblingCount]);

  useEffect(() => {
    if (demanda) {
      setFormData({
        responsavel_id: demanda.responsavel_id,
        setor_id: demanda.setor_id || "",
        descricao: demanda.descricao,
        observacoes: demanda.observacoes ?? "",
        modo_execucao: isDemandaPrazo(demanda) ? "prazo" : "semanal",
        semanas_selecionadas: demanda.semana_limite || [1],
        semana_inicio_prazo: String(demanda.semana_inicio_prazo ?? demanda.semana_limite?.[0] ?? 1),
        semana_fim_prazo: String(
          demanda.semana_fim_prazo ?? demanda.semana_limite?.[demanda.semana_limite.length - 1] ?? 1
        ),
        mes: String(demanda.mes),
        ano: String(demanda.ano),
        prioritaria: demanda.prioritaria,
        muito_urgente: demanda.muito_urgente || false,
        tags: (demanda.tags || []).map((tag) => tag.nome),
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

    if (formData.semanas_selecionadas.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione pelo menos uma semana",
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
        description: "A semana inicial do prazo não pode ser maior que a final.",
      });
      return;
    }

    setIsLoading(true);

    try {
      let tagSyncGroupId = resolvedGrupoId ?? demanda?.grupo_id ?? null;
      const isMultiMonthGroup =
        new Set(siblingMonths.map((m) => `${m.mes}-${m.ano}`)).size > 1;

      const baseUpdateData: Record<string, unknown> = {
        responsavel_id: formData.responsavel_id,
        setor_id: formData.setor_id || null,
        descricao: formData.descricao.trim(),
        observacoes: formData.observacoes.trim() || null,
        prioritaria: formData.prioritaria,
        muito_urgente: formData.muito_urgente,
      };
      // Only push mes/ano in single-month groups OR when editing a single demand
      if (!isMultiMonthGroup || editScope === "single") {
        baseUpdateData.mes = parseInt(formData.mes);
        baseUpdateData.ano = parseInt(formData.ano);
      }
      const prazoWeeks =
        formData.modo_execucao === "prazo"
          ? buildPrazoWeeks(
              parseInt(formData.semana_inicio_prazo, 10),
              parseInt(formData.semana_fim_prazo, 10)
            )
          : [];
      const persistPrazoMeta = async (ids: string[]) => {
        if (ids.length === 0) return;
        if (formData.modo_execucao === "prazo") {
          const patch = {
            modo_execucao: "prazo" as DemandaModoExecucao,
            semana_inicio_prazo: parseInt(formData.semana_inicio_prazo, 10),
            semana_fim_prazo: parseInt(formData.semana_fim_prazo, 10),
          };
          const { error } = await supabase.from("demandas").update(patch).in("id", ids);
          if (error && isPrazoColumnMissingError(error)) saveDemandasPrazoMeta(ids, patch);
          else if (error) throw error;
          else saveDemandasPrazoMeta(ids, patch);
          return;
        }

        const { error } = await supabase
          .from("demandas")
          .update({
            modo_execucao: "semanal",
            semana_inicio_prazo: null,
            semana_fim_prazo: null,
          })
          .in("id", ids);
        if (error && !isPrazoColumnMissingError(error)) throw error;
        clearDemandasPrazoMeta(ids);
      };

      if (editScope === "all") {
        if (!resolvedGrupoId) {
          toast({
            variant: "destructive",
            title: "Não foi possível atualizar todas",
            description:
              "Não foi possível identificar o grupo desta demanda. Tente recarregar a página e editar novamente.",
          });
          setIsLoading(false);
          return;
        }

        if (formData.modo_execucao === "prazo") {
          const { data: siblings, error: siblingsError } = await supabase
            .from("demandas")
            .select("id")
            .eq("grupo_id", resolvedGrupoId)
            .eq("ativa", true)
            .order("numero", { ascending: true });

          if (siblingsError) throw siblingsError;
          const siblingIds = (siblings || []).map((item) => item.id);
          const keeperId = siblingIds[0] ?? demanda?.id;
          const idsToDeactivate = siblingIds.filter((id) => id !== keeperId);

          const { error: keeperError } = await supabase
            .from("demandas")
            .update({
              ...baseUpdateData,
              semana_limite: prazoWeeks,
              semanas_repeticao: 1,
              grupo_id: null,
            })
            .eq("id", keeperId);
          if (keeperError) throw keeperError;

          if (idsToDeactivate.length > 0) {
            const { error: deactivateError } = await supabase
              .from("demandas")
              .update({ ativa: false })
              .in("id", idsToDeactivate);
            if (deactivateError) throw deactivateError;
          }

          await persistPrazoMeta(keeperId ? [keeperId] : []);
          toast({
            title: "Demanda convertida!",
            description: "O grupo foi colapsado em uma única demanda com prazo.",
          });
        } else {
          // Update ALL siblings sharing the grupo_id with the same fields
          // (we deliberately do NOT update semana_limite to keep each sibling's week)
        const { data: updated, error } = await supabase
          .from("demandas")
          .update(baseUpdateData)
          .eq("grupo_id", resolvedGrupoId)
          .eq("ativa", true)
          .select("id");

        if (error) throw error;

        const affected = updated?.length ?? 0;
        if (affected === 0) {
          throw new Error(
            "Nenhuma demanda foi atualizada. Verifique se o grupo ainda existe.",
          );
        }

        toast({
          title: "Demandas atualizadas!",
          description: `${affected} demandas do grupo foram atualizadas`,
        });
          await persistPrazoMeta((updated || []).map((item) => item.id));
        }
      } else {
        // Single demand - check if we need to expand to multiple weeks
        const currentWeeks = demanda?.semana_limite || [];
        const newWeeks = formData.semanas_selecionadas;

        if (formData.modo_execucao === "prazo") {
          const { error } = await supabase
            .from("demandas")
            .update({
              ...baseUpdateData,
              semana_limite: prazoWeeks,
              semanas_repeticao: 1,
            })
            .eq("id", demanda?.id);
          if (error) throw error;
          await persistPrazoMeta(demanda?.id ? [demanda.id] : []);
          toast({
            title: "Demanda atualizada!",
            description: "A demanda agora usa janela de prazo.",
          });
        } else {
        
        // Find weeks to add (new siblings) and weeks to remove
        const weeksToAdd = newWeeks.filter(w => !currentWeeks.includes(w));
        const weeksToKeep = newWeeks.filter(w => currentWeeks.includes(w));
        
        // If this is a single demand (no grupo_id) and we're adding more weeks
        // OR if we're expanding an existing demand
        if (weeksToAdd.length > 0 || newWeeks.length !== currentWeeks.length || !currentWeeks.every(w => newWeeks.includes(w))) {
          // Get or create a grupo_id
          let grupoId = resolvedGrupoId ?? demanda?.grupo_id ?? null;
          if (!grupoId && newWeeks.length > 1) {
            grupoId = crypto.randomUUID();
          }
          tagSyncGroupId = grupoId;

          // Update the current demand with the first selected week
          const { error: updateError } = await supabase
            .from("demandas")
            .update({
              ...baseUpdateData,
              semana_limite: [newWeeks[0]],
              semanas_repeticao: newWeeks.length,
              grupo_id: newWeeks.length > 1 ? grupoId : null,
            })
            .eq("id", demanda?.id);

          if (updateError) throw updateError;

          // Create new siblings for additional weeks
          if (newWeeks.length > 1) {
            const newSiblings = newWeeks.slice(1).map(semana => ({
              responsavel_id: formData.responsavel_id,
              setor_id: formData.setor_id || null,
              descricao: formData.descricao.trim(),
              observacoes: formData.observacoes.trim() || null,
              mes: parseInt(formData.mes),
              ano: parseInt(formData.ano),
              prioritaria: formData.prioritaria,
              muito_urgente: formData.muito_urgente,
              semana_limite: [semana],
              semanas_repeticao: newWeeks.length,
              grupo_id: grupoId,
            }));

            // Check if siblings already exist for these weeks
            if (grupoId && demanda?.grupo_id) {
              // Get existing siblings
              const { data: existingSiblings } = await supabase
                .from("demandas")
                .select("id, semana_limite")
                .eq("grupo_id", grupoId)
                .neq("id", demanda.id);

              const existingWeeks = new Set(
                (existingSiblings || []).flatMap(s => s.semana_limite)
              );

              // Only insert siblings for weeks that don't exist yet
              const siblingsToInsert = newSiblings.filter(
                s => !existingWeeks.has(s.semana_limite[0])
              );

              if (siblingsToInsert.length > 0) {
                const { error: insertError } = await supabase
                  .from("demandas")
                  .insert(siblingsToInsert);

                if (insertError) throw insertError;
              }

              // Update existing siblings with new repetition count
              const { error: siblingUpdateError } = await supabase
                .from("demandas")
                .update({ semanas_repeticao: newWeeks.length })
                .eq("grupo_id", grupoId);

              if (siblingUpdateError) throw siblingUpdateError;
            } else {
              const { error: insertError } = await supabase
                .from("demandas")
                .insert(newSiblings);

              if (insertError) throw insertError;
            }
          }

          toast({
            title: "Demanda atualizada!",
            description: newWeeks.length > 1 
              ? `Demanda expandida para ${newWeeks.length} semanas`
              : "As alterações foram salvas com sucesso",
          });
        } else {
          // Simple update - no week changes
          const { error } = await supabase
            .from("demandas")
            .update({
              ...baseUpdateData,
              semana_limite: newWeeks,
              semanas_repeticao: newWeeks.length,
            })
            .eq("id", demanda?.id);

          if (error) throw error;

          toast({
            title: "Demanda atualizada!",
            description: "As alterações foram salvas com sucesso",
          });
        }
          const idsToSync = resolvedGrupoId
            ? (
                await supabase
                  .from("demandas")
                  .select("id")
                  .eq("grupo_id", resolvedGrupoId)
                  .eq("ativa", true)
              ).data?.map((item) => item.id) || (demanda?.id ? [demanda.id] : [])
            : demanda?.id
              ? [demanda.id]
              : [];
          await persistPrazoMeta(idsToSync);
        }
      }

      const tagTargetIds = await (async () => {
        const groupId = tagSyncGroupId;
        if (groupId) {
          const { data, error } = await supabase
            .from("demandas")
            .select("id")
            .eq("grupo_id", groupId)
            .eq("ativa", true);
          if (error) throw error;
          return (data || []).map((item) => item.id);
        }
        return demanda?.id ? [demanda.id] : [];
      })();
      await syncDemandTags(tagTargetIds, formData.tags);

      onOpenChange(false);
      // Small delay to ensure DB updates are processed
      setTimeout(() => {
        onDemandaEditada();
      }, 200);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao editar demanda",
        description: error.message,
      });
    }

    setIsLoading(false);
  };

  const toggleSemana = (semana: number) => {
    setFormData((prev) => {
      const current = prev.semanas_selecionadas;
      if (current.includes(semana)) {
        // Don't allow removing all weeks
        if (current.length === 1) return prev;
        return {
          ...prev,
          semanas_selecionadas: current.filter((s) => s !== semana),
        };
      } else {
        return {
          ...prev,
          semanas_selecionadas: [...current, semana].sort((a, b) => a - b),
        };
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

  const hasSiblings = actualSiblingCount > 1;
  const isMultiMonthGroup =
    new Set(siblingMonths.map((m) => `${m.mes}-${m.ano}`)).size > 1;
  const distinctMonthCount = new Set(
    siblingMonths.map((m) => `${m.mes}-${m.ano}`),
  ).size;
  const lockMonthYear = hasSiblings && editScope === "all" && isMultiMonthGroup;
  const lockSemanas = hasSiblings && editScope === "all" && isMultiMonthGroup;

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
                    Todas as {actualSiblingCount} demandas do grupo
                    {isMultiMonthGroup && ` (em ${distinctMonthCount} meses)`}
                  </Label>
                </div>
              </RadioGroup>
              {lockMonthYear && (
                <p className="text-xs text-muted-foreground">
                  Este grupo abrange vários meses. Mês/ano e semanas só podem
                  ser alterados em "Apenas esta demanda".
                </p>
              )}
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
                {profiles.filter((p: any) => !p.deleted_at).map((p) => (
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="semanas">Repetições</Label>
            <Input
              id="semanas"
              type="number"
              min="1"
              max="52"
              value={formData.modo_execucao === "prazo" ? "Prazo" : formData.semanas_selecionadas.length}
              readOnly
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              {formData.modo_execucao === "prazo"
                ? "A demanda fica ativa da semana inicial até a final."
                : "Calculado automaticamente com base nas semanas selecionadas"}
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
                        semanas_selecionadas: buildPrazoWeeks(start, end),
                      };
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {semanas.map((week) => (
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
                      semanas_selecionadas: buildPrazoWeeks(
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
                    {semanas.map((week) => (
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
          ) : editScope === "single" || !lockSemanas ? (
            <div className="space-y-2">
              <Label>Semanas (selecione uma ou mais)</Label>
              <div className="flex flex-wrap gap-2">
                {semanas.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={formData.semanas_selecionadas.includes(s) ? "default" : "outline"}
                    size="sm"
                    disabled={editScope === "all"}
                    onClick={() => toggleSemana(s)}
                  >
                    {s}ª
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.semanas_selecionadas.length > 1 
                  ? `Selecionadas: ${formData.semanas_selecionadas.map(s => `${s}ª`).join(", ")} - criará demandas irmãs automaticamente`
                  : "Selecione mais semanas para criar demandas irmãs"}
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select
                value={formData.mes}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, mes: v }))
                }
                disabled={lockMonthYear}
              >
                <SelectTrigger className={lockMonthYear ? "bg-muted" : ""}>
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
                disabled={lockMonthYear}
              >
                <SelectTrigger className={lockMonthYear ? "bg-muted" : ""}>
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
