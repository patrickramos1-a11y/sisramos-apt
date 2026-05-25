import { useLocation, useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

interface APTDropdownMenuProps {
  isMobile?: boolean;
  onItemClick?: () => void;
}

export default function APTDropdownMenu({ isMobile = false, onItemClick }: APTDropdownMenuProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isAPTActive =
    location.pathname === "/apt" ||
    location.pathname === "/execucao" ||
    location.pathname === "/apt-planejamento";

  const handleNavigation = () => {
    navigate("/execucao");
    onItemClick?.();
  };

  if (isMobile) {
    return (
      <button
        onClick={handleNavigation}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all w-full text-left",
          isAPTActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <ClipboardList className="h-5 w-5" />
        Execução
      </button>
    );
  }

  return (
    <button
      onClick={handleNavigation}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-md mx-0.5 outline-none",
        isAPTActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      <ClipboardList className="h-4 w-4" />
      Execução
    </button>
  );
}
