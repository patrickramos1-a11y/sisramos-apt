import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: number;
  percentage?: number;
  icon?: LucideIcon;
  color?: "default" | "green" | "blue" | "yellow" | "red";
  onClick?: () => void;
  isActive?: boolean;
}

const borderColors = {
  default: "border-l-muted-foreground/30",
  green: "border-l-green-500",
  blue: "border-l-blue-500",
  yellow: "border-l-yellow-500",
  red: "border-l-red-500",
};

const textColors = {
  default: "text-foreground",
  green: "text-green-600 dark:text-green-400",
  blue: "text-blue-600 dark:text-blue-400",
  yellow: "text-yellow-600 dark:text-yellow-400",
  red: "text-red-600 dark:text-red-400",
};

export default function KPICard({
  title,
  value,
  percentage,
  icon: Icon,
  color = "default",
  onClick,
  isActive,
}: KPICardProps) {
  return (
    <Card
      className={cn(
        "transition-all duration-200 border-l-4 overflow-hidden",
        borderColors[color],
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
        isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </span>
          {Icon && <Icon className={cn("h-4 w-4", textColors[color])} />}
        </div>
        <div className={cn("text-3xl font-bold tracking-tight", textColors[color])}>
          {value.toLocaleString("pt-BR")}
        </div>
        {percentage !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            {percentage}% do total
          </p>
        )}
      </CardContent>
    </Card>
  );
}
