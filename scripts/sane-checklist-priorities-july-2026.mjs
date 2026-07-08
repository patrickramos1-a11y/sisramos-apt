import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const TARGET_ANO = 2026;
const TARGET_MES = 7;
const VALID_PRIORITIES = new Set(["alta", "media", "baixa"]);
const isDryRun = process.argv.includes("--dry-run");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function priorityBucket(priority) {
  return priority || "null";
}

function monthKey(row) {
  return `${row.ano}-${String(row.mes).padStart(2, "0")}`;
}

function matchKey(row) {
  return [
    row.template_id,
    row.semana,
    row.tipo_item,
    row.parent_id ? "child" : "parent",
  ].join("|");
}

function countByWeekPriority(rows) {
  return rows.reduce((acc, row) => {
    const week = `sem${row.semana}`;
    acc[week] ||= { total: 0, null: 0, alta: 0, media: 0, baixa: 0 };
    acc[week].total += 1;
    acc[week][priorityBucket(row.prioridade)] += 1;
    return acc;
  }, {});
}

async function fetchAll(supabase, table, select, queryBuilder) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    let query = supabase.from(table).select(select).range(from, from + pageSize - 1);
    query = queryBuilder(query);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function main() {
  loadEnv();

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase URL/key in environment.");
  }

  const supabase = createClient(url, key);
  const rows = await fetchAll(
    supabase,
    "checklist_instances",
    "id,template_id,ano,mes,semana,tipo_item,parent_id,prioridade",
    (query) =>
      query
        .eq("tipo_item", "recorrente")
        .not("template_id", "is", null)
        .lte("ano", TARGET_ANO)
        .order("ano", { ascending: false })
        .order("mes", { ascending: false })
        .order("semana", { ascending: true }),
  );

  const targetRows = rows.filter((row) => row.ano === TARGET_ANO && row.mes === TARGET_MES);
  const targetNullRows = targetRows.filter((row) => row.prioridade === null);
  const priorRows = rows
    .filter((row) => {
      const isBeforeTarget = row.ano < TARGET_ANO || (row.ano === TARGET_ANO && row.mes < TARGET_MES);
      return isBeforeTarget && VALID_PRIORITIES.has(row.prioridade);
    })
    .sort((a, b) => b.ano - a.ano || b.mes - a.mes);

  const latestExplicitPriorityByMatch = new Map();
  for (const row of priorRows) {
    const key = matchKey(row);
    if (!latestExplicitPriorityByMatch.has(key)) {
      latestExplicitPriorityByMatch.set(key, row);
    }
  }

  const candidates = targetNullRows
    .map((row) => {
      const source = latestExplicitPriorityByMatch.get(matchKey(row));
      if (!source) return null;
      return { target: row, source, priority: source.prioridade };
    })
    .filter(Boolean);

  console.log(
    JSON.stringify(
      {
        mode: isDryRun ? "dry-run" : "update",
        target: `${TARGET_MES}/${TARGET_ANO}`,
        before: countByWeekPriority(targetRows),
        targetNullCount: targetNullRows.length,
        candidatesCount: candidates.length,
        sourceMonths: candidates.reduce((acc, candidate) => {
          const key = monthKey(candidate.source);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
      },
      null,
      2,
    ),
  );

  if (isDryRun) return;

  const byPriority = candidates.reduce((acc, candidate) => {
    acc[candidate.priority] ||= [];
    acc[candidate.priority].push(candidate.target.id);
    return acc;
  }, {});

  for (const [priority, ids] of Object.entries(byPriority)) {
    const { error } = await supabase
      .from("checklist_instances")
      .update({ prioridade: priority })
      .in("id", ids);
    if (error) throw error;
    console.log(`Updated ${ids.length} checklist_instances to prioridade=${priority}`);
  }

  const templateIds = [...new Set(rows.map((row) => row.template_id).filter(Boolean))];
  const templates = await fetchAll(
    supabase,
    "checklist_templates",
    "id,prioridade_default",
    (query) => query.in("id", templateIds),
  );
  const templateMap = new Map(templates.map((template) => [template.id, template]));
  const explicitPrioritiesByTemplate = rows
    .filter((row) => VALID_PRIORITIES.has(row.prioridade))
    .reduce((acc, row) => {
      acc[row.template_id] ||= [];
      acc[row.template_id].push(row.prioridade);
      return acc;
    }, {});
  const templateDefaultUpdates = Object.entries(explicitPrioritiesByTemplate)
    .map(([templateId, priorities]) => {
      const template = templateMap.get(templateId);
      if (!template || template.prioridade_default) return null;
      const uniquePriorities = [...new Set(priorities)];
      if (uniquePriorities.length !== 1 || priorities.length < 2) return null;
      return { templateId, priority: uniquePriorities[0] };
    })
    .filter(Boolean);

  const templateUpdatesByPriority = templateDefaultUpdates.reduce((acc, update) => {
    acc[update.priority] ||= [];
    acc[update.priority].push(update.templateId);
    return acc;
  }, {});

  for (const [priority, ids] of Object.entries(templateUpdatesByPriority)) {
    const { error } = await supabase
      .from("checklist_templates")
      .update({ prioridade_default: priority })
      .in("id", ids);
    if (error) throw error;
    console.log(`Updated ${ids.length} checklist_templates to prioridade_default=${priority}`);
  }

  const updatedRows = await fetchAll(
    supabase,
    "checklist_instances",
    "id,template_id,ano,mes,semana,tipo_item,parent_id,prioridade",
    (query) =>
      query
        .eq("ano", TARGET_ANO)
        .eq("mes", TARGET_MES)
        .eq("tipo_item", "recorrente")
        .order("semana", { ascending: true }),
  );

  console.log(
    JSON.stringify(
      {
        after: countByWeekPriority(updatedRows),
        remainingNullCount: updatedRows.filter((row) => row.prioridade === null).length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
