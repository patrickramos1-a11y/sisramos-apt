import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata o nome de um perfil de usuário, adicionando "(excluído)" se foi soft-deletado.
 * Usado em telas históricas (cards, tabelas, charts) para preservar a referência ao usuário.
 */
export function formatUserName(profile?: { nome?: string | null; deleted_at?: string | null } | null): string {
  if (!profile) return "—";
  const nome = profile.nome || "—";
  return profile.deleted_at ? `${nome} (excluído)` : nome;
}

/**
 * Filtra perfis ativos (não excluídos). Use em seletores de responsável/assignee.
 */
export function filterActiveProfiles<T extends { deleted_at?: string | null }>(profiles: T[]): T[] {
  return profiles.filter((p) => !p.deleted_at);
}
