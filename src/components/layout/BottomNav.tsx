import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { BarChart2, BarChart3, CheckSquare, ClipboardList, Layers3, LogOut, MoreHorizontal, Settings, UserCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  matchPath: string;
}

const navItems: NavItem[] = [
  { name: "Hoje", href: "/", icon: ClipboardList, matchPath: "/execucao" },
  { name: "APT", href: "/apt", icon: Layers3, matchPath: "/apt" },
  { name: "Check", href: "/checklist", icon: CheckSquare, matchPath: "/checklist" },
  { name: "Gestão", href: "/gerenciamento?tab=painel", icon: BarChart2, matchPath: "/gerenciamento" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = location.pathname === "/dashboard" || location.pathname === "/configuracoes";

  const handleNavigate = (href: string) => {
    setMoreOpen(false);
    navigate(href);
  };

  const handleSignOut = () => {
    setMoreOpen(false);
    signOut();
    navigate("/login");
  };

  return (
    <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-xl md:hidden">
      <div className="flex h-[58px] items-stretch justify-around">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.matchPath ||
            (item.matchPath === "/execucao" && location.pathname === "/") ||
            (item.matchPath === "/apt" && location.pathname === "/apt-planejamento");

          return (
            <button
              key={item.name}
              onClick={() => navigate(item.href)}
              className={cn(
                "touch-feedback relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground active:text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-primary" />
              )}
              {isActive && <div className="absolute inset-x-1 inset-y-1 rounded-xl bg-primary/8" />}
              <item.icon className={cn("relative z-10 h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className={cn("relative z-10 text-[10px] leading-tight", isActive ? "font-semibold" : "font-normal")}>
                {item.name}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            "touch-feedback relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
            moreActive ? "text-primary" : "text-muted-foreground active:text-foreground"
          )}
        >
          {moreActive && (
            <div className="absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-primary" />
          )}
          {moreActive && <div className="absolute inset-x-1 inset-y-1 rounded-xl bg-primary/8" />}
          <MoreHorizontal className={cn("relative z-10 h-5 w-5", moreActive && "stroke-[2.5]")} />
          <span className={cn("relative z-10 text-[10px] leading-tight", moreActive ? "font-semibold" : "font-normal")}>
            Mais
          </span>
        </button>
      </div>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="rounded-t-3xl pb-5">
          <DrawerHeader className="text-left">
            <DrawerTitle>Mais opções</DrawerTitle>
            <DrawerDescription>
              {profile?.nome || "Usuário"} · {role === "admin" ? "Admin" : role === "gestor" ? "Gestor" : "Colaborador"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="grid gap-2 px-4">
            <Button variant="outline" className="justify-start gap-3 rounded-2xl" onClick={() => handleNavigate("/dashboard")}>
              <BarChart3 className="h-4 w-4 text-primary" />
              Dashboard
            </Button>
            <Button variant="outline" className="justify-start gap-3 rounded-2xl" onClick={() => handleNavigate("/configuracoes")}>
              <Settings className="h-4 w-4 text-primary" />
              Configurações
            </Button>
            <Button variant="outline" className="justify-start gap-3 rounded-2xl" onClick={() => handleNavigate("/configuracoes")}>
              <UserCircle className="h-4 w-4 text-primary" />
              Perfil e preferências
            </Button>
            <Button variant="ghost" className="justify-start gap-3 rounded-2xl text-destructive" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Trocar usuário
            </Button>
            <DrawerClose asChild>
              <Button variant="secondary" className="mt-1 rounded-2xl">
                Fechar
              </Button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    </nav>
  );
}
