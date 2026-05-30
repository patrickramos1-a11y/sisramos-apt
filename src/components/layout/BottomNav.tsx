import { useLocation, useNavigate } from "react-router-dom";
import { BarChart2, BarChart3, CheckSquare, ClipboardList, Layers3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  matchPath: string;
}

const navItems: NavItem[] = [
  { name: "Dash", href: "/dashboard", icon: BarChart3, matchPath: "/dashboard" },
  { name: "Exec.", href: "/", icon: ClipboardList, matchPath: "/execucao" },
  { name: "APT", href: "/apt", icon: Layers3, matchPath: "/apt" },
  { name: "Check", href: "/checklist", icon: CheckSquare, matchPath: "/checklist" },
  { name: "Gestão", href: "/gerenciamento?tab=painel", icon: BarChart2, matchPath: "/gerenciamento" },
  { name: "Config", href: "/configuracoes", icon: Settings, matchPath: "/configuracoes" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-xl md:hidden">
      <div className="flex h-[58px] items-stretch justify-around">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.matchPath ||
            (item.matchPath === "/execucao" && location.pathname === "/") ||
            (item.matchPath === "/apt" && location.pathname === "/apt-planejamento");

          return (
            <button
              key={item.name}
              onClick={() => navigate(item.href)}
              className={cn(
                "touch-feedback relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground active:text-foreground"
              )}
            >
              {isActive && (
                <div className="absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-primary" />
              )}
              {isActive && <div className="absolute inset-x-1 inset-y-1 rounded-xl bg-primary/8" />}
              <item.icon className={cn("relative z-10 h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className={cn("relative z-10 text-[10px] leading-tight", isActive ? "font-semibold" : "font-normal")}>
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
