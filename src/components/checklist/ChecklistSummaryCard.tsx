import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, CheckCircle2, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistSummaryCardProps {
  semana: number;
  totalItems: number;
  completedItems: number;
  onClick: () => void;
}

export default function ChecklistSummaryCard({
  semana,
  totalItems,
  completedItems,
  onClick,
}: ChecklistSummaryCardProps) {
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const allCompleted = totalItems > 0 && completedItems === totalItems;

  // Different colors for each week
  const weekColors: Record<number, { bg: string; icon: string; badge: string }> = {
    1: { bg: "from-emerald-500/20 to-emerald-500/5", icon: "bg-emerald-500/30 text-emerald-700 dark:text-emerald-400", badge: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" },
    2: { bg: "from-blue-500/20 to-blue-500/5", icon: "bg-blue-500/30 text-blue-700 dark:text-blue-400", badge: "bg-blue-500/20 text-blue-700 dark:text-blue-400" },
    3: { bg: "from-purple-500/20 to-purple-500/5", icon: "bg-purple-500/30 text-purple-700 dark:text-purple-400", badge: "bg-purple-500/20 text-purple-700 dark:text-purple-400" },
    4: { bg: "from-orange-500/20 to-orange-500/5", icon: "bg-orange-500/30 text-orange-700 dark:text-orange-400", badge: "bg-orange-500/20 text-orange-700 dark:text-orange-400" },
    5: { bg: "from-pink-500/20 to-pink-500/5", icon: "bg-pink-500/30 text-pink-700 dark:text-pink-400", badge: "bg-pink-500/20 text-pink-700 dark:text-pink-400" },
  };

  const weekColor = weekColors[semana] || weekColors[1];

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
        allCompleted && "ring-2 ring-primary/30 bg-primary/5"
      )}
      onClick={onClick}
    >
      <CardHeader className="p-0">
        <div className={cn(
          "px-4 py-3 bg-gradient-to-r rounded-t-lg",
          allCompleted 
            ? "from-primary/20 to-primary/10" 
            : weekColor.bg
        )}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-md",
                allCompleted ? "bg-primary/20" : weekColor.icon
              )}>
                {allCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
              </div>
              <h3 className="font-semibold text-sm sm:text-base">
                {semana}ª Semana
              </h3>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ListTodo className="h-4 w-4" />
            <span className="text-sm">{totalItems} tarefas</span>
          </div>
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            allCompleted 
              ? "bg-primary/20 text-primary" 
              : weekColor.badge
          )}>
            {completedItems}/{totalItems}
          </span>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Clique para ver detalhes
        </p>
      </CardContent>
    </Card>
  );
}
