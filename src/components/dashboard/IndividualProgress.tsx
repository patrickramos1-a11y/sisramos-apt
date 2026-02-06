import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target } from "lucide-react";

interface IndividualProgressProps {
  totalDemandas: number;
  completedDemandas: number;
  userName: string;
}

export default function IndividualProgress({
  totalDemandas,
  completedDemandas,
  userName,
}: IndividualProgressProps) {
  const percentage = totalDemandas > 0
    ? Math.round((completedDemandas / totalDemandas) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Progresso Mensal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Olá, {userName}!
            </span>
            <span className="text-2xl font-bold text-primary">
              {percentage}%
            </span>
          </div>
          
          <Progress value={percentage} className="h-3" />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedDemandas} de {totalDemandas} demandas concluídas
            </span>
            {percentage >= 80 && (
              <span className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                Excelente!
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
