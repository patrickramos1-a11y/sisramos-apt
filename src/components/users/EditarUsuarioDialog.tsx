import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface EditarUsuarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    user_id: string;
    nome: string;
    email: string;
    avatar_url?: string | null;
  } | null;
  onUserUpdated: () => void;
}

export default function EditarUsuarioDialog({
  open,
  onOpenChange,
  user,
  onUserUpdated,
}: EditarUsuarioDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    avatar_url: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setFormData({
        nome: user.nome,
        email: user.email,
        avatar_url: user.avatar_url || "",
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim() || !formData.email.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nome e e-mail são obrigatórios",
      });
      return;
    }

    if (!user) return;

    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke("update-user", {
        body: {
          userId: user.user_id,
          nome: formData.nome.trim(),
          email: formData.email.trim(),
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao atualizar usuário");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const { error: avatarError } = await supabase
        .from("profiles")
        .update({ avatar_url: formData.avatar_url.trim() || null })
        .eq("user_id", user.user_id);

      if (avatarError) throw avatarError;

      toast({
        title: "Usuário atualizado!",
        description: "Os dados foram salvos com sucesso.",
      });

      onOpenChange(false);
      onUserUpdated();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar usuário",
        description: error.message,
      });
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Atualize os dados do usuário
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome completo</Label>
              <Input
                id="edit-nome"
                type="text"
                placeholder="Nome do usuário"
                value={formData.nome}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nome: e.target.value }))
                }
                disabled={isLoading}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="email@exemplo.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                disabled={isLoading}
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-avatar">Imagem de perfil</Label>
              <Input
                id="edit-avatar"
                type="url"
                placeholder="https://exemplo.com/foto.jpg"
                value={formData.avatar_url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, avatar_url: e.target.value }))
                }
                disabled={isLoading}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                Cole uma URL pública da imagem. Se ficar vazio, o sistema usa as iniciais.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
