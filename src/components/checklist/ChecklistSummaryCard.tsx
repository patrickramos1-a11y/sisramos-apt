import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertCircle, Calendar, CheckCircle2, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import CircularProgress from "./CircularProgress";

interface ChecklistSummaryCardProps {
  semana: number;
  totalItems: number;
  completedItems: number;
  notDoneItems?: number;
  onClick: () => void;
  isSelected?: boolean;
}

export default function ChecklistSummaryCard({
  semana,
  totalItems,
  completedItems,
  notDoneItems = 0,
  onClick,
  isSelected = false,
}: ChecklistSummaryCardProps) {
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const allCompleted = totalItems > 0 && completedItems === totalItems;
  const allProcessed = totalItems > 0 && !allCompleted && (completedItems + notDoneItems === totalItems) && notDoneItems > 0;

  const weekColors: Record<number, { bg: string; icon: string; badge: string }> = {
    1: { bg: "from-emerald-500/20 to-emerald-500/5", icon: "bg-emerald-500/30 text-emerald-700 dark:text-emerald-400", badge: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" },
    2: { bg: "from-blue-500/20 to-blue-500/5", icon: "bg-blue-500/30 text-blue-700 dark:text-blue-400", badge: "bg-blue-500/20 text-blue-700 dark:text-blue-400" },
    3: { bg: "from-purple-500/20 to-purple-500/5", icon: "bg-purple-500/30 text-purple-700 dark:text-purple-400", badge: "bg-purple-500/20 text-purple-700 dark:text-purple-400" },
    4: { bg: "from-orange-500/20 to-orange-500/5", icon: "bg-orange-500/30 text-orange-700 dark:text-orange-400", badge: "bg-orange-500/20 text-orange-700 dark:text-orange-400" },
    5: { bg: "from-pink-500/20 to-pink-500/5", icon: "bg-pink-500/30 text-pink-700 dark:text-pink-400", badge: "bg-pink-500/20 text-pink-700 dark:text-pink-400" },
  };

  const weekColor = weekColors[semana] || weekColors[1];

  const headerGradient = allCompleted
    ? "from-primary/20 to-primary/10"
    : allProcessed
      ? "from-amber-500/20 to-amber-500/10"
      : weekColor.bg;

  const iconClass = allCompleted
    ? "bg-primary/20"
    : allProcessed
      ? "bg-amber-500/20"
      : weekColor.icon;

  const badgeClass = allCompleted
    ? "bg-primary/20 text-primary"
    : allProcessed
      ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
      : weekColor.badge;

  const title = allCompleted
    ? "Completa ✓"
    : allProcessed
      ? "Finalizada ⚠"
      : `${semana}ª Semana`;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
        allCompleted && "ring-2 ring-primary/30 bg-primary/5 animate-glow-pulse",
        allProcessed && "ring-2 ring-amber-500/30 bg-amber-500/5 animate-glow-pulse-amber",
        isSelected && !allCompleted && !allProcessed && "ring-2 ring-ring"
      )}
      onClick={onClick}
    >
      <CardHeader className="p-0">
        <div className={cn("px-3 py-2 bg-gradient-to-r rounded-t-lg", headerGradient)}>
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <div className={cn("p-1 rounded-md", iconClass)}>
                {allCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary animate-check-bounce" />
                ) : allProcessed ? (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 animate-check-bounce" />
                ) : (
                  <Calendar className="h-3.5 w-3.5" />
                )}
              </div>
              <h3 className="font-semibold text-xs sm:text-sm">{title}</h3>
            </div>
            <CircularProgress value={progress} size={28} strokeWidth={2.5} completedCount={completedItems} notDoneCount={notDoneItems} totalCount={totalItems} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ListTodo className="h-3.5 w-3.5" />
            <span className="text-xs">{totalItems}</span>
          </div>
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", badgeClass)}>
            {completedItems}/{totalItems}
          </span>
        </div>

        <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden flex">
          <div
            className="h-full bg-primary rounded-l-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
          {notDoneItems > 0 && totalItems > 0 && (
            <div
              className="h-full bg-destructive transition-all duration-500 ease-out"
              style={{ width: `${(notDoneItems / totalItems) * 100}%` }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
