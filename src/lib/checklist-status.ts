import { Check, Circle, CircleOff, HelpCircle, X } from "lucide-react";

export type ChecklistCanonicalStatus =
  | "pendente"
  | "feito"
  | "nao_feito"
  | "nao_relevante"
  | "nao_consegui";

export type ChecklistLegacyStatus = "concluido" | "nao_realizado";
export type ChecklistStatus = ChecklistCanonicalStatus | ChecklistLegacyStatus;

export const CHECKLIST_STATUS_OPTIONS = [
  { value: "pendente" as const, label: "Pendente", shortLabel: "Pendente", icon: Circle, className: "border-slate-200 bg-slate-50 text-slate-600" },
  { value: "feito" as const, label: "Feito", shortLabel: "Feito", icon: Check, className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "nao_feito" as const, label: "Não feito", shortLabel: "Não feito", icon: X, className: "border-red-200 bg-red-50 text-red-700" },
  { value: "nao_relevante" as const, label: "Não era relevante", shortLabel: "Irrelevante", icon: CircleOff, className: "border-sky-200 bg-sky-50 text-sky-700" },
  { value: "nao_consegui" as const, label: "Não consegui fazer", shortLabel: "Não consegui", icon: HelpCircle, className: "border-amber-200 bg-amber-50 text-amber-700" },
] as const;

export function normalizeChecklistStatus(status: ChecklistStatus | string | null | undefined): ChecklistCanonicalStatus {
  if (status === "concluido") return "feito";
  if (status === "nao_realizado") return "nao_feito";
  if (CHECKLIST_STATUS_OPTIONS.some((option) => option.value === status)) return status as ChecklistCanonicalStatus;
  return "pendente";
}

export function isChecklistStatusFinal(status: ChecklistStatus | string | null | undefined) {
  return normalizeChecklistStatus(status) !== "pendente";
}

// Avulsos em acompanhamento only leave the active queue after a definitive
// outcome. "Not relevant" and "could not do" remain visible for the next
// week, moment, or month until someone closes them as done or not done.
export function isChecklistMonthlyAvulsoResolved(status: ChecklistStatus | string | null | undefined) {
  const normalized = normalizeChecklistStatus(status);
  return normalized === "feito" || normalized === "nao_feito";
}

export function getChecklistStatusOption(status: ChecklistStatus | string | null | undefined) {
  const normalized = normalizeChecklistStatus(status);
  return CHECKLIST_STATUS_OPTIONS.find((option) => option.value === normalized) ?? CHECKLIST_STATUS_OPTIONS[0];
}
