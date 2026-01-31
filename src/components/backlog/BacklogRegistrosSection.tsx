import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Code, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useBacklogRegistros,
  useBacklogMutations,
  BacklogRegistroStatus
} from "@/hooks/useBacklog";
import { useAuth } from "@/contexts/AuthContext";

interface BacklogRegistrosSectionProps {
  itemId: string;
}

const STATUS_LABELS: Record<BacklogRegistroStatus, string> = {
  executado: "Executado",
  nao_executado: "Não Executado"
};

const STATUS_COLORS: Record<BacklogRegistroStatus, string> = {
  executado: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  nao_executado: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
};

export default function BacklogRegistrosSection({ itemId }: BacklogRegistrosSectionProps) {
  const { isGestorOrAdmin } = useAuth();
  const { data: registros, isLoading } = useBacklogRegistros(itemId);
  const { criarRegistro } = useBacklogMutations();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    descricao: "",
    status: "executado" as BacklogRegistroStatus,
    data: format(new Date(), "yyyy-MM-dd")
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.descricao.trim()) return;

    await criarRegistro.mutateAsync({
      backlog_item_id: itemId,
      descricao: form.descricao,
      status: form.status,
      data: form.data
    });

    setForm({
      descricao: "",
      status: "executado",
      data: format(new Date(), "yyyy-MM-dd")
    });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Registros de Implementação</h3>
          <p className="text-sm text-muted-foreground">
            Documentação dos ajustes realizados
          </p>
        </div>
        {isGestorOrAdmin && !showForm && (
          <Button onClick={() => setShowForm(true)} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Novo Registro
          </Button>
        )}
      </div>

      {/* Formulário de novo registro */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Novo Registro</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Descrição do Ajuste *</Label>
                <Textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Descreva o que foi implementado ou ajustado..."
                  className="mt-1"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v as BacklogRegistroStatus })}
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
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={criarRegistro.isPending}>
                  {criarRegistro.isPending ? "Salvando..." : "Adicionar Registro"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de registros */}
      {registros && registros.length > 0 ? (
        <div className="space-y-3">
          {registros.map(registro => (
            <Card key={registro.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="secondary" className={STATUS_COLORS[registro.status]}>
                        {STATUS_LABELS[registro.status]}
                      </Badge>
                    </div>
                    
                    <p className="text-sm">{registro.descricao}</p>
                  </div>

                  <div className="text-right text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1 justify-end">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(registro.data), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                    {registro.responsavel && (
                      <div className="flex items-center gap-1 justify-end">
                        <User className="h-3 w-3" />
                        <span>{registro.responsavel.nome}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="text-center py-6 text-muted-foreground">
            <p>Nenhum registro de implementação</p>
          </div>
        )
      )}
    </div>
  );
}
