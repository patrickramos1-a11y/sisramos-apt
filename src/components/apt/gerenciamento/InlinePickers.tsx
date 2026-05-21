import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PickerOption {
  value: string;
  label: string;
  color?: string | null;
}

interface InlinePickerProps {
  value: string | null;
  options: PickerOption[];
  onSelect: (value: string | null) => void;
  trigger: React.ReactNode;
  allowNone?: boolean;
  searchPlaceholder?: string;
}

export function InlinePicker({
  value,
  options,
  onSelect,
  trigger,
  allowNone = false,
  searchPlaceholder = "Buscar...",
}: InlinePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[240px] p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            <CommandGroup>
              {allowNone && (
                <CommandItem
                  value="—sem—"
                  onSelect={() => onSelect(null)}
                  className="text-muted-foreground"
                >
                  <Check className={cn("mr-2 h-4 w-4", value === null ? "opacity-100" : "opacity-0")} />
                  Sem setor
                </CommandItem>
              )}
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => onSelect(opt.value)}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")}
                  />
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

interface RepeticoesPickerProps {
  value: number;
  onSelect: (n: number) => void;
  trigger: React.ReactNode;
}

export function RepeticoesPicker({ value, onSelect, trigger }: RepeticoesPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onSelect(n)}
              className={cn(
                "h-8 w-8 rounded-md text-xs font-semibold border transition-colors",
                value === n
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted border-border/70"
              )}
            >
              {n}X
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}