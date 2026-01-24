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
  Menu,
  X,
  User,
  LogOut,
  Settings,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/notifications/NotificationBell";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { profile, role, isGestorOrAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: BarChart3,
      show: true,
    },
    {
      name: "APT",
      href: "/apt",
      icon: ClipboardList,
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
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          {/* Logo and nav */}
          <div className="flex items-center gap-8">
            {/* Logo with diagonal accent */}
            <Link to="/apt" className="flex items-center gap-3 group">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm transition-transform group-hover:scale-105">
                <ClipboardList className="h-5 w-5 text-primary-foreground" />
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
              {navItems.map((item, index) => {
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

          {/* User menu */}
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <NotificationBell />
            
            <div className="hidden sm:block h-6 w-px bg-border" />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="gap-2 px-2 sm:px-3 hover:bg-muted"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium max-w-32 truncate">
                      {profile?.nome || "Usuário"}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
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
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair do sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <nav className="border-t bg-card/95 backdrop-blur-sm p-3 md:hidden animate-fade-in">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 animate-fade-in">{children}</main>
    </div>
  );
}
