import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Palette, Check } from "lucide-react";

interface UserColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

const PRESET_COLORS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Amber
  "#EAB308", // Yellow
  "#84CC16", // Lime
  "#22C55E", // Green
  "#10B981", // Emerald
  "#14B8A6", // Teal
  "#06B6D4", // Cyan
  "#0EA5E9", // Sky
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#A855F7", // Purple
  "#D946EF", // Fuchsia
  "#EC4899", // Pink
  "#F43F5E", // Rose
  "#6B7280", // Gray
  "#1F2937", // Dark Gray
  "#000000", // Black
];

export default function UserColorPicker({ color, onChange, disabled }: UserColorPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2 h-8 px-2"
        >
          <div
            className="w-4 h-4 rounded-full border border-border"
            style={{ backgroundColor: color }}
          />
          <Palette className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="grid grid-cols-5 gap-2">
          {PRESET_COLORS.map((presetColor) => (
            <button
              key={presetColor}
              type="button"
              className={cn(
                "w-7 h-7 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center",
                color === presetColor
                  ? "border-foreground"
                  : "border-transparent hover:border-muted-foreground/50"
              )}
              style={{ backgroundColor: presetColor }}
              onClick={() => {
                onChange(presetColor);
                setOpen(false);
              }}
            >
              {color === presetColor && (
                <Check className={cn(
                  "h-4 w-4",
                  ["#F59E0B", "#EAB308", "#84CC16", "#22C55E", "#10B981", "#14B8A6", "#06B6D4", "#0EA5E9"].includes(presetColor)
                    ? "text-black"
                    : "text-white"
                )} />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
