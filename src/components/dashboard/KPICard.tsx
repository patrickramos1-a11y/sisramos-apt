import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const colorClasses = {
  default: "text-foreground",
  green: "text-green-600 dark:text-green-400",
  blue: "text-blue-600 dark:text-blue-400",
  yellow: "text-yellow-600 dark:text-yellow-400",
  red: "text-red-600 dark:text-red-400",
};

const bgClasses = {
  default: "",
  green: "bg-green-50 dark:bg-green-950/30",
  blue: "bg-blue-50 dark:bg-blue-950/30",
  yellow: "bg-yellow-50 dark:bg-yellow-950/30",
  red: "bg-red-50 dark:bg-red-950/30",
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
        "transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.02]",
        isActive && "ring-2 ring-primary ring-offset-2",
        bgClasses[color]
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className={cn("h-4 w-4", colorClasses[color])} />}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", colorClasses[color])}>
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
