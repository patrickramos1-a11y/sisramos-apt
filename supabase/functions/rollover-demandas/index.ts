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
        .select("descricao, responsavel_id")
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

    // Prepare new demands for target month
    const newDemandas = sourceDemandas
      .filter((d: Demanda) => {
        // Skip if a similar demand already exists in target month
        const signature = `${d.descricao}-${d.responsavel_id}`;
        return !existingSignatures.has(signature);
      })
      .map((d: Demanda) => ({
        setor_id: d.setor_id,
        responsavel_id: d.responsavel_id,
        descricao: d.descricao,
        semanas_repeticao: d.semanas_repeticao,
        semana_limite: d.semana_limite,
        prioritaria: d.prioritaria,
        ativa: true,
        mes: targetMes,
        ano: targetAno,
        status_responsavel: "pendente",
        status_gestor: "pendente",
        // Generate new grupo_id for demands with multiple repetitions
        grupo_id: d.semanas_repeticao > 1 ? crypto.randomUUID() : null,
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
