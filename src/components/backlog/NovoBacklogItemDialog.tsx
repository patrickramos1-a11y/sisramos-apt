import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useBacklogProjetos,
  useBacklogMutations,
  CATEGORIAS_LABELS,
  PRIORIDADE_LABELS,
  IMPACTO_LABELS,
  ESFORCO_LABELS,
  BacklogCategoria,
  BacklogPrioridade,
  BacklogImpacto,
  BacklogEsforco
} from "@/hooks/useBacklog";

interface NovoBacklogItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DESCRICAO_PLACEHOLDER = `## Contexto / Problema


## Objetivo da Melhoria


## Comportamento Atual


## Comportamento Esperado


## Regras de Negócio


## Observações Técnicas


## Impacto no Usuário

`;

export default function NovoBacklogItemDialog({ open, onOpenChange }: NovoBacklogItemDialogProps) {
  const { data: projetos } = useBacklogProjetos();
  const { data: profiles } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    }
  });
  const { criarItem } = useBacklogMutations();

  const [form, setForm] = useState({
    titulo: "",
    projeto_id: "",
    categoria: "melhoria" as BacklogCategoria,
    descricao_detalhada: "",
    prioridade: "media" as BacklogPrioridade,
    impacto_esperado: "medio" as BacklogImpacto,
    estimativa_esforco: "medio" as BacklogEsforco,
    dependente_de_creditos: false,
    responsavel_produto_id: "",
    responsavel_tecnico_id: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.titulo || !form.projeto_id) {
      return;
    }

    await criarItem.mutateAsync({
      titulo: form.titulo,
      projeto_id: form.projeto_id,
      categoria: form.categoria,
      descricao_detalhada: form.descricao_detalhada || null,
      status: "ideia",
      prioridade: form.prioridade,
      impacto_esperado: form.impacto_esperado,
      estimativa_esforco: form.estimativa_esforco,
      dependente_de_creditos: form.dependente_de_creditos,
      responsavel_produto_id: form.responsavel_produto_id || null,
      responsavel_tecnico_id: form.responsavel_tecnico_id || null,
      data_inicio_implementacao: null,
      data_conclusao: null,
      data_lancamento: null
    });

    setForm({
      titulo: "",
      projeto_id: "",
      categoria: "melhoria",
      descricao_detalhada: "",
      prioridade: "media",
      impacto_esperado: "medio",
      estimativa_esforco: "medio",
      dependente_de_creditos: false,
      responsavel_produto_id: "",
      responsavel_tecnico_id: ""
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Item de Backlog</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identificação */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Identificação</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Título curto e objetivo"
                  required
                />
              </div>

              <div>
                <Label htmlFor="projeto">Projeto *</Label>
                <Select
                  value={form.projeto_id}
                  onValueChange={(v) => setForm({ ...form, projeto_id: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projetos?.map(projeto => (
                      <SelectItem key={projeto.id} value={projeto.id}>
                        {projeto.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="categoria">Categoria *</Label>
                <Select
                  value={form.categoria}
                  onValueChange={(v) => setForm({ ...form, categoria: v as BacklogCategoria })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIAS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Descrição Detalhada</h3>
            <Textarea
              value={form.descricao_detalhada}
              onChange={(e) => setForm({ ...form, descricao_detalhada: e.target.value })}
              placeholder={DESCRICAO_PLACEHOLDER}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {/* Planejamento */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Planejamento</h3>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={form.prioridade}
                  onValueChange={(v) => setForm({ ...form, prioridade: v as BacklogPrioridade })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORIDADE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Impacto Esperado</Label>
                <Select
                  value={form.impacto_esperado}
                  onValueChange={(v) => setForm({ ...form, impacto_esperado: v as BacklogImpacto })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(IMPACTO_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Estimativa de Esforço</Label>
                <Select
                  value={form.estimativa_esforco}
                  onValueChange={(v) => setForm({ ...form, estimativa_esforco: v as BacklogEsforco })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ESFORCO_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="dependente-creditos"
                checked={form.dependente_de_creditos}
                onCheckedChange={(checked) => setForm({ ...form, dependente_de_creditos: checked })}
              />
              <Label htmlFor="dependente-creditos" className="cursor-pointer">
                Dependente de créditos/recursos
              </Label>
            </div>
          </div>

          {/* Responsabilidade */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Responsabilidade</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Responsável pelo Produto</Label>
                <Select
                  value={form.responsavel_produto_id || "none"}
                  onValueChange={(v) => setForm({ ...form, responsavel_produto_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {profiles?.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Responsável Técnico</Label>
                <Select
                  value={form.responsavel_tecnico_id || "none"}
                  onValueChange={(v) => setForm({ ...form, responsavel_tecnico_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {profiles?.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criarItem.isPending}>
              {criarItem.isPending ? "Criando..." : "Criar Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
