import { useState } from "react";
import { Timer, Square, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ChecklistTimerProps {
  isRunning: boolean;
  isPaused: boolean;
  isActive: boolean;
  activeWeek: number | null;
  elapsedSeconds: number;
  isGestorOrAdmin: boolean;
  onStart: (semana: number) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function ChecklistTimer({
  isRunning,
  isPaused,
  isActive,
  activeWeek,
  elapsedSeconds,
  isGestorOrAdmin,
  onStart,
  onPause,
  onResume,
  onStop,
}: ChecklistTimerProps) {
  const [selectedWeek, setSelectedWeek] = useState("1");
  const [showStopDialog, setShowStopDialog] = useState(false);

  if (!isActive && !isGestorOrAdmin) return null;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border px-4 py-2.5 transition-all",
          isRunning
            ? "bg-primary/10 border-primary/30 animate-pulse-subtle"
            : isPaused
            ? "bg-amber-500/10 border-amber-500/30"
            : "bg-muted/50 border-border"
        )}
      >
        <Timer
          className={cn(
            "h-5 w-5 shrink-0",
            isRunning
              ? "text-primary animate-spin-slow"
              : isPaused
              ? "text-amber-500"
              : "text-muted-foreground"
          )}
        />

        {isActive ? (
          <>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Semana {activeWeek}
              </span>
              {isPaused && (
                <span className="text-[10px] font-medium text-amber-500 uppercase tracking-wide">
                  Pausado
                </span>
              )}
              <span
                className={cn(
                  "font-mono text-lg font-bold tabular-nums",
                  isRunning ? "text-primary" : "text-amber-500"
                )}
              >
                {formatTime(elapsedSeconds)}
              </span>
            </div>
            {isGestorOrAdmin && (
              <div className="flex items-center gap-1.5 shrink-0">
                {isRunning ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                    onClick={onPause}
                  >
                    <Pause className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Pausar</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={onResume}
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Retomar</span>
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => setShowStopDialog(true)}
                >
                  <Square className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Parar</span>
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    Semana {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => onStart(parseInt(selectedWeek))}
            >
              <Play className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Iniciar</span>
            </Button>
          </>
        )}
      </div>

      <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Parar cronômetro?</AlertDialogTitle>
            <AlertDialogDescription>
              O cronômetro da <strong>Semana {activeWeek}</strong> será finalizado com o tempo de{" "}
              <strong>{formatTime(elapsedSeconds)}</strong>. Esse tempo ficará registrado no card da semana.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onStop();
                setShowStopDialog(false);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
