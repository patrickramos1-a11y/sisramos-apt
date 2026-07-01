export interface SetorWhatsappActionConfig {
  enabled: boolean;
  phone: string;
  template: string;
}

export interface SetorActionsConfig {
  whatsapp?: Partial<SetorWhatsappActionConfig> | null;
}

export interface SetorActionSource {
  nome?: string | null;
  acoes?: unknown;
}

export interface DemandaWhatsappContext {
  numero: number;
  repeticoes?: number;
  descricao: string;
  observacoes?: string | null;
  responsavel: string;
  setor: string;
  semanas: number[];
  mes: number;
  ano: number;
}

export const DEFAULT_SETOR_WHATSAPP_TEMPLATE =
  "Patrick, estou com uma duvida sobre a demanda:\n\n*{{descricao}}*\n\nRepeticoes no mes: {{repeticoes}}\nSetor: {{setor}}\nResponsavel: {{responsavel}}\nSemanas: {{semanas}}\nMes/Ano: {{mes}}/{{ano}}";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeSetorActions(raw: unknown): SetorActionsConfig {
  if (!isRecord(raw)) return {};

  const whatsapp = isRecord(raw.whatsapp) ? raw.whatsapp : null;
  return {
    whatsapp: whatsapp
      ? {
          enabled: Boolean(whatsapp.enabled),
          phone: typeof whatsapp.phone === "string" ? whatsapp.phone : "",
          template:
            typeof whatsapp.template === "string" && whatsapp.template.trim()
              ? whatsapp.template
              : DEFAULT_SETOR_WHATSAPP_TEMPLATE,
        }
      : undefined,
  };
}

export function getSetorWhatsappConfig(
  setor: SetorActionSource | null | undefined
): SetorWhatsappActionConfig | null {
  if (!setor) return null;

  const actions = normalizeSetorActions(setor.acoes);
  const config = actions.whatsapp;
  if (!config?.enabled) return null;

  const phone = normalizePhone(config.phone ?? "");
  if (!phone) return null;

  return {
    enabled: true,
    phone,
    template:
      typeof config.template === "string" && config.template.trim()
        ? config.template
        : DEFAULT_SETOR_WHATSAPP_TEMPLATE,
  };
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function formatWeeks(semanas: number[]): string {
  return semanas
    .slice()
    .sort((a, b) => a - b)
    .map((semana) => `${semana}a`)
    .join(", ");
}

function formatRepeticoes(value: number | undefined): string {
  const repeticoes = Math.max(Number(value) || 1, 1);
  return `${repeticoes}x`;
}

function applyTemplate(
  template: string,
  context: DemandaWhatsappContext
): string {
  const normalizedTemplate = template
    .replace(
      /Numero:\s*#?\s*\{\{numero\}\}/gi,
      "Repeticoes no mes: {{repeticoes}}"
    )
    .replace(/#\s*\{\{repeticoes\}\}/gi, "{{repeticoes}}");
  const repeticoes = formatRepeticoes(context.repeticoes ?? context.numero);
  const replacements: Record<string, string> = {
    numero: repeticoes,
    repeticoes,
    descricao: context.descricao,
    observacoes: context.observacoes?.trim() || "-",
    responsavel: context.responsavel,
    setor: context.setor,
    semanas: formatWeeks(context.semanas),
    mes: String(context.mes),
    ano: String(context.ano),
  };

  return normalizedTemplate.replace(/\{\{(\w+)\}\}/g, (_, key: string) => replacements[key] ?? "");
}

export function buildSetorWhatsAppHref(
  setor: SetorActionSource | null | undefined,
  context: DemandaWhatsappContext
): string | null {
  const config = getSetorWhatsappConfig(setor);
  if (!config) return null;

  const message = applyTemplate(config.template, context);
  return `https://wa.me/${config.phone}?text=${encodeURIComponent(message)}`;
}
