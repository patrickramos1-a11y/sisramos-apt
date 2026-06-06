import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  LogOut,
  Settings,
  BarChart3,
  ChevronDown,
  CheckSquare,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

import APTDropdownMenu from "./APTDropdownMenu";
import GerenciamentoDropdownMenu from "./BacklogDropdownMenu";
import BottomNav from "./BottomNav";
import logoFull from "@/assets/logo-full.png";
import logoFullWhite from "@/assets/logo-full-white.png";
import logoIcon from "@/assets/logo-icon.png";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { profile, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { name: "Checklist", href: "/checklist", icon: CheckSquare },
    { name: "Configurações", href: "/configuracoes", icon: Settings },
  ];

  const getMobilePageMeta = () => {
    if (location.pathname === "/" || location.pathname === "/execucao") {
      return { title: "Execução", helper: "Momento APT", icon: ClipboardList };
    }
    if (location.pathname.startsWith("/apt")) {
      return { title: "APT", helper: "Planejamento", icon: CheckSquare };
    }
    if (location.pathname.startsWith("/checklist")) {
      return { title: "Checklist", helper: "Pré-momento", icon: CheckSquare };
    }
    if (location.pathname.startsWith("/gerenciamento")) {
      return { title: "Gestão", helper: "Demandas", icon: BarChart3 };
    }
    if (location.pathname.startsWith("/dashboard")) {
      return { title: "Dashboard", helper: "Indicadores", icon: BarChart3 };
    }
    if (location.pathname.startsWith("/configuracoes")) {
      return { title: "Configurações", helper: "Perfil e sistema", icon: Settings };
    }
    return { title: "SISRAMOS", helper: "APT", icon: ClipboardList };
  };

  const mobilePageMeta = getMobilePageMeta();
  const MobilePageIcon = mobilePageMeta.icon;

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-lg shadow-sm">
        <div className="flex h-14 items-center justify-between px-3 md:h-14 md:px-6">
          {/* Logo and nav */}
          <div className="flex min-w-0 items-center gap-3 md:gap-6 lg:gap-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group shrink-0">
              <img
                src={logoIcon}
                alt="SISRAMOS"
                className="h-8 w-8 md:hidden transition-transform group-hover:scale-105"
              />
              <img
                src={logoFull}
                alt="SISRAMOS"
                className="hidden md:block h-8 dark:hidden transition-transform group-hover:scale-105"
              />
              <img
                src={logoFullWhite}
                alt="SISRAMOS"
                className="hidden dark:md:block h-8 transition-transform group-hover:scale-105"
              />
            </Link>

            <div className="flex min-w-0 items-center gap-2 md:hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MobilePageIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black leading-tight">{mobilePageMeta.title}</p>
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {mobilePageMeta.helper}
                </p>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.slice(0, 2).map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium transition-all rounded-full",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
              
              <APTDropdownMenu />
              <GerenciamentoDropdownMenu />
              
              {navItems.slice(2).map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium transition-all rounded-full",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 md:gap-3">
            
            
            {/* Desktop user menu */}
            <div className="hidden md:flex items-center gap-3">
              <div className="h-6 w-px bg-border" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2.5 hover:bg-accent rounded-full">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      {profile?.nome?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <span className="text-sm font-medium max-w-28 truncate hidden lg:inline">
                      {profile?.nome?.split(" ")[0] || "Usuário"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-xl">
                  <DropdownMenuLabel className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        {profile?.nome?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{profile?.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                      </div>
                    </div>
                    <div className="pt-2">{getRoleBadge()}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Trocar usuário
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile user menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                      {profile?.nome?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-xl">
                  <DropdownMenuLabel className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                        {profile?.nome?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{profile?.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                      </div>
                    </div>
                    <div className="pt-2">{getRoleBadge()}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/configuracoes")} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Perfil e configurações
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Trocar usuário
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

          </div>
        </div>
        {/* Gradient accent line */}
        <div className="h-[2px] bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
      </header>

      {/* Main content */}
      <main className="flex-1 animate-fade-in pb-16 md:pb-0">{children}</main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
