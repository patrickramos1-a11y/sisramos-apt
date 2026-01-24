import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as Theme) || "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (newTheme: Theme) => {
      root.classList.remove("light", "dark");

      if (newTheme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light";
        root.classList.add(systemTheme);
      } else {
        root.classList.add(newTheme);
      }
    };

    applyTheme(theme);
    localStorage.setItem("theme", theme);

    // Listen for system theme changes if using system preference
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("system");
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  return { theme, setTheme: setThemeState };
}

interface ThemeToggleProps {
  variant?: "dropdown" | "switch";
  showLabel?: boolean;
}

export function ThemeToggle({ variant = "dropdown", showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  if (variant === "switch") {
    return (
      <div className="flex items-center gap-3">
        {showLabel && (
          <span className="text-sm text-muted-foreground">Tema</span>
        )}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme("light")}
            className={`h-8 w-8 p-0 ${
              theme === "light" ? "bg-background shadow-sm" : ""
            }`}
          >
            <Sun className="h-4 w-4" />
            <span className="sr-only">Tema claro</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme("dark")}
            className={`h-8 w-8 p-0 ${
              theme === "dark" ? "bg-background shadow-sm" : ""
            }`}
          >
            <Moon className="h-4 w-4" />
            <span className="sr-only">Tema escuro</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme("system")}
            className={`h-8 w-8 p-0 ${
              theme === "system" ? "bg-background shadow-sm" : ""
            }`}
          >
            <Monitor className="h-4 w-4" />
            <span className="sr-only">Tema do sistema</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Escuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeToggle;
