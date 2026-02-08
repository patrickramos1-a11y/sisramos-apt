import { useState } from "react";
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
  ClipboardList,
  User,
  LogOut,
  Settings,
  BarChart3,
  ChevronRight,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/notifications/NotificationBell";
import APTDropdownMenu from "./APTDropdownMenu";
import BacklogDropdownMenu from "./BacklogDropdownMenu";
import BottomNav from "./BottomNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { profile, role, isGestorOrAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate("/login");
  };

  // Nav items without APT (which uses dropdown)
  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: BarChart3,
      show: true,
    },
    {
      name: "Checklist",
      href: "/checklist",
      icon: CheckSquare,
      show: true,
    },
    {
      name: "Configurações",
      href: "/configuracoes",
      icon: Settings,
      show: true,
    },
  ].filter((item) => item.show);

  const getRoleBadge = () => {
    switch (role) {
      case "admin":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">
            Admin
          </Badge>
        );
      case "gestor":
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
            Gestor
          </Badge>
        );
      default:
        return (
          <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
            Colaborador
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="flex h-12 md:h-14 items-center justify-between px-3 md:px-4 lg:px-6">
          {/* Logo and nav */}
          <div className="flex items-center gap-4 md:gap-8">
            {/* Logo */}
            <Link to="/apt" className="flex items-center gap-2 md:gap-3 group">
              <div className="relative flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg bg-primary shadow-sm transition-transform group-hover:scale-105">
                <ClipboardList className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-lg tracking-tight">APT</span>
                <span className="hidden lg:inline text-xs text-muted-foreground ml-2">
                  Sistema de Tarefas
                </span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center">
              {navItems.slice(0, 2).map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-md mx-0.5",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
              
              {/* APT Dropdown Menu */}
              <APTDropdownMenu />
              
              {/* Backlog Dropdown Menu */}
              <BacklogDropdownMenu />
              
              {/* Configurações */}
              {navItems.slice(2).map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-md mx-0.5",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side: notifications + user */}
          <div className="flex items-center gap-2 md:gap-3">
            <NotificationBell />
            
            {/* Desktop user menu */}
            <div className="hidden md:flex items-center gap-3">
              <div className="h-6 w-px bg-border" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="gap-2 px-3 hover:bg-muted"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium max-w-32 truncate">
                        {profile?.nome || "Usuário"}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{profile?.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {profile?.email}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2">
                        {getRoleBadge()}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Trocar usuário
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile: show user name only */}
            <span className="md:hidden text-xs font-medium text-muted-foreground truncate max-w-20">
              {profile?.nome?.split(" ")[0]}
            </span>
          </div>
        </div>
      </header>

      {/* Main content with bottom padding for mobile nav */}
      <main className="flex-1 animate-fade-in pb-16 md:pb-0">{children}</main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
