import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, FileText, Code, CheckCircle, History, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useBacklogItem,
  useBacklogMutations,
  useBacklogChangelog,
  useBacklogValidacoes,
  useBacklogRegistros,
  STATUS_LABELS,
  CATEGORIAS_LABELS,
  PRIORIDADE_LABELS,
  IMPACTO_LABELS,
  ESFORCO_LABELS,
  TIPO_VALIDACAO_LABELS,
  BacklogStatus,
  BacklogCategoria,
  BacklogPrioridade,
  BacklogImpacto,
  BacklogEsforco,
  BacklogTipoValidacao
} from "@/hooks/useBacklog";
import { useAuth } from "@/contexts/AuthContext";
import BacklogChangelogTimeline from "./BacklogChangelogTimeline";
import BacklogValidacaoSection from "./BacklogValidacaoSection";
import BacklogRegistrosSection from "./BacklogRegistrosSection";

interface BacklogItemDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
}

export default function BacklogItemDetailDialog({ open, onOpenChange, itemId }: BacklogItemDetailDialogProps) {
  const { isGestorOrAdmin } = useAuth();
  const { data: item, isLoading } = useBacklogItem(itemId);
  const { atualizarItem } = useBacklogMutations();
  
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<{
    titulo: string;
    categoria: BacklogCategoria;
    status: BacklogStatus;
    prioridade: BacklogPrioridade;
    impacto_esperado: BacklogImpacto;
    estimativa_esforco: BacklogEsforco;
    descricao_detalhada: string;
    dependente_de_creditos: boolean;
    data_inicio_implementacao: string;
    data_conclusao: string;
    data_lancamento: string;
  } | null>(null);

  const { data: profiles } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    }
  });

  const { data: validacoes } = useBacklogValidacoes(itemId);

  const handleEdit = () => {
    if (item) {
      setForm({
        titulo: item.titulo,
        categoria: item.categoria,
        status: item.status,
        prioridade: item.prioridade,
        impacto_esperado: item.impacto_esperado,
        estimativa_esforco: item.estimativa_esforco,
        descricao_detalhada: item.descricao_detalhada || "",
        dependente_de_creditos: item.dependente_de_creditos,
        data_inicio_implementacao: item.data_inicio_implementacao || "",
        data_conclusao: item.data_conclusao || "",
        data_lancamento: item.data_lancamento || ""
      });
      setEditMode(true);
    }
  };

  const handleSave = async () => {
    if (!item || !form) return;

    // Validar se pode mudar para "validado"
    if (form.status === "validado" && (!validacoes || validacoes.filter(v => v.validado).length === 0)) {
      alert("É necessário pelo menos uma validação confirmada para marcar como Validado.");
      return;
    }

    await atualizarItem.mutateAsync({
      id: item.id,
      dados: {
        titulo: form.titulo,
        categoria: form.categoria,
        status: form.status,
        prioridade: form.prioridade,
        impacto_esperado: form.impacto_esperado,
        estimativa_esforco: form.estimativa_esforco,
        descricao_detalhada: form.descricao_detalhada || null,
        dependente_de_creditos: form.dependente_de_creditos,
        data_inicio_implementacao: form.data_inicio_implementacao || null,
        data_conclusao: form.data_conclusao || null,
        data_lancamento: form.data_lancamento || null
      },
      dadosAnteriores: {
        titulo: item.titulo,
        categoria: item.categoria,
        status: item.status,
        prioridade: item.prioridade,
        impacto_esperado: item.impacto_esperado,
        estimativa_esforco: item.estimativa_esforco,
        descricao_detalhada: item.descricao_detalhada,
        dependente_de_creditos: item.dependente_de_creditos
      }
    });

    setEditMode(false);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </DialogContent>
      </Dialog>
    );
  }

  if (!item) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono">#{item.numero}</span>
              {editMode ? (
                <Input
                  value={form?.titulo || ""}
                  onChange={(e) => setForm(f => f ? { ...f, titulo: e.target.value } : null)}
                  className="text-lg font-semibold"
                />
              ) : (
                <span>{item.titulo}</span>
              )}
            </DialogTitle>
            {isGestorOrAdmin && (
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Button variant="outline" onClick={() => setEditMode(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={atualizarItem.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={handleEdit}>
                    Editar
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList>
            <TabsTrigger value="info" className="gap-2">
              <Info className="h-4 w-4" />
              Informações
            </TabsTrigger>
            <TabsTrigger value="registros" className="gap-2">
              <Code className="h-4 w-4" />
              Implementação
            </TabsTrigger>
            <TabsTrigger value="validacao" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Validação
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4 space-y-6">
            {/* Status e Classificação */}
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Status</Label>
                {editMode ? (
                  <Select
                    value={form?.status}
                    onValueChange={(v) => setForm(f => f ? { ...f, status: v as BacklogStatus } : null)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1">
                    <Badge>{STATUS_LABELS[item.status]}</Badge>
                  </div>
                )}
              </div>

              <div>
                <Label>Categoria</Label>
                {editMode ? (
                  <Select
                    value={form?.categoria}
                    onValueChange={(v) => setForm(f => f ? { ...f, categoria: v as BacklogCategoria } : null)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORIAS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="mt-1 text-sm">{CATEGORIAS_LABELS[item.categoria]}</p>
                )}
              </div>

              <div>
                <Label>Projeto</Label>
                <p className="mt-1 text-sm">{item.projeto?.nome || "-"}</p>
              </div>
            </div>

            {/* Prioridade, Impacto, Esforço */}
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Prioridade</Label>
                {editMode ? (
                  <Select
                    value={form?.prioridade}
                    onValueChange={(v) => setForm(f => f ? { ...f, prioridade: v as BacklogPrioridade } : null)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORIDADE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="mt-1 text-sm">{PRIORIDADE_LABELS[item.prioridade]}</p>
                )}
              </div>

              <div>
                <Label>Impacto</Label>
                {editMode ? (
                  <Select
                    value={form?.impacto_esperado}
                    onValueChange={(v) => setForm(f => f ? { ...f, impacto_esperado: v as BacklogImpacto } : null)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(IMPACTO_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="mt-1 text-sm">{IMPACTO_LABELS[item.impacto_esperado]}</p>
                )}
              </div>

              <div>
                <Label>Esforço</Label>
                {editMode ? (
                  <Select
                    value={form?.estimativa_esforco}
                    onValueChange={(v) => setForm(f => f ? { ...f, estimativa_esforco: v as BacklogEsforco } : null)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ESFORCO_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="mt-1 text-sm">{ESFORCO_LABELS[item.estimativa_esforco]}</p>
                )}
              </div>
            </div>

            {/* Datas */}
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label>Criado em</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>
              <div>
                <Label>Início Implementação</Label>
                {editMode ? (
                  <Input
                    type="date"
                    value={form?.data_inicio_implementacao || ""}
                    onChange={(e) => setForm(f => f ? { ...f, data_inicio_implementacao: e.target.value } : null)}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.data_inicio_implementacao 
                      ? format(new Date(item.data_inicio_implementacao), "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </p>
                )}
              </div>
              <div>
                <Label>Conclusão</Label>
                {editMode ? (
                  <Input
                    type="date"
                    value={form?.data_conclusao || ""}
                    onChange={(e) => setForm(f => f ? { ...f, data_conclusao: e.target.value } : null)}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.data_conclusao 
                      ? format(new Date(item.data_conclusao), "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </p>
                )}
              </div>
              <div>
                <Label>Lançamento</Label>
                {editMode ? (
                  <Input
                    type="date"
                    value={form?.data_lancamento || ""}
                    onChange={(e) => setForm(f => f ? { ...f, data_lancamento: e.target.value } : null)}
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.data_lancamento 
                      ? format(new Date(item.data_lancamento), "dd/MM/yyyy", { locale: ptBR })
                      : "-"}
                  </p>
                )}
              </div>
            </div>

            {/* Responsáveis */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Responsável Produto</Label>
                <p className="mt-1 text-sm">
                  {item.responsavel_produto?.nome || "-"}
                </p>
              </div>
              <div>
                <Label>Responsável Técnico</Label>
                <p className="mt-1 text-sm">
                  {item.responsavel_tecnico?.nome || "-"}
                </p>
              </div>
            </div>

            {/* Dependência de créditos */}
            {item.dependente_de_creditos && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                  ⚠️ Este item depende de créditos/recursos adicionais
                </p>
              </div>
            )}

            {/* Descrição */}
            <div>
              <Label>Descrição Detalhada</Label>
              {editMode ? (
                <Textarea
                  value={form?.descricao_detalhada || ""}
                  onChange={(e) => setForm(f => f ? { ...f, descricao_detalhada: e.target.value } : null)}
                  className="mt-1 min-h-[200px] font-mono text-sm"
                />
              ) : (
                <div className="mt-1 p-3 rounded-lg bg-muted/50 min-h-[100px]">
                  {item.descricao_detalhada ? (
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {item.descricao_detalhada}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhuma descrição detalhada
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="registros" className="mt-4">
            <BacklogRegistrosSection itemId={itemId} />
          </TabsContent>

          <TabsContent value="validacao" className="mt-4">
            <BacklogValidacaoSection itemId={itemId} />
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <BacklogChangelogTimeline itemId={itemId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
