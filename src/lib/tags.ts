import { supabase } from "@/integrations/supabase/client";

export interface AptTag {
  id: string;
  nome: string;
  slug: string;
  cor: string;
}

const TAG_COLORS = [
  "#DDEBFF",
  "#DCFCE7",
  "#FEF3C7",
  "#FFE4E6",
  "#EDE9FE",
  "#CCFBF1",
  "#FCE7F3",
  "#E0F2FE",
];

export function normalizeTagSlug(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function colorForTagSlug(slug: string) {
  const total = slug.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_COLORS[total % TAG_COLORS.length];
}

export function uniqueTags(tags: AptTag[]) {
  const map = new Map<string, AptTag>();
  tags.forEach((tag) => map.set(tag.id, tag));
  return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function ensureTagsByName(names: string[]) {
  const normalized = names
    .map((name) => ({ nome: name.trim(), slug: normalizeTagSlug(name) }))
    .filter((tag) => tag.nome && tag.slug);

  const uniqueBySlug = Array.from(new Map(normalized.map((tag) => [tag.slug, tag])).values());
  if (uniqueBySlug.length === 0) return [];

  const slugs = uniqueBySlug.map((tag) => tag.slug);
  const { data: existing, error: existingError } = await supabase
    .from("tags" as any)
    .select("id,nome,slug,cor")
    .in("slug", slugs);

  if (existingError) throw existingError;

  const existingTags = (existing || []) as AptTag[];
  const existingSlugs = new Set(existingTags.map((tag) => tag.slug));
  const toCreate = uniqueBySlug
    .filter((tag) => !existingSlugs.has(tag.slug))
    .map((tag) => ({ ...tag, cor: colorForTagSlug(tag.slug) }));

  if (toCreate.length === 0) return existingTags;

  const { data: created, error: createError } = await supabase
    .from("tags" as any)
    .insert(toCreate)
    .select("id,nome,slug,cor");

  if (createError) throw createError;
  return uniqueTags([...(existingTags || []), ...((created || []) as AptTag[])]);
}

export async function syncDemandTags(demandaIds: string[], tagNames: string[]) {
  const uniqueDemandIds = [...new Set(demandaIds)].filter(Boolean);
  if (uniqueDemandIds.length === 0) return [];

  let tags: AptTag[] = [];
  try {
    tags = await ensureTagsByName(tagNames);
  } catch (error: any) {
    if (/tags|demanda_tags|schema cache/i.test(error?.message || "")) return [];
    throw error;
  }
  const tagIds = tags.map((tag) => tag.id);

  const { error: deleteError } = await supabase
    .from("demanda_tags" as any)
    .delete()
    .in("demanda_id", uniqueDemandIds);

  if (deleteError) {
    if (/demanda_tags|schema cache/i.test(deleteError.message || "")) return [];
    throw deleteError;
  }

  if (tagIds.length === 0) return tags;

  const rows = uniqueDemandIds.flatMap((demanda_id) =>
    tagIds.map((tag_id) => ({ demanda_id, tag_id }))
  );

  const { error: insertError } = await supabase.from("demanda_tags" as any).insert(rows);
  if (insertError) {
    if (/demanda_tags|schema cache/i.test(insertError.message || "")) return [];
    throw insertError;
  }
  return tags;
}
