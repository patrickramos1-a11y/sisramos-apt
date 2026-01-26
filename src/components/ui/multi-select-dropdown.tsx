import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectDropdownProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = "Selecionar...",
  className,
}: MultiSelectDropdownProps) {
  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const toggleAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((o) => o.value));
    }
  };

  const getDisplayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      return options.find((o) => o.value === selected[0])?.label || selected[0];
    }
    return `${selected.length} selecionados`;
  };

  return (
    <Popover modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between font-normal h-10",
            selected.length > 0 && "text-foreground",
            className
          )}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-full min-w-[200px] p-0 bg-popover border shadow-lg z-50" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-60 overflow-y-auto p-2 space-y-1">
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleAll();
            }}
          >
            <Checkbox
              checked={selected.length === options.length}
              className="pointer-events-none"
            />
            <span className="text-sm font-medium">
              {selected.length === options.length ? "Desmarcar todos" : "Selecionar todos"}
            </span>
          </div>
          <div className="border-t my-1" />
          {options.map((option) => (
            <div
              key={option.value}
              className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleOption(option.value);
              }}
            >
              <Checkbox
                checked={selected.includes(option.value)}
                className="pointer-events-none"
              />
              <span className="text-sm">{option.label}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
