import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Package, ChevronDown, LayoutDashboard, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface BacklogDropdownMenuProps {
  isMobile?: boolean;
  onItemClick?: () => void;
}

export default function BacklogDropdownMenu({ isMobile = false, onItemClick }: BacklogDropdownMenuProps) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  
  const isBacklogActive = location.pathname === "/backlog";
  const currentTab = new URLSearchParams(location.search).get("tab");

  const handleItemClick = () => {
    setOpen(false);
    onItemClick?.();
  };

  if (isMobile) {
    return (
      <div className="space-y-1">
        <Link
          to="/backlog?tab=painel"
          onClick={handleItemClick}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ml-4",
            isBacklogActive && currentTab === "painel"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          Backlog - Painel
        </Link>
        <Link
          to="/backlog?tab=lista"
          onClick={handleItemClick}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ml-4",
            isBacklogActive && currentTab === "lista"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <List className="h-5 w-5" />
          Backlog - Lista
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
            isBacklogActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Package className="h-4 w-4" />
          Backlog
          <ChevronDown className="h-3 w-3 ml-1" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem asChild>
          <Link
            to="/backlog?tab=painel"
            onClick={handleItemClick}
            className="flex items-center gap-2 cursor-pointer"
          >
            <LayoutDashboard className="h-4 w-4" />
            Painel
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/backlog?tab=lista"
            onClick={handleItemClick}
            className="flex items-center gap-2 cursor-pointer"
          >
            <List className="h-4 w-4" />
            Lista
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
