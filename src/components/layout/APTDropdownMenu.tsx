import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { ClipboardList, ChevronDown, LayoutList, BarChart3, PanelLeft, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface APTDropdownMenuProps {
  isMobile?: boolean;
  onItemClick?: () => void;
}

export default function APTDropdownMenu({ isMobile = false, onItemClick }: APTDropdownMenuProps) {
  const location = useLocation();
  const { isGestorOrAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  
  const isAPTActive = location.pathname === "/apt";
  const currentTab = new URLSearchParams(location.search).get("tab");
  const currentSubTab = new URLSearchParams(location.search).get("subtab");

  const handleItemClick = (path: string) => {
    setOpen(false);
    onItemClick?.();
  };

  if (isMobile) {
    return (
      <div className="space-y-1">
        <Link
          to="/apt?tab=execucao"
          onClick={() => handleItemClick("/apt?tab=execucao")}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ml-4",
            isAPTActive && currentTab === "execucao"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <LayoutList className="h-5 w-5" />
          APT - Execução
        </Link>
        <Link
          to="/apt?tab=gerenciamento&subtab=painel"
          onClick={() => handleItemClick("/apt?tab=gerenciamento&subtab=painel")}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ml-4",
            isAPTActive && currentTab === "gerenciamento" && currentSubTab === "painel"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <PanelLeft className="h-5 w-5" />
          Gerenciamento - Painel
        </Link>
        <Link
          to="/apt?tab=gerenciamento&subtab=lista"
          onClick={() => handleItemClick("/apt?tab=gerenciamento&subtab=lista")}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ml-4",
            isAPTActive && currentTab === "gerenciamento" && currentSubTab === "lista"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <List className="h-5 w-5" />
          Gerenciamento - Lista
        </Link>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-md mx-0.5 outline-none",
            isAPTActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <ClipboardList className="h-4 w-4" />
          APT
          <ChevronDown className="h-3 w-3 ml-1" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem asChild>
          <Link
            to="/apt?tab=execucao"
            onClick={() => handleItemClick("/apt?tab=execucao")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <LayoutList className="h-4 w-4" />
            Execução
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Gerenciamento
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem asChild>
              <Link
                to="/apt?tab=gerenciamento&subtab=painel"
                onClick={() => handleItemClick("/apt?tab=gerenciamento&subtab=painel")}
                className="flex items-center gap-2 cursor-pointer"
              >
                <PanelLeft className="h-4 w-4" />
                Painel
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                to="/apt?tab=gerenciamento&subtab=lista"
                onClick={() => handleItemClick("/apt?tab=gerenciamento&subtab=lista")}
                className="flex items-center gap-2 cursor-pointer"
              >
                <List className="h-4 w-4" />
                Lista
              </Link>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
