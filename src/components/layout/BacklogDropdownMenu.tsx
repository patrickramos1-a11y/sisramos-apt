import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BarChart3, ChevronDown, PanelLeft, List, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GerenciamentoDropdownMenuProps {
  isMobile?: boolean;
  onItemClick?: () => void;
}

export default function GerenciamentoDropdownMenu({ isMobile = false, onItemClick }: GerenciamentoDropdownMenuProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isGestorOrAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  const isActive = location.pathname === "/gerenciamento";
  const currentTab = new URLSearchParams(location.search).get("tab");

  const handleNavigation = (path: string) => {
    setOpen(false);
    navigate(path);
    onItemClick?.();
  };

  if (isMobile) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => handleNavigation("/gerenciamento?tab=painel")}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ml-4 w-full text-left",
            isActive && currentTab === "painel"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <PanelLeft className="h-5 w-5" />
          Painel
        </button>
        <button
          onClick={() => handleNavigation("/gerenciamento?tab=lista")}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ml-4 w-full text-left",
            isActive && currentTab === "lista"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <List className="h-5 w-5" />
          Lista
        </button>
        {isGestorOrAdmin && (
          <button
            onClick={() => handleNavigation("/gerenciamento?tab=exclusoes")}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ml-4 w-full text-left",
              isActive && currentTab === "exclusoes"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Trash2 className="h-5 w-5" />
            Exclusões
          </button>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-md mx-0.5 outline-none",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <BarChart3 className="h-4 w-4" />
          Gerenciamento
          <ChevronDown className="h-3 w-3 ml-1" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem
          onClick={() => handleNavigation("/gerenciamento?tab=painel")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <PanelLeft className="h-4 w-4" />
          Painel
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleNavigation("/gerenciamento?tab=lista")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <List className="h-4 w-4" />
          Lista
        </DropdownMenuItem>
        {isGestorOrAdmin && (
          <DropdownMenuItem
            onClick={() => handleNavigation("/gerenciamento?tab=exclusoes")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Exclusões
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
