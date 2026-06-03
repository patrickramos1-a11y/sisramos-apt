import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  AptRotinaModelo,
  useAptRotinas,
} from "@/hooks/useAptRotinas";
import {
  CalendarCheck2,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";

interface SetorRotinasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setor: {
    id: string;
    nome: string;
    cor: string | null;
  } | null;
}

interface Profile {
  user_id: string;
  nome: string;
  cor?: string | null;
}

interface RotinaForm {
  nome: string;
  descricao: string;
  responsavel_padrao_id: string;
  dias_semana: number[];
  semanas_aplicaveis: number[];
  ativo: boolean;
  exige_aprovacao: boolean;
  entra_calculo_apt: boolean;
  cor: string;
  icone: string;
}

const DIAS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

const DEFAULT_FORM: RotinaForm = {
  nome: "",
  descricao: "",
  responsavel_padrao_id: "",
  dias_semana: [1, 2, 3, 4, 5],
  semanas_aplicaveis: [1, 2, 3, 4, 5],
  ativo: true,
  exige_aprovacao: true,
  entra_calculo_apt: true,
  cor: "#f97316",
  icone: "refresh",
};

function toggleNumber(value: number, current: number[]) {
  if (current.includes(value)) return current.filter((item) => item !== value);
  return [...current, value].sort((a, b) => a - b);
}

function buildForm(modelo: AptRotinaModelo | null, fallbackColor: string): RotinaForm {
  if (!modelo) {
    return {
      ...DEFAULT_FORM,
      cor: fallbackColor || DEFAULT_FORM.cor,
    };
  }

  return {
    nome: modelo.nome,
    descricao: modelo.descricao,
    responsavel_padrao_id: modelo.responsavel_padrao_id || "",
    dias_semana: modelo.dias_semana,
    semanas_aplicaveis: modelo.semanas_aplicaveis,
    ativo: modelo.ativo,
    exige_aprovacao: modelo.exige_aprovacao,
    entra_calculo_apt: modelo.entra_calculo_apt,
    cor: modelo.cor || fallbackColor || DEFAULT_FORM.cor,
    icone: modelo.icone || "refresh",
  };
}

export default function SetorRotinasDialog({ open, onOpenChange, setor }: SetorRotinasDialogProps) {
  const now = new Date();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingModelo, setEditingModelo] = useState<AptRotinaModelo | null>(null);
  const [form, setForm] = useState<RotinaForm>(DEFAULT_FORM);
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    modelos,
    ocorrencias,
    isLoading,
    isMutating,
    tableUnavailable,
    createModelo,
    updateModelo,
    deleteModelo,
    gerarOcorrenciasDoPeriodo,
  } = useAptRotinas({
    mes: now.getMonth() + 1,
    ano: now.getFullYear(),
    setorId: setor?.id ?? null,
    enabled: open && Boolean(setor),
  });

  useEffect(() => {
    if (!open) return;

    const fetchProfiles = async () => {
      const { data } = await supabase.from("profiles").select("user_id,nome,cor").order("nome");
      setProfiles((data || []) as Profile[]);
    };

    void fetchProfiles();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setEditingModelo(null);
    setForm(buildForm(null, "#f97316"));
  }, [open, setor]);

  const estimatedOccurrences = useMemo(() => {
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const lastDay = new Date(year, month, 0).getDate();

    return Array.from({ length: lastDay }, (_, idx) => idx + 1).filter((day) => {
      const week = Math.min(5, Math.ceil(day / 7));
      const dayOfWeek = new Date(year, month - 1, day).getDay();
      return form.dias_semana.includes(dayOfWeek) && form.semanas_aplicaveis.includes(week);
    }).length;
  }, [form.dias_semana, form.semanas_aplicaveis, now]);

  const startCreate = () => {
    setEditingModelo(null);
    setForm(buildForm(null, "#f97316"));
  };

  const startEdit = (modelo: AptRotinaModelo) => {
    setEditingModelo(modelo);
    setForm(buildForm(modelo, "#f97316"));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!setor || !form.nome.trim() || !form.descricao.trim() || !form.responsavel_padrao_id) return;

    const payload = {
      setor_id: setor.id,
      nome: form.nome,
      descricao: form.descricao,
      responsavel_padrao_id: form.responsavel_padrao_id,
      dias_semana: form.dias_semana,
      semanas_aplicaveis: form.semanas_aplicaveis,
      ativo: form.ativo,
      exige_aprovacao: form.exige_aprovacao,
      entra_calculo_apt: form.entra_calculo_apt,
      cor: form.cor,
      icone: form.icone,
    };

    const ok = editingModelo
      ? await updateModelo(editingModelo.id, payload)
      : await createModelo(payload);

    if (ok) startCreate();
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    await gerarOcorrenciasDoPeriodo();
    setIsGenerating(false);
  };

  const occurrencesByModel = useMemo(() => {
    const map = new Map<string, number>();
    ocorrencias.forEach((item) => {
      map.set(item.modelo_id, (map.get(item.modelo_id) || 0) + 1);
    });
    return map;
  }, [ocorrencias]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck2 className="h-5 w-5 text-primary" />
            Rotinas persistentes {setor ? `- ${setor.nome}` : ""}
          </DialogTitle>
        </DialogHeader>

        {tableUnavailable && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Modo local ativo: as tabelas de rotinas persistentes ainda não existem no Supabase.
            Você consegue testar e visualizar neste navegador, mas para todos enxergarem igual o Lovable precisa aplicar
            <span className="font-mono"> 20260530120000_apt_rotinas_persistentes.sql</span>.
          </div>
        )}

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Modelos do setor</p>
                  <p className="text-xs text-muted-foreground">
                    Cada modelo gera ocorrências por data, sem virar demanda comum.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleGenerate} disabled={isGenerating || modelos.length === 0}>
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Gerar mês
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center rounded-2xl border p-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : modelos.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Nenhuma rotina persistente cadastrada neste setor.
                </div>
              ) : (
                <div className="space-y-2">
                  {modelos.map((modelo) => {
                    const profile = profiles.find((item) => item.user_id === modelo.responsavel_padrao_id);
                    return (
                      <button
                        key={modelo.id}
                        type="button"
                        onClick={() => startEdit(modelo)}
                        className={cn(
                          "w-full rounded-2xl border p-3 text-left transition-colors hover:bg-muted/50",
                          editingModelo?.id === modelo.id && "border-primary bg-primary/5"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: modelo.cor }} />
                              <span className="font-semibold">{modelo.nome}</span>
                              {!modelo.ativo && <Badge variant="outline">Inativa</Badge>}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{modelo.descricao}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Badge variant="secondary" className="rounded-full">
                                {profile?.nome || "Sem responsável padrão"}
                              </Badge>
                              <Badge variant="outline" className="rounded-full">
                                {occurrencesByModel.get(modelo.id) || 0} ocorrências no mês
                              </Badge>
                              {modelo.exige_aprovacao && <Badge variant="outline" className="rounded-full">Exige aprovação</Badge>}
                            </div>
                          </div>
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                            {modelo.semanas_aplicaveis.join(",")}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{editingModelo ? "Editar rotina" : "Nova rotina"}</p>
                  <p className="text-xs text-muted-foreground">
                    Estimativa: {estimatedOccurrences} ocorrências no mês atual.
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={startCreate}>
                  <Plus className="h-4 w-4" />
                  Limpar
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Nome da rotina</Label>
                <Input
                  value={form.nome}
                  onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
                  placeholder="Ex: Limpeza diária dos banheiros"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição operacional</Label>
                <Textarea
                  value={form.descricao}
                  onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
                  rows={4}
                  placeholder="Explique exatamente o que deve ser feito no dia."
                />
              </div>

              <div className="space-y-2">
                <Label>Responsável padrão</Label>
                <select
                  value={form.responsavel_padrao_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, responsavel_padrao_id: event.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecione um responsável</option>
                  {profiles.map((profile) => (
                    <option key={profile.user_id} value={profile.user_id}>
                      {profile.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Dias da semana</Label>
                <div className="flex flex-wrap gap-2">
                  {DIAS.map((dia) => {
                    const active = form.dias_semana.includes(dia.value);
                    return (
                      <button
                        key={dia.value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, dias_semana: toggleNumber(dia.value, prev.dias_semana) }))}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                          active ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                        )}
                      >
                        {dia.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Semanas aplicáveis</Label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((semana) => {
                    const active = form.semanas_aplicaveis.includes(semana);
                    return (
                      <button
                        key={semana}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({ ...prev, semanas_aplicaveis: toggleNumber(semana, prev.semanas_aplicaveis) }))
                        }
                        className={cn(
                          "h-8 w-10 rounded-full border text-xs font-bold transition-colors",
                          active ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
                        )}
                      >
                        {semana}ª
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 rounded-xl border bg-background p-3 text-sm">
                <label className="flex items-center justify-between gap-3">
                  <span>Ativa</span>
                  <Switch checked={form.ativo} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, ativo: checked }))} />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Exige aprovação do gestor</span>
                  <Switch
                    checked={form.exige_aprovacao}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, exige_aprovacao: checked }))}
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Entra no cálculo da APT</span>
                  <Switch
                    checked={form.entra_calculo_apt}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, entra_calculo_apt: checked }))}
                  />
                </label>
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="rotina-cor">Cor</Label>
                <Input
                  id="rotina-cor"
                  type="color"
                  value={form.cor}
                  onChange={(event) => setForm((prev) => ({ ...prev, cor: event.target.value }))}
                  className="h-9 w-14 cursor-pointer p-1"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                {editingModelo ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => deleteModelo(editingModelo.id).then((ok) => ok && startCreate())}
                    disabled={isMutating}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={isMutating || !form.nome.trim() || !form.descricao.trim() || !form.responsavel_padrao_id}>
                  {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {editingModelo ? "Salvar rotina" : "Criar rotina"}
                </Button>
              </div>
            </form>
          </div>

        <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          <Checkbox checked disabled className="mt-0.5" />
          <p>
            V1: as rotinas persistentes ficam separadas das demandas comuns. Elas geram ocorrências por data e entram
            na Execução como bloco operacional, sem mudar semanas/repetições da tabela atual.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
