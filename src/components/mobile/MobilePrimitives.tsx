import { ReactNode } from "react";
import { Filter, LucideIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface MobileMetricItem {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  icon?: LucideIcon;
  tone?: "green" | "blue" | "orange" | "red" | "neutral";
}

const metricToneClasses: Record<NonNullable<MobileMetricItem["tone"]>, string> = {
  green: "bg-primary/10 text-primary",
  blue: "bg-sky-100 text-sky-700",
  orange: "bg-orange-100 text-orange-700",
  red: "bg-red-100 text-red-700",
  neutral: "bg-muted text-muted-foreground",
};

export function MobileMetricStrip({ items, className }: { items: MobileMetricItem[]; className?: string }) {
  return (
    <section
      className={cn(
        "grid grid-cols-2 gap-2 rounded-3xl border border-border/70 bg-card/95 p-2 shadow-sm sm:grid-cols-4",
        className
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="min-w-0 rounded-2xl bg-muted/35 p-3">
            <div className="mb-1 flex items-center gap-2">
              {Icon && (
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-xl", metricToneClasses[item.tone || "green"])}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
              )}
              <span className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {item.label}
              </span>
            </div>
            <div className="truncate text-base font-black leading-tight text-foreground">{item.value}</div>
            {item.helper && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.helper}</div>}
          </div>
        );
      })}
    </section>
  );
}

export function MobileFilterTrigger({
  count,
  onClick,
  label = "Filtros",
}: {
  count?: number;
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button variant="outline" size="sm" className="h-9 gap-2 rounded-full px-3 text-xs" onClick={onClick}>
      <Filter className="h-4 w-4" />
      {label}
      {Boolean(count) && (
        <Badge className="h-5 min-w-5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
          {count}
        </Badge>
      )}
    </Button>
  );
}

export function MobileBulkBar({
  count,
  onApprove,
  onReject,
  onClear,
}: {
  count: number;
  onApprove: () => void;
  onReject: () => void;
  onClear: () => void;
}) {
  if (count <= 0) return null;

  return (
    <div className="fixed inset-x-3 bottom-[72px] z-40 rounded-2xl border border-primary/25 bg-background/95 p-2 shadow-xl backdrop-blur lg:hidden">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <p className="text-xs font-bold text-foreground">{count} selecionada{count === 1 ? "" : "s"}</p>
          <p className="text-[10px] text-muted-foreground">Ação em massa do gestor</p>
        </div>
        <Button size="sm" className="h-8 rounded-xl bg-emerald-600 px-3 text-xs hover:bg-emerald-700" onClick={onApprove}>
          Aprovar
        </Button>
        <Button size="sm" variant="destructive" className="h-8 rounded-xl px-3 text-xs" onClick={onReject}>
          Rejeitar
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={onClear} aria-label="Limpar seleção">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function MobileEmptyState({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-border/80 bg-card/70 px-5 py-10 text-center">
      {Icon && (
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <p className="text-sm font-bold text-foreground">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
