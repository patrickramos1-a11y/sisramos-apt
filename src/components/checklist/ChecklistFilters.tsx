import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChecklistFiltersProps {
  mes: number;
  ano: number;
  semana: number | null;
  searchTerm: string;
  onMesChange: (value: number) => void;
  onAnoChange: (value: number) => void;
  onSemanaChange: (value: number | null) => void;
  onSearchChange: (value: string) => void;
}

const MESES = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const SEMANAS = [
  { value: 1, label: "1ª Semana" },
  { value: 2, label: "2ª Semana" },
  { value: 3, label: "3ª Semana" },
  { value: 4, label: "4ª Semana" },
  { value: 5, label: "5ª Semana" },
];

const currentYear = new Date().getFullYear();
const ANOS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export default function ChecklistFilters({
  mes,
  ano,
  semana,
  searchTerm,
  onMesChange,
  onAnoChange,
  onSemanaChange,
  onSearchChange,
}: ChecklistFiltersProps) {
  const handleClearFilters = () => {
    const now = new Date();
    onMesChange(now.getMonth() + 1);
    onAnoChange(now.getFullYear());
    onSemanaChange(null);
    onSearchChange("");
  };

  const hasActiveFilters =
    semana !== null ||
    searchTerm.trim() !== "" ||
    mes !== new Date().getMonth() + 1 ||
    ano !== new Date().getFullYear();

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Ano */}
        <div className="w-full sm:w-32">
          <Select value={String(ano)} onValueChange={(v) => onAnoChange(Number(v))}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {ANOS.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mês */}
        <div className="w-full sm:w-40">
          <Select value={String(mes)} onValueChange={(v) => onMesChange(Number(v))}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Semana */}
        <div className="w-full sm:w-40">
          <Select
            value={semana !== null ? String(semana) : "all"}
            onValueChange={(v) => onSemanaChange(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Todas as semanas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as semanas</SelectItem>
              {SEMANAS.map((s) => (
                <SelectItem key={s.value} value={String(s.value)}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-10 gap-2 text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Textarea
          placeholder="Pesquisar itens do checklist..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 min-h-[44px] max-h-[120px] resize-none text-sm"
          rows={1}
        />
      </div>
    </div>
  );
}
