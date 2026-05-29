import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AptTag, colorForTagSlug, normalizeTagSlug } from "@/lib/tags";

interface TagSelectorProps {
  label?: string;
  tags: string[];
  availableTags?: AptTag[];
  onChange: (tags: string[]) => void;
}

export default function TagSelector({
  label = "Tags",
  tags,
  availableTags = [],
  onChange,
}: TagSelectorProps) {
  const [value, setValue] = useState("");

  const selectedSlugs = useMemo(
    () => new Set(tags.map((tag) => normalizeTagSlug(tag))),
    [tags]
  );

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    return availableTags
      .filter((tag) => !selectedSlugs.has(tag.slug))
      .filter((tag) => !query || tag.nome.toLowerCase().includes(query))
      .slice(0, 8);
  }, [availableTags, selectedSlugs, value]);

  const addTag = (name: string) => {
    const clean = name.trim();
    const slug = normalizeTagSlug(clean);
    if (!clean || !slug || selectedSlugs.has(slug)) return;
    onChange([...tags, clean]);
    setValue("");
  };

  const removeTag = (name: string) => {
    const slug = normalizeTagSlug(name);
    onChange(tags.filter((tag) => normalizeTagSlug(tag) !== slug));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag(value);
            }
          }}
          placeholder="Digite uma tag e pressione Enter..."
        />
        <Button type="button" variant="outline" onClick={() => addTag(value)}>
          Adicionar
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => addTag(tag.nome)}
              className="rounded-full border px-2 py-0.5 text-xs font-medium transition-colors hover:bg-muted"
              style={{ backgroundColor: `${tag.cor}66`, borderColor: tag.cor }}
            >
              {tag.nome}
            </button>
          ))}
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => {
            const slug = normalizeTagSlug(tag);
            const existing = availableTags.find((item) => item.slug === slug);
            const color = existing?.cor || colorForTagSlug(slug);
            return (
              <span
                key={slug}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
                )}
                style={{ backgroundColor: `${color}66`, borderColor: color }}
              >
                {tag}
                <button type="button" onClick={() => removeTag(tag)} aria-label={`Remover tag ${tag}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
