import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Loader2, User, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type AppRole = "admin" | "gestor" | "colaborador";

interface UserOption {
  user_id: string;
  nome: string;
  email: string;
  role: AppRole;
}

export default function Login() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSelectingUser, setIsSelectingUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { selectUser, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (profile) {
      navigate("/apt");
    }
  }, [profile, navigate]);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("*")
          .order("nome");

        if (error) {
          console.error("Error fetching users:", error);
          setIsLoadingUsers(false);
          return;
        }

        if (profiles) {
          const usersWithRoles: UserOption[] = [];

          for (const profile of profiles) {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", profile.user_id)
              .maybeSingle();

            usersWithRoles.push({
              user_id: profile.user_id,
              nome: profile.nome,
              email: profile.email,
              role: (roleData?.role as AppRole) || "colaborador",
            });
          }

          setUsers(usersWithRoles);
        }
      } catch (error) {
        console.error("Error:", error);
      }
      setIsLoadingUsers(false);
    };

    fetchUsers();
  }, []);

  const handleSelectUser = async (userId: string) => {
    setIsSelectingUser(userId);

    const { error } = await selectUser(userId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: error.message,
      });
      setIsSelectingUser(null);
    } else {
      toast({
        title: "Bem-vindo!",
        description: "Acesso realizado com sucesso",
      });
      navigate("/apt");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (userRole: AppRole) => {
    switch (userRole) {
      case "admin":
        return <Badge variant="destructive" className="text-xs">Admin</Badge>;
      case "gestor":
        return <Badge variant="default" className="text-xs">Gestor</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Colaborador</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background pattern - SISRAMOS style diagonal */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-1/2 h-full bg-primary/5 -skew-x-12 transform-gpu" />
        <div className="absolute top-0 left-0 w-1/3 h-full bg-primary/3 -skew-x-12 transform-gpu" />
      </div>

      <Card className="w-full max-w-lg shadow-xl relative animate-fade-in border-0 shadow-2xl">
        <CardHeader className="text-center pb-2">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
              <ClipboardList className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            Sistema APT
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Selecione seu usuário para acessar o sistema
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Users list */}
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  {users.length === 0
                    ? "Nenhum usuário cadastrado"
                    : "Nenhum usuário encontrado"}
                </p>
              </div>
            ) : (
              filteredUsers.map((u) => (
                <Button
                  key={u.user_id}
                  variant="outline"
                  className={cn(
                    "w-full justify-start h-auto py-3 px-4 gap-3 text-left",
                    isSelectingUser === u.user_id && "bg-primary/10 border-primary"
                  )}
                  onClick={() => handleSelectUser(u.user_id)}
                  disabled={isSelectingUser !== null}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {isSelectingUser === u.user_id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{u.nome}</span>
                      {getRoleBadge(u.role)}
                    </div>
                    <span className="text-xs text-muted-foreground truncate block">
                      {u.email}
                    </span>
                  </div>
                </Button>
              ))
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground pt-2">
            Entre em contato com o administrador para criar um novo usuário
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
