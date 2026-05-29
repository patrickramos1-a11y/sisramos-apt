import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Demanda {
  id: string;
  numero: number;
  setor_id: string | null;
  responsavel_id: string;
  descricao: string;
  observacoes: string | null;
  semanas_repeticao: number;
  semana_limite: number[];
  prioritaria: boolean;
  ativa: boolean;
  mes: number;
  ano: number;
  grupo_id: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { sourceMes, sourceAno, targetMes, targetAno, dryRun = false } =
      await req.json();

    if (!sourceMes || !sourceAno || !targetMes || !targetAno) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required parameters: sourceMes, sourceAno, targetMes, targetAno",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validar tipos e ranges
    const validRange = (mes: unknown, ano: unknown): boolean =>
      typeof mes === "number" && Number.isInteger(mes) && mes >= 1 && mes <= 12 &&
      typeof ano === "number" && Number.isInteger(ano) && ano >= 2020 && ano <= 2100;

    if (!validRange(sourceMes, sourceAno) || !validRange(targetMes, targetAno)) {
      return new Response(
        JSON.stringify({
          error: "Parâmetros inválidos: mes deve ser 1-12 (inteiro), ano 2020-2100 (inteiro)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch active demands from source month
    const { data: sourceDemandas, error: fetchError } = await supabase
      .from("demandas")
      .select("*")
      .eq("mes", sourceMes)
      .eq("ano", sourceAno)
      .eq("ativa", true);

    if (fetchError) {
      throw fetchError;
    }

    if (!sourceDemandas || sourceDemandas.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No active demands found in source month",
          copied: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check for existing demands in target month to avoid duplicating
    const { data: existingTargetDemandas, error: existingError } =
      await supabase
        .from("demandas")
        .select("descricao, responsavel_id, grupo_id")
        .eq("mes", targetMes)
        .eq("ano", targetAno)
        .eq("ativa", true);

    if (existingError) {
      throw existingError;
    }

    // Create a set of existing demand signatures to check for duplicates
    const existingSignatures = new Set(
      (existingTargetDemandas || []).map(
        (d) => `${d.descricao}-${d.responsavel_id}`
      )
    );
    // Set of grupo_ids that already exist in target month (pre-scheduled future occurrences)
    const existingGrupoIds = new Set(
      (existingTargetDemandas || [])
        .map((d) => d.grupo_id)
        .filter((g): g is string => !!g),
    );

    // Detect multi-month groups: groups with occurrences in any (mes, ano)
    // different from the source month are pre-scheduled recurrences and must
    // NOT be expanded to unplanned months by rollover.
    const sourceGroupIds = Array.from(
      new Set(
        sourceDemandas
          .map((d: Demanda) => d.grupo_id)
          .filter((g): g is string => !!g),
      ),
    );
    const multiMonthGroupIds = new Set<string>();
    if (sourceGroupIds.length > 0) {
      const chunkSize = 80;
      for (let i = 0; i < sourceGroupIds.length; i += chunkSize) {
        const chunk = sourceGroupIds.slice(i, i + chunkSize);
        const { data: groupOccurrences, error: groupErr } = await supabase
          .from("demandas")
          .select("grupo_id, mes, ano")
          .in("grupo_id", chunk);
        if (groupErr) throw groupErr;
        for (const occ of groupOccurrences || []) {
          if (occ.grupo_id && (occ.mes !== sourceMes || occ.ano !== sourceAno)) {
            multiMonthGroupIds.add(occ.grupo_id);
          }
        }
      }
    }

    // Build a map: old grupo_id -> new grupo_id
    // CRITICAL: all siblings sharing an old grupo_id MUST share the SAME new
    // grupo_id in the target month, otherwise bulk edit/delete breaks.
    const grupoIdMap = new Map<string, string>();
    for (const d of sourceDemandas as Demanda[]) {
      if (d.grupo_id && !grupoIdMap.has(d.grupo_id)) {
        grupoIdMap.set(d.grupo_id, crypto.randomUUID());
      }
    }

    // Prepare new demands for target month
    const sourceDemandasToCopy = (sourceDemandas as Demanda[])
      .filter((d: Demanda) => {
        // Skip multi-month recurrence groups: their future occurrences are pre-scheduled
        if (d.grupo_id && multiMonthGroupIds.has(d.grupo_id)) return false;
        // Skip if this group already has an occurrence in target month (pre-scheduled multi-month recurrence)
        if (d.grupo_id && existingGrupoIds.has(d.grupo_id)) return false;
        // Skip if a similar demand already exists in target month
        const signature = `${d.descricao}-${d.responsavel_id}`;
        return !existingSignatures.has(signature);
      });

    const newDemandas = sourceDemandasToCopy.map((d: Demanda) => ({
        setor_id: d.setor_id,
        responsavel_id: d.responsavel_id,
        descricao: d.descricao,
        observacoes: d.observacoes ?? null,
        semanas_repeticao: d.semanas_repeticao,
        semana_limite: d.semana_limite,
        prioritaria: d.prioritaria,
        ativa: true,
        mes: targetMes,
        ano: targetAno,
        status_responsavel: "pendente",
        status_gestor: "pendente",
        // Preserve sibling grouping: siblings sharing an old grupo_id share
        // the same new grupo_id. Orphan demands with semanas_repeticao > 1
        // get an individual UUID (degenerate case).
        grupo_id: d.grupo_id
          ? grupoIdMap.get(d.grupo_id)!
          : d.semanas_repeticao > 1
            ? crypto.randomUUID()
            : null,
      }));

    if (newDemandas.length === 0) {
      return new Response(
        JSON.stringify({
          message: "All demands already exist in target month",
          copied: 0,
          skipped: sourceDemandas.length,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If dry run, just return what would be copied
    if (dryRun) {
      return new Response(
        JSON.stringify({
          dryRun: true,
          wouldCopy: newDemandas.length,
          wouldSkip: sourceDemandas.length - newDemandas.length,
          preview: newDemandas.slice(0, 5),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert new demands
    const { data: insertedData, error: insertError } = await supabase
      .from("demandas")
      .insert(newDemandas)
      .select("id");

    if (insertError) {
      throw insertError;
    }

    if (insertedData && insertedData.length > 0) {
      const sourceIds = sourceDemandasToCopy.map((d) => d.id);
      const sourceToTarget = new Map<string, string>();
      sourceIds.forEach((sourceId, index) => {
        const targetId = insertedData[index]?.id;
        if (targetId) sourceToTarget.set(sourceId, targetId);
      });

      const { data: sourceTags, error: tagsError } = await supabase
        .from("demanda_tags")
        .select("demanda_id, tag_id")
        .in("demanda_id", sourceIds);

      if (tagsError) throw tagsError;

      const tagRows = (sourceTags || [])
        .map((row: any) => ({
          demanda_id: sourceToTarget.get(row.demanda_id),
          tag_id: row.tag_id,
        }))
        .filter((row: any) => row.demanda_id);

      if (tagRows.length > 0) {
        const { error: insertTagsError } = await supabase
          .from("demanda_tags")
          .insert(tagRows);
        if (insertTagsError) throw insertTagsError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        copied: insertedData?.length || 0,
        skipped: sourceDemandas.length - newDemandas.length,
        message: `Successfully copied ${insertedData?.length || 0} demands from ${sourceMes}/${sourceAno} to ${targetMes}/${targetAno}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Rollover error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
