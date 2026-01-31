import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Folder, Trash2 } from "lucide-react";
import { useBacklogProjetos, useBacklogMutations } from "@/hooks/useBacklog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function BacklogProjetosManagement() {
  const { isGestorOrAdmin } = useAuth();
  const { data: projetos, isLoading } = useBacklogProjetos();
  const { criarProjeto } = useBacklogMutations();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return;

    await criarProjeto.mutateAsync({
      nome: form.nome,
      descricao: form.descricao || undefined
    });

    setForm({ nome: "", descricao: "" });
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este projeto? Todos os itens associados serão mantidos.")) {
      return;
    }

    const { error } = await supabase
      .from("backlog_projetos")
      .update({ ativo: false })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir projeto", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["backlog-projetos"] });
      toast({ title: "Projeto arquivado" });
    }
  };

  if (!isGestorOrAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Folder className="h-4 w-4" />
          Projetos
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Projeto</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome do projeto"
                  required
                />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Descrição opcional..."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={criarProjeto.isPending}>
                  {criarProjeto.isPending ? "Criando..." : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : projetos && projetos.length > 0 ? (
          <div className="space-y-2">
            {projetos.map((projeto) => (
              <div
                key={projeto.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="font-medium text-sm">{projeto.nome}</p>
                  {projeto.descricao && (
                    <p className="text-xs text-muted-foreground">{projeto.descricao}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(projeto.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum projeto cadastrado
          </p>
        )}
      </CardContent>
    </Card>
  );
}
