import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, ClipboardList, CheckSquare, Settings, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  { name: "Gestão", href: "/gerenciamento?tab=painel", icon: BarChart2, matchPath: "/gerenciamento" },
  { name: "Config", href: "/configuracoes", icon: Settings, matchPath: "/configuracoes" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-xl md:hidden safe-area-bottom">
      <div className="flex items-stretch justify-around h-[56px]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.matchPath;
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.href)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 gap-0.5 min-h-[44px] transition-colors touch-feedback",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-primary" />
              )}
              {isActive && (
                <div className="absolute inset-x-1 inset-y-1 rounded-xl bg-primary/8" />
              )}
              <item.icon className={cn("h-5 w-5 relative z-10", isActive && "stroke-[2.5]")} />
              <span className={cn("text-[10px] leading-tight relative z-10", isActive ? "font-semibold" : "font-normal")}>
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
