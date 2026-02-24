import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import logoFull from "@/assets/logo-full.png";
import logoFullWhite from "@/assets/logo-full-white.png";

type AppRole = "admin" | "gestor" | "colaborador";

interface UserOption {
  user_id: string;
  nome: string;
  role: AppRole;
}

const USER_COLORS = [
  { bg: "bg-emerald-50 dark:bg-emerald-900/20", accent: "bg-emerald-600", border: "border-emerald-200 dark:border-emerald-800" },
  { bg: "bg-teal-50 dark:bg-teal-900/20", accent: "bg-teal-600", border: "border-teal-200 dark:border-teal-800" },
  { bg: "bg-cyan-50 dark:bg-cyan-900/20", accent: "bg-cyan-600", border: "border-cyan-200 dark:border-cyan-800" },
  { bg: "bg-sky-50 dark:bg-sky-900/20", accent: "bg-sky-600", border: "border-sky-200 dark:border-sky-800" },
  { bg: "bg-violet-50 dark:bg-violet-900/20", accent: "bg-violet-600", border: "border-violet-200 dark:border-violet-800" },
  { bg: "bg-amber-50 dark:bg-amber-900/20", accent: "bg-amber-600", border: "border-amber-200 dark:border-amber-800" },
  { bg: "bg-rose-50 dark:bg-rose-900/20", accent: "bg-rose-600", border: "border-rose-200 dark:border-rose-800" },
  { bg: "bg-indigo-50 dark:bg-indigo-900/20", accent: "bg-indigo-600", border: "border-indigo-200 dark:border-indigo-800" },
  { bg: "bg-lime-50 dark:bg-lime-900/20", accent: "bg-lime-600", border: "border-lime-200 dark:border-lime-800" },
  { bg: "bg-orange-50 dark:bg-orange-900/20", accent: "bg-orange-600", border: "border-orange-200 dark:border-orange-800" },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorForUser(index: number) {
  return USER_COLORS[index % USER_COLORS.length];
}

export default function Login() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState<string | null>(null);
  const { selectUser, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("*")
          .order("nome");

        if (error) { console.error("Error fetching users:", error); setIsLoadingUsers(false); return; }

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
      } catch (error) { console.error("Error:", error); }
      setIsLoadingUsers(false);
    };
    fetchUsers();
  }, []);

  const handleSelectUser = async (userId: string) => {
    if (profile && profile.user_id !== userId) signOut();
    setIsLoggingIn(userId);
    const { error } = await selectUser(userId);
    if (error) {
      toast({ variant: "destructive", title: "Erro ao entrar", description: error.message });
      setIsLoggingIn(null);
    } else {
      const user = users.find((u) => u.user_id === userId);
      toast({ title: "Bem-vindo!", description: `Olá, ${user?.nome}!` });
      navigate("/apt");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative z-10 w-full max-w-3xl animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <img src={logoFull} alt="SISRAMOS" className="h-14 sm:h-16 dark:hidden" />
            <img src={logoFullWhite} alt="SISRAMOS" className="h-14 sm:h-16 hidden dark:block" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">Selecione seu perfil para continuar</p>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {users.map((user, index) => {
              const colors = getColorForUser(index);
              const isLoading = isLoggingIn === user.user_id;
              return (
                <button
                  key={user.user_id}
                  onClick={() => handleSelectUser(user.user_id)}
                  disabled={isLoggingIn !== null}
                  className={cn(
                    "flex flex-col items-center p-4 sm:p-5 rounded-2xl border transition-all duration-200",
                    "hover:scale-[1.03] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                    colors.bg, colors.border
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-md",
                    colors.accent
                  )}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : getInitials(user.nome)}
                  </div>
                  <span className="mt-2.5 text-xs sm:text-sm font-medium text-foreground text-center line-clamp-2">
                    {user.nome.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground/60 mt-10">
          SISRAMOS · Sistema de Gestão
        </p>
      </div>
    </div>
  );
}
