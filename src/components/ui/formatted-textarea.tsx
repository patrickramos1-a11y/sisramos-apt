import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bold, Underline, List, CaseSensitive, ChevronDown } from "lucide-react";

export interface FormattedTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
}

const FormattedTextarea = React.forwardRef<HTMLTextAreaElement, FormattedTextareaProps>(
  ({ className, value, onChange, onValueChange, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const combinedRef = (node: HTMLTextAreaElement) => {
      textareaRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const getSelection = () => {
      const textarea = textareaRef.current;
      if (!textarea) return { start: 0, end: 0, text: "" };
      return {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
        text: textarea.value.substring(textarea.selectionStart, textarea.selectionEnd),
      };
    };

    const updateValue = (newValue: string) => {
      if (onValueChange) {
        onValueChange(newValue);
      }
      // Trigger synthetic event for controlled components
      if (onChange) {
        const event = {
          target: { value: newValue },
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(event);
      }
    };

    const applyFormatting = (prefix: string, suffix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { start, end, text } = getSelection();
      const currentValue = String(value || "");

      if (start === end) {
        // No selection - insert format markers
        const newValue = currentValue.slice(0, start) + prefix + suffix + currentValue.slice(end);
        updateValue(newValue);
        // Move cursor between markers
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + prefix.length, start + prefix.length);
        }, 0);
      } else {
        // Has selection - wrap it
        const newValue = currentValue.slice(0, start) + prefix + text + suffix + currentValue.slice(end);
        updateValue(newValue);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, end + prefix.length + suffix.length);
        }, 0);
      }
    };

    const handleBold = () => {
      applyFormatting("**", "**");
    };

    const handleUnderline = () => {
      applyFormatting("__", "__");
    };

    const handleBullet = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { start, end, text } = getSelection();
      const currentValue = String(value || "");

      if (start === end) {
        // No selection - add bullet at cursor
        const lineStart = currentValue.lastIndexOf("\n", start - 1) + 1;
        const newValue = currentValue.slice(0, lineStart) + "• " + currentValue.slice(lineStart);
        updateValue(newValue);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + 2, start + 2);
        }, 0);
      } else {
        // Has selection - add bullet to each line
        const lines = text.split("\n");
        const bulletedLines = lines.map((line) => (line.trim() ? "• " + line : line)).join("\n");
        const newValue = currentValue.slice(0, start) + bulletedLines + currentValue.slice(end);
        updateValue(newValue);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start, start + bulletedLines.length);
        }, 0);
      }
    };

    const handleCaseChange = (caseType: "upper" | "lower" | "title") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { start, end, text } = getSelection();
      const currentValue = String(value || "");

      if (start === end) return; // No selection

      let transformed = text;
      switch (caseType) {
        case "upper":
          transformed = text.toUpperCase();
          break;
        case "lower":
          transformed = text.toLowerCase();
          break;
        case "title":
          transformed = text
            .toLowerCase()
            .replace(/(?:^|\s|[-"'(])\S/g, (char) => char.toUpperCase());
          break;
      }

      const newValue = currentValue.slice(0, start) + transformed + currentValue.slice(end);
      updateValue(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + transformed.length);
      }, 0);
    };

    return (
      <div className="space-y-1.5">
        {/* Toolbar */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-md border">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleBold}
                >
                  <Bold className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Negrito (**texto**)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleUnderline}
                >
                  <Underline className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Sublinhado (__texto__)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleBullet}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Tópico (• item)</p>
              </TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-border mx-1" />

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 gap-1"
                    >
                      <CaseSensitive className="h-3.5 w-3.5" />
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Alterar Maiúsculas/Minúsculas</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleCaseChange("upper")}>
                  <span className="font-mono text-xs mr-2">ABC</span>
                  MAIÚSCULAS
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCaseChange("lower")}>
                  <span className="font-mono text-xs mr-2">abc</span>
                  minúsculas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCaseChange("title")}>
                  <span className="font-mono text-xs mr-2">Abc</span>
                  Primeiras Maiúsculas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>
        </div>

        {/* Textarea */}
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={combinedRef}
          value={value}
          onChange={onChange}
          {...props}
        />

        <p className="text-xs text-muted-foreground">
          Selecione o texto para aplicar formatação
        </p>
      </div>
    );
  }
);

FormattedTextarea.displayName = "FormattedTextarea";

export { FormattedTextarea };
