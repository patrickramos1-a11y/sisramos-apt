import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AppRole = "admin" | "gestor" | "colaborador";

interface UserOption {
  user_id: string;
  nome: string;
  role: AppRole;
}

export default function Login() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
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

  const handleLogin = async () => {
    if (!selectedUserId) {
      toast({
        variant: "destructive",
        title: "Selecione um usuário",
        description: "Por favor, selecione um usuário para continuar",
      });
      return;
    }

    setIsLoggingIn(true);

    const { error } = await selectUser(selectedUserId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: error.message,
      });
      setIsLoggingIn(false);
    } else {
      toast({
        title: "Bem-vindo!",
        description: "Acesso realizado com sucesso",
      });
      navigate("/apt");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-1/2 h-full bg-primary/5 -skew-x-12 transform-gpu" />
        <div className="absolute top-0 left-0 w-1/3 h-full bg-primary/3 -skew-x-12 transform-gpu" />
      </div>

      <Card className="w-full max-w-md shadow-xl relative animate-fade-in border-0 shadow-2xl">
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
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full h-12">
                  <SelectValue placeholder="Selecione seu nome..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                className="w-full h-12"
                onClick={handleLogin}
                disabled={!selectedUserId || isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </>
          )}

          <p className="text-center text-xs text-muted-foreground pt-2">
            Entre em contato com o administrador para criar um novo usuário
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
