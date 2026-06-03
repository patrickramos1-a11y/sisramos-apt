import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DemandaBase {
  id: string;
  descricao: string;
  observacoes?: string | null;
  setor_id: string | null;
  responsavel_id: string;
  semana_limite: number[];
}

interface TransformarDemandaPersistenteDialogProps {
  open: boolean;
  demanda: DemandaBase | null;
  setores: Array<{ id: string; nome: string; cor?: string | null }>;
  profiles: Array<{ user_id: string; nome: string; cor?: string | null }>;
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: {
    nome: string;
    descricao: string;
    setor_id: string | null;
    responsavel_padrao_id: string;
    dias_semana: number[];
    semanas_aplicaveis: number[];
  }) => Promise<void> | void;
}

const WEEK_DAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

const WEEKS = [1, 2, 3, 4, 5];

function inferDays(text: string) {
  const normalized = text.toLowerCase();
  if (normalized.includes("segunda a sexta") || normalized.includes("segunda à sexta")) {
    return [1, 2, 3, 4, 5];
  }
  return [1, 2, 3, 4, 5];
}

export default function TransformarDemandaPersistenteDialog({
  open,
  demanda,
  setores,
  profiles,
  isSaving = false,
  onOpenChange,
  onConfirm,
}: TransformarDemandaPersistenteDialogProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [semanas, setSemanas] = useState<number[]>([1, 2, 3, 4, 5]);

  useEffect(() => {
    if (!demanda || !open) return;
    setNome(demanda.descricao);
    setDescricao(demanda.observacoes?.trim() || demanda.descricao);
    setDias(inferDays(`${demanda.descricao} ${demanda.observacoes || ""}`));
    setSemanas(demanda.semana_limite?.length ? demanda.semana_limite : [1, 2, 3, 4, 5]);
  }, [demanda, open]);

  const setor = useMemo(
    () => setores.find((item) => item.id === demanda?.setor_id),
    [demanda?.setor_id, setores]
  );
  const responsavel = useMemo(
    () => profiles.find((item) => item.user_id === demanda?.responsavel_id),
    [demanda?.responsavel_id, profiles]
  );

  const toggleDay = (value: number) => {
    setDias((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value].sort((a, b) => a - b)
    );
  };

  const toggleWeek = (value: number) => {
    setSemanas((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value].sort((a, b) => a - b)
    );
  };

  const canSave = !!demanda && nome.trim().length > 0 && descricao.trim().length > 0 && dias.length > 0 && semanas.length > 0;

  const handleConfirm = async () => {
    if (!demanda || !canSave) return;
    await onConfirm({
      nome: nome.trim(),
      descricao: descricao.trim(),
      setor_id: demanda.setor_id,
      responsavel_padrao_id: demanda.responsavel_id,
      dias_semana: dias,
      semanas_aplicaveis: semanas,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-orange-600" />
            Transformar demanda em persistente
          </DialogTitle>
          <p className="pt-1 text-sm text-muted-foreground">
            Ao confirmar, a demanda comum será desativada e passará a funcionar como rotina persistente. As ocorrências do mês atual serão geradas automaticamente.
          </p>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-3 text-sm text-orange-900">
            <p className="font-semibold">Conferência da transformação</p>
            <div className="mt-2 grid gap-2 text-xs md:grid-cols-2">
              <span>
                <strong>Origem:</strong> demanda comum
              </span>
              <span>
                <strong>Destino:</strong> rotina persistente
              </span>
              <span>
                <strong>Setor:</strong> {setor?.nome || "Sem setor"}
              </span>
              <span>
                <strong>Responsável:</strong> {responsavel?.nome || "Sem responsável"}
              </span>
              <span>
                <strong>Dias:</strong> {dias.map((day) => WEEK_DAYS.find((item) => item.value === day)?.label || day).join(", ")}
              </span>
              <span>
                <strong>Semanas:</strong> {semanas.map((week) => `${week}ª`).join(", ")}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1.5 rounded-full">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: setor?.cor || "#f97316" }} />
              {setor?.nome || "Sem setor"}
            </Badge>
            <Badge variant="outline" className="gap-1.5 rounded-full">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: responsavel?.cor || "#65a30d" }} />
              {responsavel?.nome || "Sem responsável"}
            </Badge>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rotina-nome">Nome da rotina</Label>
            <Input id="rotina-nome" value={nome} onChange={(event) => setNome(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rotina-descricao">Descrição operacional</Label>
            <Textarea
              id="rotina-descricao"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              rows={4}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Dias de ocorrência</Label>
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map((day) => {
                  const active = dias.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm font-semibold transition-colors",
                        active
                          ? "border-orange-300 bg-orange-600 text-white"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Semanas aplicáveis</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKS.map((week) => {
                  const active = semanas.includes(week);
                  return (
                    <button
                      key={week}
                      type="button"
                      onClick={() => toggleWeek(week)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm font-semibold transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {week}ª
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!canSave || isSaving} className="gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar rotina persistente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
