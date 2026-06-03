import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Users, Building2, Repeat, Star, Flame, CircleCheck, Copy, Trash2, X, Clock3, RefreshCw,
} from "lucide-react";

interface Props {
  selectedCount: number;
  selectedDemandaIds: string[];
  profileOptions: { value: string; label: string }[];
  setorOptions: { value: string; label: string; color?: string | null }[];
  onClear: () => void;
  onReassign: (responsavelId: string) => void;
  onMoveSetor: (setorId: string | null) => void;
  onSetRepeticoes: (n: number) => void;
  onSetPrioridade: (v: boolean) => void;
  onSetUrgencia: (v: boolean) => void;
  onSetStatusResp: (s: "pendente" | "executado" | "nao_realizado") => void;
  onSetStatusGestor: (s: "pendente" | "executado" | "nao_realizado") => void;
  onTransformPersistente: () => void;
  onTransformPrazo: () => void;
  onClearPrazo: () => void;
  selectedHasPrazo?: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

export default function BulkActionsBar({
  selectedCount,
  profileOptions,
  setorOptions,
  onClear,
  onReassign,
  onMoveSetor,
  onSetRepeticoes,
  onSetPrioridade,
  onSetUrgencia,
  onSetStatusResp,
  onSetStatusGestor,
  onTransformPersistente,
  onTransformPrazo,
  onClearPrazo,
  selectedHasPrazo,
  onDuplicate,
  onDelete,
  canDelete,
}: Props) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[95vw]">
      <div className="flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-1.5 rounded-3xl bg-foreground px-3 py-2 text-sm text-background shadow-xl">
        <span className="mr-1 border-r border-background/20 pr-2 font-semibold">
          {selectedCount} selecionada{selectedCount > 1 ? "s" : ""}
        </span>

        {/* Reassign */}
        <SearchablePicker
          options={profileOptions}
          onSelect={(v) => onReassign(v)}
          trigger={
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-background hover:bg-background/10 hover:text-background">
              <Users className="h-3.5 w-3.5" /> Reatribuir
            </Button>
          }
          placeholder="Buscar pessoa..."
        />

        {/* Move Setor */}
        <SearchablePicker
          options={setorOptions}
          allowNone
          onSelect={(v) => onMoveSetor(v)}
          trigger={
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-background hover:bg-background/10 hover:text-background">
              <Building2 className="h-3.5 w-3.5" /> Setor
            </Button>
          }
          placeholder="Buscar setor..."
        />

        {/* Repetições */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-background hover:bg-background/10 hover:text-background">
              <Repeat className="h-3.5 w-3.5" /> Rep.
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="center">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onSetRepeticoes(n)}
                  className="h-8 w-9 rounded-md text-xs font-semibold border border-border bg-background hover:bg-muted"
                >
                  {n}X
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground max-w-[180px]">
              Aplica como semanas_repeticao (não cria/remove siblings).
            </p>
          </PopoverContent>
        </Popover>

        {/* Prioridade */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-background hover:bg-background/10 hover:text-background">
              <Star className="h-3.5 w-3.5" /> Prio.
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onSetPrioridade(true)}>
              <Star className="mr-2 h-4 w-4 fill-warning text-warning" /> Marcar como prioritária
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetPrioridade(false)}>
              <Star className="mr-2 h-4 w-4" /> Remover prioridade
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Urgência */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-background hover:bg-background/10 hover:text-background">
              <Flame className="h-3.5 w-3.5" /> Urg.
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onSetUrgencia(true)}>
              <Flame className="mr-2 h-4 w-4 fill-destructive text-destructive" /> Marcar urgente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetUrgencia(false)}>
              <Flame className="mr-2 h-4 w-4" /> Remover urgência
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-background hover:bg-background/10 hover:text-background">
              <CircleCheck className="h-3.5 w-3.5" /> Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel className="text-xs">Status do responsável</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onSetStatusResp("executado")}>Executado</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetStatusResp("pendente")}>Pendente</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetStatusResp("nao_realizado")}>Não realizado</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Aprovação do gestor</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onSetStatusGestor("executado")}>Aprovado</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetStatusGestor("pendente")}>Pendente</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetStatusGestor("nao_realizado")}>Não realizado</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={onTransformPersistente}
          className="h-7 gap-1.5 text-background hover:bg-background/10 hover:text-background"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Persist.
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-background hover:bg-background/10 hover:text-background">
              <Clock3 className="h-3.5 w-3.5" /> Prazo
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onTransformPrazo}>
              <Clock3 className="mr-2 h-4 w-4 text-sky-600" /> Transformar em demanda com prazo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClearPrazo} disabled={!selectedHasPrazo}>
              <Repeat className="mr-2 h-4 w-4" /> Tirar prazo e voltar ao semanal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDuplicate}
          className="h-7 gap-1.5 text-background hover:bg-background/10 hover:text-background"
        >
          <Copy className="h-3.5 w-3.5" /> Duplicar
        </Button>

        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-destructive-foreground hover:bg-destructive/80">
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir {selectedCount} demanda(s)?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação remove as demandas selecionadas (e as semanas irmãs que estão na seleção). Não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="h-7 w-7 ml-1 text-background hover:bg-background/10 hover:text-background"
          aria-label="Limpar seleção"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SearchablePicker({
  options,
  onSelect,
  trigger,
  placeholder,
  allowNone,
}: {
  options: { value: string; label: string; color?: string | null }[];
  onSelect: (value: string | null) => void;
  trigger: React.ReactNode;
  placeholder: string;
  allowNone?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="center">
        <Command>
          <CommandInput placeholder={placeholder} className="h-9" />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            <CommandGroup>
              {allowNone && (
                <CommandItem
                  value="—sem—"
                  onSelect={() => onSelect(null)}
                  className="text-muted-foreground"
                >
                  Sem setor
                </CommandItem>
              )}
              {options.map((opt) => (
                <CommandItem key={opt.value} value={opt.label} onSelect={() => onSelect(opt.value)}>
                  {opt.color && (
                    <span
                      className="mr-2 h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: opt.color }}
                    />
                  )}
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
