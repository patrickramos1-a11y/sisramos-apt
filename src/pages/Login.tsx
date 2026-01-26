import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AppRole = "admin" | "gestor" | "colaborador";

interface UserOption {
  user_id: string;
  nome: string;
  role: AppRole;
}

// Predefined colors for user cards - using pairs of background and accent
const USER_COLORS = [
  { bg: "bg-violet-100 dark:bg-violet-900/30", accent: "bg-violet-500", border: "border-violet-300 dark:border-violet-700" },
  { bg: "bg-purple-100 dark:bg-purple-900/30", accent: "bg-purple-500", border: "border-purple-300 dark:border-purple-700" },
  { bg: "bg-pink-100 dark:bg-pink-900/30", accent: "bg-pink-500", border: "border-pink-300 dark:border-pink-700" },
  { bg: "bg-amber-100 dark:bg-amber-900/30", accent: "bg-amber-500", border: "border-amber-300 dark:border-amber-700" },
  { bg: "bg-cyan-100 dark:bg-cyan-900/30", accent: "bg-cyan-500", border: "border-cyan-300 dark:border-cyan-700" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/30", accent: "bg-emerald-500", border: "border-emerald-300 dark:border-emerald-700" },
  { bg: "bg-rose-100 dark:bg-rose-900/30", accent: "bg-rose-500", border: "border-rose-300 dark:border-rose-700" },
  { bg: "bg-blue-100 dark:bg-blue-900/30", accent: "bg-blue-500", border: "border-blue-300 dark:border-blue-700" },
  { bg: "bg-orange-100 dark:bg-orange-900/30", accent: "bg-orange-500", border: "border-orange-300 dark:border-orange-700" },
  { bg: "bg-teal-100 dark:bg-teal-900/30", accent: "bg-teal-500", border: "border-teal-300 dark:border-teal-700" },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorForUser(index: number) {
  return USER_COLORS[index % USER_COLORS.length];
}

export default function Login() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState<string | null>(null);
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

  const handleSelectUser = async (userId: string) => {
    setIsLoggingIn(userId);

    const { error } = await selectUser(userId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: error.message,
      });
      setIsLoggingIn(null);
    } else {
      const user = users.find((u) => u.user_id === userId);
      toast({
        title: "Bem-vindo!",
        description: `Olá, ${user?.nome}!`,
      });
      navigate("/apt");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-1/2 h-full bg-primary/5 -skew-x-12 transform-gpu" />
        <div className="absolute top-0 left-0 w-1/3 h-full bg-primary/3 -skew-x-12 transform-gpu" />
      </div>

      <div className="relative z-10 w-full max-w-3xl animate-fade-in">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
              <ClipboardList className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sistema APT</h1>
          <p className="text-muted-foreground mt-2">Selecione seu usuário</p>
        </div>

        {/* Users grid */}
        {isLoadingUsers ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {users.map((user, index) => {
              const colors = getColorForUser(index);
              const isLoading = isLoggingIn === user.user_id;
              
              return (
                <button
                  key={user.user_id}
                  onClick={() => handleSelectUser(user.user_id)}
                  disabled={isLoggingIn !== null}
                  className={cn(
                    "flex flex-col items-center p-4 sm:p-6 rounded-xl border-2 transition-all duration-200",
                    "hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                    colors.bg,
                    colors.border
                  )}
                >
                  {/* Avatar circle */}
                  <div
                    className={cn(
                      "w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md",
                      colors.accent
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      getInitials(user.nome)
                    )}
                  </div>
                  
                  {/* Name */}
                  <span className="mt-3 text-sm sm:text-base font-medium text-foreground text-center line-clamp-2">
                    {user.nome.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer text */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Clique no seu nome para entrar no sistema
        </p>
      </div>
    </div>
  );
}
