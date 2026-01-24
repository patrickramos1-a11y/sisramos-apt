import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Setor {
  id: string;
  nome: string;
  cor: string | null;
  created_at: string;
}

const PRESET_COLORS = [
  "#E5E7EB", // gray
  "#FEE2E2", // red
  "#FEF3C7", // yellow
  "#D1FAE5", // green
  "#DBEAFE", // blue
  "#E0E7FF", // indigo
  "#EDE9FE", // violet
  "#FCE7F3", // pink
  "#FFEDD5", // orange
  "#CCFBF1", // teal
];

export default function SetoresManagement() {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Dialog states
  const [novoSetorOpen, setNovoSetorOpen] = useState(false);
  const [editingSetor, setEditingSetor] = useState<Setor | null>(null);
  const [deletingSetor, setDeletingSetor] = useState<Setor | null>(null);

  // Form state
  const [formData, setFormData] = useState({ nome: "", cor: "#E5E7EB" });

  const fetchSetores = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("setores")
      .select("*")
      .order("nome");

    if (error) {
      console.error("Erro ao carregar setores:", error);
    } else {
      setSetores(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSetores();
  }, []);

  const resetForm = () => {
    setFormData({ nome: "", cor: "#E5E7EB" });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O nome do setor é obrigatório",
      });
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("setores").insert({
      nome: formData.nome.trim(),
      cor: formData.cor,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar setor",
        description: error.message,
      });
    } else {
      toast({
        title: "Setor criado!",
        description: "O setor foi adicionado com sucesso",
      });
      resetForm();
      setNovoSetorOpen(false);
      fetchSetores();
    }

    setIsSaving(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim() || !editingSetor) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O nome do setor é obrigatório",
      });
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from("setores")
      .update({
        nome: formData.nome.trim(),
        cor: formData.cor,
      })
      .eq("id", editingSetor.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar setor",
        description: error.message,
      });
    } else {
      toast({
        title: "Setor atualizado!",
        description: "As alterações foram salvas",
      });
      resetForm();
      setEditingSetor(null);
      fetchSetores();
    }

    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingSetor) return;

    setIsSaving(true);

    const { error } = await supabase
      .from("setores")
      .delete()
      .eq("id", deletingSetor.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir setor",
        description: error.message,
      });
    } else {
      toast({
        title: "Setor excluído!",
        description: "O setor foi removido com sucesso",
      });
      setDeletingSetor(null);
      fetchSetores();
    }

    setIsSaving(false);
  };

  const openEditDialog = (setor: Setor) => {
    setFormData({ nome: setor.nome, cor: setor.cor || "#E5E7EB" });
    setEditingSetor(setor);
  };

  const ColorPicker = () => (
    <div className="space-y-2">
      <Label>Cor</Label>
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`w-8 h-8 rounded-full border-2 transition-all ${
              formData.cor === color
                ? "border-foreground scale-110"
                : "border-transparent hover:scale-105"
            }`}
            style={{ backgroundColor: color }}
            onClick={() => setFormData((prev) => ({ ...prev, cor: color }))}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <Input
          type="color"
          value={formData.cor}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, cor: e.target.value }))
          }
          className="w-12 h-8 p-0 border-0"
        />
        <span className="text-xs text-muted-foreground">Cor personalizada</span>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Setores
            </CardTitle>
            <CardDescription>
              Gerencie os setores utilizados nas demandas
            </CardDescription>
          </div>
          <Dialog open={novoSetorOpen} onOpenChange={setNovoSetorOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" onClick={resetForm}>
                <Plus className="h-4 w-4" />
                Novo Setor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Setor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Financeiro"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nome: e.target.value }))
                    }
                  />
                </div>
                <ColorPicker />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNovoSetorOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar Setor"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : setores.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum setor cadastrado
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cor</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[100px] text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {setores.map((setor, index) => (
                  <TableRow 
                    key={setor.id}
                    className={index % 2 === 1 ? "bg-muted/30" : ""}
                  >
                    <TableCell>
                      <div
                        className="w-8 h-8 rounded-full border"
                        style={{ backgroundColor: setor.cor || "#E5E7EB" }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{setor.nome}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(setor)}
                          title="Editar setor"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingSetor(setor)}
                          title="Excluir setor"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingSetor}
        onOpenChange={(open) => !open && setEditingSetor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Setor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome *</Label>
              <Input
                id="edit-nome"
                placeholder="Ex: Financeiro"
                value={formData.nome}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nome: e.target.value }))
                }
              />
            </div>
            <ColorPicker />
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingSetor(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={!!deletingSetor}
        onOpenChange={(open) => !open && setDeletingSetor(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir setor "{deletingSetor?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Demandas associadas a este setor
              ficarão sem setor definido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingSetor(null)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
