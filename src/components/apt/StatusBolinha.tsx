import { cn } from "@/lib/utils";

type StatusBolinha = "pendente" | "executado" | "nao_realizado";

interface StatusBolinhaProps {
  status: StatusBolinha;
  onClick?: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const statusColors: Record<StatusBolinha, string> = {
  pendente: "bg-[hsl(var(--apt-pendente))] border-border",
  executado: "bg-[hsl(var(--apt-executado))]",
  nao_realizado: "bg-[hsl(var(--apt-nao-realizado))]",
};

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
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
        "rounded-full border-2 transition-all duration-200",
        sizeClasses[size],
        statusColors[status],
        !disabled && "cursor-pointer hover:scale-110 hover:shadow-md",
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
