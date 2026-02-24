import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, ClipboardList, CheckSquare, Package, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import APTDropdownMenu from "./APTDropdownMenu";
import BacklogDropdownMenu from "./BacklogDropdownMenu";
import { Settings, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  matchPath: string;
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3, matchPath: "/dashboard" },
  { name: "APT", href: "/apt?tab=execucao", icon: ClipboardList, matchPath: "/apt" },
  { name: "Checklist", href: "/checklist", icon: CheckSquare, matchPath: "/checklist" },
  { name: "Backlog", href: "/backlog", icon: Package, matchPath: "/backlog" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const { profile, role, signOut } = useAuth();

  const getRoleBadge = () => {
    switch (role) {
      case "admin":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Admin</Badge>;
      case "gestor":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Gestor</Badge>;
      default:
        return <Badge className="bg-secondary text-secondary-foreground">Colaborador</Badge>;
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-xl md:hidden safe-area-bottom">
      <div className="flex items-stretch justify-around h-[60px]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.matchPath;
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.href)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 gap-0.5 min-h-[44px] transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-primary" />
              )}
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className={cn("text-[10px] leading-tight", isActive ? "font-semibold" : "font-normal")}>
                {item.name}
              </span>
            </button>
          );
        })}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 gap-0.5 min-h-[44px] transition-colors",
                (location.pathname === "/configuracoes") 
                  ? "text-primary" 
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              {location.pathname === "/configuracoes" && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-primary" />
              )}
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] leading-tight font-normal">Mais</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
            <SheetHeader className="text-left pb-2">
              <SheetTitle className="text-base">Menu</SheetTitle>
            </SheetHeader>
            <div className="space-y-1">
              {/* User info */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/50 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  {profile?.nome?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{profile?.nome || "Usuário"}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                </div>
                {getRoleBadge()}
              </div>

              <div className="px-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 px-3">APT</p>
                <APTDropdownMenu isMobile onItemClick={() => setMoreOpen(false)} />
              </div>

              <div className="px-1 mt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 px-3">Backlog</p>
                <BacklogDropdownMenu isMobile onItemClick={() => setMoreOpen(false)} />
              </div>

              <button
                onClick={() => { navigate("/configuracoes"); setMoreOpen(false); }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left mt-2",
                  location.pathname === "/configuracoes"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Settings className="h-5 w-5" />
                Configurações
              </button>

              <button
                onClick={() => { signOut(); navigate("/login"); setMoreOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                Trocar usuário
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
