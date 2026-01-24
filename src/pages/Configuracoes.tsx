import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import NovoUsuarioDialog from "@/components/users/NovoUsuarioDialog";
import EditarUsuarioDialog from "@/components/users/EditarUsuarioDialog";
import ExcluirUsuarioDialog from "@/components/users/ExcluirUsuarioDialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User, Pencil, X, Users, Trash2 } from "lucide-react";

type AppRole = "admin" | "gestor" | "colaborador";

interface UserWithRole {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  role: AppRole;
}

export default function Configuracoes() {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingNome, setIsEditingNome] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [allUsers, setAllUsers] = useState<UserWithRole[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null);

  // Dialog states
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithRole | null>(null);

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
  });

  const isGestorOrAdmin = role === "admin" || role === "gestor";

  const fetchAllUsers = async () => {
    setIsLoadingUsers(true);

    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("nome");

      if (profiles) {
        const usersWithRoles: UserWithRole[] = [];

        for (const profile of profiles) {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.user_id)
            .single();

          usersWithRoles.push({
            ...profile,
            role: (roleData?.role as AppRole) || "colaborador",
          });
        }

        setAllUsers(usersWithRoles);
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }

    setIsLoadingUsers(false);
  };

  useEffect(() => {
    if (isGestorOrAdmin) {
      fetchAllUsers();
    }
  }, [isGestorOrAdmin]);

  const handleUpdateRole = async (userId: string, newRole: AppRole) => {
    setUpdatingRoleFor(userId);

    try {
      const response = await supabase.functions.invoke("update-user-role", {
        body: { userId, newRole },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao atualizar perfil");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setAllUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u))
      );

      toast({
        title: "Perfil atualizado!",
        description: "O tipo de perfil foi alterado com sucesso.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar perfil",
        description: error.message,
      });
    }

    setUpdatingRoleFor(null);
  };

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
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ email: formData.email.trim() })
        .eq("user_id", user?.id);

      if (profileError) throw profileError;

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

  const getRoleBadge = (userRole: AppRole) => {
    switch (userRole) {
      case "admin":
        return <Badge variant="destructive">Administrador</Badge>;
      case "gestor":
        return <Badge variant="default">Gestor</Badge>;
      default:
        return <Badge variant="secondary">Colaborador</Badge>;
    }
  };

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
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas informações pessoais
            {isGestorOrAdmin && " e os usuários do sistema"}
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

        {/* Lista de Usuários - Admin e Gestor */}
        {isGestorOrAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Usuários do Sistema
                  </CardTitle>
                  <CardDescription>
                    Gerencie os usuários e seus tipos de perfil
                  </CardDescription>
                </div>
                <NovoUsuarioDialog onUserCreated={fetchAllUsers} />
              </div>
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead className="w-[150px]">Alterar Perfil</TableHead>
                        <TableHead className="w-[100px] text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.nome}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{getRoleBadge(u.role)}</TableCell>
                          <TableCell>
                            {updatingRoleFor === u.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Select
                                value={u.role}
                                onValueChange={(value: AppRole) =>
                                  handleUpdateRole(u.user_id, value)
                                }
                              >
                                <SelectTrigger className="w-[130px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="colaborador">
                                    Colaborador
                                  </SelectItem>
                                  <SelectItem value="gestor">Gestor</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingUser(u)}
                                title="Editar usuário"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingUser(u)}
                                disabled={u.user_id === user?.id}
                                title="Excluir usuário"
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
          </Card>
        )}

        {/* Informação sobre perfil */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Seu perfil:</span>
              {getRoleBadge(role || "colaborador")}
            </div>
            {role === "colaborador" && (
              <p className="text-xs text-muted-foreground mt-2">
                Como colaborador, você pode visualizar e atualizar suas demandas.
                Para criar demandas ou acessar funcionalidades de gestão, solicite
                a um administrador.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <EditarUsuarioDialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        user={editingUser}
        onUserUpdated={fetchAllUsers}
      />

      <ExcluirUsuarioDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        user={deletingUser}
        onUserDeleted={fetchAllUsers}
      />
    </AppLayout>
  );
}
