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

/**
 * Auto Rollover Edge Function
 * 
 * This function is designed to be called automatically by a cron job
 * at the beginning of each month. It copies active demands from the
 * PREVIOUS month to the CURRENT month only.
 * 
 * Example: When called on March 1st, it copies demands from February to March.
 * It does NOT copy from January or earlier months.
 */
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("🚀 Auto Rollover started at:", new Date().toISOString());

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the previous month and current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

    // Calculate previous month
    let previousMonth = currentMonth - 1;
    let previousYear = currentYear;
    
    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear = currentYear - 1;
    }

    console.log(`📅 Rolling over from ${previousMonth}/${previousYear} to ${currentMonth}/${currentYear}`);

    // Fetch active demands from the previous month ONLY
    const { data: sourceDemandas, error: fetchError } = await supabase
      .from("demandas")
      .select("*")
      .eq("mes", previousMonth)
      .eq("ano", previousYear)
      .eq("ativa", true);

    if (fetchError) {
      console.error("❌ Error fetching source demands:", fetchError);
      throw fetchError;
    }

    console.log(`📊 Found ${sourceDemandas?.length || 0} active demands in ${previousMonth}/${previousYear}`);

    if (!sourceDemandas || sourceDemandas.length === 0) {
      const message = `No active demands found in previous month (${previousMonth}/${previousYear})`;
      console.log(`ℹ️ ${message}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          message,
          copied: 0,
          skipped: 0,
          executionTime: Date.now() - startTime,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check for existing demands in current month to avoid duplicating
    const { data: existingTargetDemandas, error: existingError } = await supabase
      .from("demandas")
      .select("descricao, responsavel_id")
      .eq("mes", currentMonth)
      .eq("ano", currentYear)
      .eq("ativa", true);

    if (existingError) {
      console.error("❌ Error checking existing demands:", existingError);
      throw existingError;
    }

    console.log(`📊 Found ${existingTargetDemandas?.length || 0} existing demands in ${currentMonth}/${currentYear}`);

    // Create a set of existing demand signatures to check for duplicates
    const existingSignatures = new Set(
      (existingTargetDemandas || []).map(
        (d) => `${d.descricao}-${d.responsavel_id}`
      )
    );

    // Prepare new demands for current month (filter out duplicates)
    const newDemandas = sourceDemandas
      .filter((d: Demanda) => {
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
        mes: currentMonth,
        ano: currentYear,
        status_responsavel: "pendente",
        status_gestor: "pendente",
        grupo_id: null, // New demands are independent
      }));

    const skipped = sourceDemandas.length - newDemandas.length;
    console.log(`📝 Will copy ${newDemandas.length} demands, skipping ${skipped} duplicates`);

    if (newDemandas.length === 0) {
      const message = `All demands from ${previousMonth}/${previousYear} already exist in ${currentMonth}/${currentYear}`;
      console.log(`ℹ️ ${message}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          message,
          copied: 0,
          skipped: sourceDemandas.length,
          executionTime: Date.now() - startTime,
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
      console.error("❌ Error inserting demands:", insertError);
      throw insertError;
    }

    const copied = insertedData?.length || 0;
    const executionTime = Date.now() - startTime;
    
    console.log(`✅ Successfully copied ${copied} demands in ${executionTime}ms`);
    console.log(`📈 Summary: ${copied} copied, ${skipped} skipped (duplicates)`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto rollover completed: ${copied} demands copied from ${previousMonth}/${previousYear} to ${currentMonth}/${currentYear}`,
        copied,
        skipped,
        sourceMonth: previousMonth,
        sourceYear: previousYear,
        targetMonth: currentMonth,
        targetYear: currentYear,
        executionTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error("❌ Auto rollover error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        executionTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
