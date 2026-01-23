import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User, Pencil, X, Users } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
}

export default function Configuracoes() {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingNome, setIsEditingNome] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
  });

  const isAdmin = role === "admin";

  const fetchAllUsers = async () => {
    setIsLoadingUsers(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("nome");
    
    if (data) {
      setAllUsers(data);
    }
    setIsLoadingUsers(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAllUsers();
    }
  }, [isAdmin]);

  const handleSaveNome = async () => {
    if (!formData.nome.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O nome não pode estar vazio",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ nome: formData.nome.trim() })
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Nome atualizado!",
        description: "Seu nome foi alterado com sucesso.",
      });
      setIsEditingNome(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    }

    setIsLoading(false);
  };

  const handleSaveEmail = async () => {
    if (!formData.email.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O e-mail não pode estar vazio",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Update profile in profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ email: formData.email.trim() })
        .eq("user_id", user?.id);

      if (profileError) throw profileError;

      // Update auth email
      const { error: authError } = await supabase.auth.updateUser({
        email: formData.email.trim(),
      });

      if (authError) {
        toast({
          variant: "destructive",
          title: "Erro ao atualizar e-mail",
          description: authError.message,
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Verificação necessária",
        description:
          "Um e-mail de verificação foi enviado para o novo endereço. Verifique sua caixa de entrada.",
      });
      setIsEditingEmail(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    }

    setIsLoading(false);
  };

  const cancelEditNome = () => {
    setFormData((prev) => ({ ...prev, nome: profile?.nome || "" }));
    setIsEditingNome(false);
  };

  const cancelEditEmail = () => {
    setFormData((prev) => ({ ...prev, email: profile?.email || "" }));
    setIsEditingEmail(false);
  };

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        nome: profile.nome,
        email: profile.email,
      });
    }
  }, [profile]);

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas informações pessoais
          </p>
        </div>

        {/* Dados Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Dados Pessoais
            </CardTitle>
            <CardDescription>
              Visualize e atualize seu nome e e-mail de acesso ao sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nome */}
            <div className="space-y-2">
              <Label>Nome completo</Label>
              {isEditingNome ? (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nome: e.target.value }))
                    }
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveNome}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={cancelEditNome}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm">
                    {profile?.nome || "Carregando..."}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingNome(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* E-mail */}
            <div className="space-y-2">
              <Label>E-mail</Label>
              {isEditingEmail ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveEmail}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={cancelEditEmail}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ao alterar o e-mail, você receberá uma verificação no novo
                    endereço.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm">
                    {profile?.email || "Carregando..."}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingEmail(true)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de Usuários - Apenas Admin */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuários do Sistema
              </CardTitle>
              <CardDescription>
                Lista de todos os usuários cadastrados no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : allUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum usuário cadastrado
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.nome}</TableCell>
                        <TableCell>{u.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Informação sobre perfil */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Seu perfil:</span>
              <Badge variant={role === "admin" ? "destructive" : role === "gestor" ? "default" : "secondary"}>
                {role === "admin" ? "Admin" : role === "gestor" ? "Gestor" : "Colaborador"}
              </Badge>
            </div>
            {role === "colaborador" && (
              <p className="text-xs text-muted-foreground mt-2">
                Como colaborador, você pode visualizar e atualizar suas demandas. 
                Para criar demandas ou acessar funcionalidades de gestão, solicite a um administrador.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
