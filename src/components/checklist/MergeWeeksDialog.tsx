import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Layers } from "lucide-react";

const WEEK_LABELS: Record<number, string> = {
  1: "1ª Semana",
  2: "2ª Semana",
  3: "3ª Semana",
  4: "4ª Semana",
  5: "5ª Semana",
};

const WEEK_COLORS: Record<number, string> = {
  1: "text-emerald-600 dark:text-emerald-400",
  2: "text-blue-600 dark:text-blue-400",
  3: "text-purple-600 dark:text-purple-400",
  4: "text-orange-600 dark:text-orange-400",
  5: "text-pink-600 dark:text-pink-400",
};

interface MergeWeeksDialogProps {
  currentMerged: number[];
  onMerge: (weeks: number[]) => void;
  onUnmerge: () => void;
}

export default function MergeWeeksDialog({ currentMerged, onMerge, onUnmerge }: MergeWeeksDialogProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>(currentMerged.length > 0 ? currentMerged : []);
  const isMerged = currentMerged.length >= 2;

  const toggleWeek = (week: number) => {
    setSelected((prev) =>
      prev.includes(week) ? prev.filter((w) => w !== week) : [...prev, week].sort()
    );
  };

  const handleConfirm = () => {
    if (selected.length >= 2) {
      onMerge(selected);
      setOpen(false);
    }
  };

  const handleUnmerge = () => {
    onUnmerge();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setSelected(currentMerged.length > 0 ? currentMerged : []); }}>
      <DialogTrigger asChild>
        <Button
          variant={isMerged ? "secondary" : "outline"}
          size="sm"
          className="h-8 gap-1 text-xs"
        >
          <Layers className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{isMerged ? "Semanas mescladas" : "Mesclar"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mesclar Semanas</DialogTitle>
          <DialogDescription>
            Selecione as semanas para rodar juntas. As demandas serão exibidas em uma visualização única e o cronômetro contará para todas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {[1, 2, 3, 4, 5].map((week) => (
            <div
              key={week}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted transition-colors"
              onClick={() => toggleWeek(week)}
            >
              <Checkbox checked={selected.includes(week)} className="pointer-events-none" />
              <span className={`text-sm font-medium ${WEEK_COLORS[week]}`}>
                {WEEK_LABELS[week]}
              </span>
            </div>
          ))}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isMerged && (
            <Button variant="outline" className="text-destructive" onClick={handleUnmerge}>
              Separar semanas
            </Button>
          )}
          <Button onClick={handleConfirm} disabled={selected.length < 2}>
            {isMerged ? "Atualizar" : "Mesclar"} ({selected.length} semanas)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
