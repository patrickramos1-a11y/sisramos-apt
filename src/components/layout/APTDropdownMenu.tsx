import { Link, useLocation, useNavigate } from "react-router-dom";
import { ClipboardList, Layers3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface APTDropdownMenuProps {
  isMobile?: boolean;
  onItemClick?: () => void;
}

export default function APTDropdownMenu({ isMobile = false, onItemClick }: APTDropdownMenuProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleMobileNavigation = (href: string) => {
    navigate(href);
    onItemClick?.();
  };
  const isExecucaoActive = location.pathname === "/" || location.pathname === "/execucao";

  if (isMobile) {
    return (
      <div className="grid gap-2">
        <button
          onClick={() => handleMobileNavigation("/")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-all",
            isExecucaoActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <ClipboardList className="h-5 w-5" />
          Execução
        </button>
        <button
          onClick={() => handleMobileNavigation("/apt")}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-all",
            location.pathname === "/apt"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Layers3 className="h-5 w-5" />
          APT
        </button>
      </div>
    );
  }

  return (
    <>
      <Link
        to="/"
        className={cn(
          "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
          isExecucaoActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <ClipboardList className="h-4 w-4" />
        Execução
      </Link>
      <Link
        to="/apt"
        className={cn(
          "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
          location.pathname === "/apt" || location.pathname === "/apt-planejamento"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <Layers3 className="h-4 w-4" />
        APT
      </Link>
    </>
  );
}
