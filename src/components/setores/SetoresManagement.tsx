import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import {
  CalendarCheck2,
  Loader2,
  MessageCircle,
  Palette,
  Pencil,
  Plus,
  Trash,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SETOR_WHATSAPP_TEMPLATE,
  normalizeSetorActions,
} from "@/lib/setor-actions";
import SetorRotinasDialog from "./SetorRotinasDialog";

interface Setor {
  id: string;
  nome: string;
  cor: string | null;
  acoes?: unknown;
  created_at: string;
}

interface FormData {
  nome: string;
  cor: string;
  whatsappEnabled: boolean;
  whatsappPhone: string;
  whatsappTemplate: string;
}

const PRESET_COLORS = [
  "#E5E7EB",
  "#FEE2E2",
  "#FEF3C7",
  "#D1FAE5",
  "#DBEAFE",
  "#E0E7FF",
  "#EDE9FE",
  "#FCE7F3",
  "#FFEDD5",
  "#CCFBF1",
];

const DEFAULT_FORM_DATA: FormData = {
  nome: "",
  cor: "#E5E7EB",
  whatsappEnabled: false,
  whatsappPhone: "",
  whatsappTemplate: DEFAULT_SETOR_WHATSAPP_TEMPLATE,
};

function buildSetorActionsPayload(formData: FormData) {
  if (!formData.whatsappEnabled) {
    return {};
  }

  return {
    whatsapp: {
      enabled: true,
      phone: formData.whatsappPhone.trim(),
      template: formData.whatsappTemplate.trim() || DEFAULT_SETOR_WHATSAPP_TEMPLATE,
    },
  };
}

export default function SetoresManagement() {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [novoSetorOpen, setNovoSetorOpen] = useState(false);
  const [editingSetor, setEditingSetor] = useState<Setor | null>(null);
  const [rotinasSetor, setRotinasSetor] = useState<Setor | null>(null);
  const [deletingSetor, setDeletingSetor] = useState<Setor | null>(null);
  const [deletingMultiple, setDeletingMultiple] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);

  const fetchSetores = async () => {
    setIsLoading(true);

    const { data, error } = await supabase.from("setores").select("*").order("nome");

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
    setFormData(DEFAULT_FORM_DATA);
  };

  const openEditDialog = (setor: Setor) => {
    const actions = normalizeSetorActions(setor.acoes);
    const whatsapp = actions.whatsapp;

    setFormData({
      nome: setor.nome,
      cor: setor.cor || "#E5E7EB",
      whatsappEnabled: Boolean(whatsapp?.enabled),
      whatsappPhone: whatsapp?.phone || "",
      whatsappTemplate: whatsapp?.template || DEFAULT_SETOR_WHATSAPP_TEMPLATE,
    });
    setEditingSetor(setor);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.nome.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O nome do setor e obrigatorio",
      });
      return;
    }

    if (formData.whatsappEnabled && !formData.whatsappPhone.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Informe o numero do WhatsApp para ativar essa acao",
      });
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("setores").insert({
      nome: formData.nome.trim(),
      cor: formData.cor,
      acoes: buildSetorActionsPayload(formData),
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

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!editingSetor || !formData.nome.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O nome do setor e obrigatorio",
      });
      return;
    }

    if (formData.whatsappEnabled && !formData.whatsappPhone.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Informe o numero do WhatsApp para ativar essa acao",
      });
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from("setores")
      .update({
        nome: formData.nome.trim(),
        cor: formData.cor,
        acoes: buildSetorActionsPayload(formData),
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
        description: "As alteracoes foram salvas",
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

    const { error } = await supabase.from("setores").delete().eq("id", deletingSetor.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir setor",
        description: error.message,
      });
    } else {
      toast({
        title: "Setor excluido!",
        description: "O setor foi removido com sucesso",
      });
      setDeletingSetor(null);
      fetchSetores();
    }

    setIsSaving(false);
  };

  const handleDeleteMultiple = async () => {
    if (selectedIds.size === 0) return;

    setIsSaving(true);

    const { error } = await supabase
      .from("setores")
      .delete()
      .in("id", Array.from(selectedIds));

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir setores",
        description: error.message,
      });
    } else {
      toast({
        title: "Setores excluidos!",
        description: `${selectedIds.size} setor(es) removido(s) com sucesso`,
      });
      setSelectedIds(new Set());
      setDeletingMultiple(false);
      fetchSetores();
    }

    setIsSaving(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === setores.length) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(setores.map((setor) => setor.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const ColorPicker = () => {
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

    return (
      <div className="space-y-2">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={cn(
                "h-8 w-8 rounded-full border-2 transition-all",
                formData.cor === color
                  ? "scale-110 border-foreground"
                  : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: color }}
              onClick={() => setFormData((prev) => ({ ...prev, cor: color }))}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <Input
            type="color"
            value={formData.cor}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, cor: event.target.value }))
            }
            onFocus={() => setIsColorPickerOpen(true)}
            onBlur={() => setIsColorPickerOpen(false)}
            className="h-8 w-12 cursor-pointer border-0 p-0"
          />
          <span className="text-xs text-muted-foreground">
            {isColorPickerOpen ? "Clique fora para confirmar" : "Cor personalizada"}
          </span>
        </div>
      </div>
    );
  };

  const WhatsAppConfig = () => (
    <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id="setor-whatsapp-enabled"
          checked={formData.whatsappEnabled}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({ ...prev, whatsappEnabled: Boolean(checked) }))
          }
          className="mt-1"
        />
        <div className="space-y-1">
          <Label htmlFor="setor-whatsapp-enabled" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            Acao: WhatsApp
          </Label>
          <p className="text-xs text-muted-foreground">
            Exibe um botao na demanda para abrir uma mensagem pronta no WhatsApp.
          </p>
        </div>
      </div>

      {formData.whatsappEnabled && (
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="setor-whatsapp-phone">Numero do WhatsApp</Label>
            <Input
              id="setor-whatsapp-phone"
              placeholder="Ex: (91) 98429-9440"
              value={formData.whatsappPhone}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, whatsappPhone: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setor-whatsapp-template">Mensagem automatica</Label>
            <Textarea
              id="setor-whatsapp-template"
              value={formData.whatsappTemplate}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, whatsappTemplate: event.target.value }))
              }
              rows={7}
            />
            <p className="text-xs text-muted-foreground">
              Variaveis disponiveis: {"{{descricao}}"}, {"{{repeticoes}}"}, {"{{numero}}"}, {"{{setor}}"}, {"{{responsavel}}"}, {"{{semanas}}"}, {"{{mes}}"}, {"{{ano}}"}, {"{{observacoes}}"}.
            </p>
          </div>
        </div>
      )}
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
              Gerencie os setores utilizados nas demandas e suas acoes especificas
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                variant="destructive"
                className="gap-2"
                onClick={() => setDeletingMultiple(true)}
              >
                <Trash className="h-4 w-4" />
                Excluir ({selectedIds.size})
              </Button>
            )}
            <Dialog open={novoSetorOpen} onOpenChange={setNovoSetorOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2" onClick={resetForm}>
                  <Plus className="h-4 w-4" />
                  Novo Setor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
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
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, nome: event.target.value }))
                      }
                    />
                  </div>

                  <ColorPicker />
                  <WhatsAppConfig />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setNovoSetorOpen(false)}>
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
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : setores.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Nenhum setor cadastrado</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedIds.size === setores.length && setores.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Acoes configuradas</TableHead>
                  <TableHead className="w-[100px] text-center">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {setores.map((setor, index) => {
                  const actions = normalizeSetorActions(setor.acoes);
                  const hasWhatsapp = Boolean(actions.whatsapp?.enabled);

                  return (
                    <TableRow
                      key={setor.id}
                      className={cn(
                        index % 2 === 1 && "bg-muted/30",
                        selectedIds.has(setor.id) && "bg-primary/10"
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(setor.id)}
                          onCheckedChange={() => toggleSelect(setor.id)}
                          aria-label={`Selecionar ${setor.nome}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div
                          className="h-8 w-8 rounded-full border"
                          style={{ backgroundColor: setor.cor || "#E5E7EB" }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{setor.nome}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          {hasWhatsapp ? (
                            <>
                              <Badge
                                variant="secondary"
                                className="border border-emerald-200 bg-emerald-50 text-emerald-700"
                              >
                                <MessageCircle className="mr-1 h-3 w-3" />
                                WhatsApp
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {actions.whatsapp?.phone || "Sem numero"}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sem acoes configuradas</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRotinasSetor(setor)}
                            title="Rotinas persistentes"
                            className="text-primary hover:text-primary"
                          >
                            <CalendarCheck2 className="h-4 w-4" />
                          </Button>
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!editingSetor} onOpenChange={(open) => !open && setEditingSetor(null)}>
        <DialogContent className="max-w-2xl">
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
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, nome: event.target.value }))
                }
              />
            </div>

            <ColorPicker />
            <WhatsAppConfig />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingSetor(null)}>
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

      <SetorRotinasDialog
        open={!!rotinasSetor}
        onOpenChange={(open) => !open && setRotinasSetor(null)}
        setor={rotinasSetor}
      />

      <AlertDialog open={!!deletingSetor} onOpenChange={(open) => !open && setDeletingSetor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir setor "{deletingSetor?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. Demandas associadas a este setor ficarao sem setor definido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeletingSetor(null)} disabled={isSaving}>
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

      <AlertDialog open={deletingMultiple} onOpenChange={(open) => !open && setDeletingMultiple(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} setor(es)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. Demandas associadas a estes setores ficarao sem setor definido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeletingMultiple(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteMultiple} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                `Excluir ${selectedIds.size} setor(es)`
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
