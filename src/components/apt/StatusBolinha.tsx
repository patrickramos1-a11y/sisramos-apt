import { cn } from "@/lib/utils";

type StatusBolinha = "pendente" | "executado" | "nao_realizado";

interface StatusBolinhaProps {
  status: StatusBolinha;
  onClick?: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const statusColors: Record<StatusBolinha, string> = {
  pendente: "bg-[hsl(var(--apt-pendente))] border-border/80",
  executado: "bg-[hsl(var(--apt-executado))] border-[hsl(var(--apt-executado))]",
  nao_realizado: "bg-[hsl(var(--apt-nao-realizado))] border-[hsl(var(--apt-nao-realizado))]",
};

const sizeClasses = {
  sm: "h-5 w-5 border",
  md: "h-6 w-6 border-2",
  lg: "h-9 w-9 border-2",
};

export default function StatusBolinha({
  status,
  onClick,
  disabled = false,
  size = "md",
}: StatusBolinhaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full transition-all duration-200 shadow-inner/30",
        sizeClasses[size],
        statusColors[status],
        !disabled && "cursor-pointer hover:scale-110 hover:ring-2 hover:ring-primary/30 hover:ring-offset-1 hover:ring-offset-background",
        disabled && "cursor-not-allowed opacity-50"
      )}
      title={
        status === "pendente"
          ? "Pendente"
          : status === "executado"
          ? "Executado"
          : "Não realizado"
      }
    />
  );
}
