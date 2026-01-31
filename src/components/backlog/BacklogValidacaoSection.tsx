import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Plus, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useBacklogValidacoes,
  useBacklogMutations,
  TIPO_VALIDACAO_LABELS,
  BacklogTipoValidacao
} from "@/hooks/useBacklog";
import { useAuth } from "@/contexts/AuthContext";

interface BacklogValidacaoSectionProps {
  itemId: string;
}

export default function BacklogValidacaoSection({ itemId }: BacklogValidacaoSectionProps) {
  const { isGestorOrAdmin } = useAuth();
  const { data: validacoes, isLoading } = useBacklogValidacoes(itemId);
  const { criarValidacao } = useBacklogMutations();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    tipo_validacao: "teste_funcional" as BacklogTipoValidacao,
    observacoes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await criarValidacao.mutateAsync({
      backlog_item_id: itemId,
      tipo_validacao: form.tipo_validacao,
      observacoes: form.observacoes || undefined
    });

    setForm({ tipo_validacao: "teste_funcional", observacoes: "" });
    setShowForm(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const temValidacaoConfirmada = validacoes?.some(v => v.validado);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Confirmação de Entrega</h3>
          <p className="text-sm text-muted-foreground">
            É necessário pelo menos uma validação para encerrar o item
          </p>
        </div>
        {isGestorOrAdmin && !showForm && (
          <Button onClick={() => setShowForm(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Validação
          </Button>
        )}
      </div>

      {/* Status de validação */}
      <div className={`p-3 rounded-lg ${temValidacaoConfirmada ? "bg-green-500/10 border border-green-500/30" : "bg-yellow-500/10 border border-yellow-500/30"}`}>
        <div className="flex items-center gap-2">
          <CheckCircle className={`h-5 w-5 ${temValidacaoConfirmada ? "text-green-500" : "text-yellow-500"}`} />
          <span className={`font-medium ${temValidacaoConfirmada ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}>
            {temValidacaoConfirmada 
              ? `${validacoes?.filter(v => v.validado).length} validação(ões) confirmada(s)`
              : "Nenhuma validação confirmada"}
          </span>
        </div>
      </div>

      {/* Formulário de nova validação */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Registrar Validação</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Tipo de Validação</Label>
                <Select
                  value={form.tipo_validacao}
                  onValueChange={(v) => setForm({ ...form, tipo_validacao: v as BacklogTipoValidacao })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_VALIDACAO_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  placeholder="Detalhes da validação realizada..."
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={criarValidacao.isPending}>
                  {criarValidacao.isPending ? "Salvando..." : "Confirmar Validação"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de validações */}
      {validacoes && validacoes.length > 0 ? (
        <div className="space-y-3">
          {validacoes.map(validacao => (
            <Card key={validacao.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={validacao.validado ? "default" : "secondary"}>
                        {TIPO_VALIDACAO_LABELS[validacao.tipo_validacao]}
                      </Badge>
                      {validacao.validado && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    
                    {validacao.observacoes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {validacao.observacoes}
                      </p>
                    )}
                  </div>

                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{validacao.validador?.nome || "Sistema"}</span>
                    </div>
                    <div>
                      {format(new Date(validacao.data_validacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="text-center py-6 text-muted-foreground">
            <p>Nenhuma validação registrada</p>
          </div>
        )
      )}
    </div>
  );
}
