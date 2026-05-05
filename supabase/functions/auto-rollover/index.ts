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
      .select("descricao, responsavel_id, grupo_id")
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
    // Set of grupo_ids that already exist in target month (pre-scheduled future occurrences)
    const existingGrupoIds = new Set(
      (existingTargetDemandas || [])
        .map((d) => d.grupo_id)
        .filter((g): g is string => !!g),
    );

    // Detect multi-month groups: if a demand's grupo_id has occurrences in any
    // (mes, ano) different from the source month, it's a pre-scheduled multi-month
    // recurrence and must NOT be rolled over to non-planned months.
    const sourceGroupIds = Array.from(
      new Set(
        sourceDemandas
          .map((d: Demanda) => d.grupo_id)
          .filter((g): g is string => !!g),
      ),
    );
    const multiMonthGroupIds = new Set<string>();
    if (sourceGroupIds.length > 0) {
      // Chunk the .in() query to avoid URL length limits
      const chunkSize = 80;
      for (let i = 0; i < sourceGroupIds.length; i += chunkSize) {
        const chunk = sourceGroupIds.slice(i, i + chunkSize);
        const { data: groupOccurrences, error: groupErr } = await supabase
          .from("demandas")
          .select("grupo_id, mes, ano")
          .in("grupo_id", chunk);
        if (groupErr) {
          console.error("❌ Error fetching group occurrences:", groupErr);
          throw groupErr;
        }
        for (const occ of groupOccurrences || []) {
          if (occ.grupo_id && (occ.mes !== previousMonth || occ.ano !== previousYear)) {
            multiMonthGroupIds.add(occ.grupo_id);
          }
        }
      }
      console.log(`🔁 Detected ${multiMonthGroupIds.size} multi-month recurrence groups (will be skipped)`);
    }

    // Prepare new demands for current month (filter out duplicates)
    const newDemandas = sourceDemandas
      .filter((d: Demanda) => {
        // Skip multi-month recurrence groups: their future occurrences are pre-scheduled
        if (d.grupo_id && multiMonthGroupIds.has(d.grupo_id)) return false;
        // Skip if this group already has an occurrence in target month (pre-scheduled multi-month recurrence)
        if (d.grupo_id && existingGrupoIds.has(d.grupo_id)) return false;
        const signature = `${d.descricao}-${d.responsavel_id}`;
        return !existingSignatures.has(signature);
      })
      .map((d: Demanda) => ({
        setor_id: d.setor_id,
        responsavel_id: d.responsavel_id,
        descricao: d.descricao,
        observacoes: d.observacoes ?? null,
        semanas_repeticao: d.semanas_repeticao,
        semana_limite: d.semana_limite,
        prioritaria: d.prioritaria,
        ativa: true,
        mes: currentMonth,
        ano: currentYear,
        status_responsavel: "pendente",
        status_gestor: "pendente",
        // Generate new grupo_id for demands with multiple repetitions
        grupo_id: d.semanas_repeticao > 1 ? crypto.randomUUID() : null,
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
    
    console.log(`✅ Successfully copied ${copied} demands`);
    console.log(`📈 Summary: ${copied} copied, ${skipped} skipped (duplicates)`);

    // ========== CHECKLIST ROLLOVER ==========
    console.log(`📋 Starting checklist rollover from ${previousMonth}/${previousYear} to ${currentMonth}/${currentYear}`);

    let checklistCopied = 0;
    let checklistAssigneesCopied = 0;

    // Check if target month already has checklist instances
    const { data: existingChecklist } = await supabase
      .from("checklist_instances")
      .select("id")
      .eq("mes", currentMonth)
      .eq("ano", currentYear)
      .limit(1);

    if (existingChecklist && existingChecklist.length > 0) {
      console.log(`ℹ️ Checklist already has instances in ${currentMonth}/${currentYear}, skipping`);
    } else {
      // Fetch recorrente parent instances from previous month
      const { data: sourceParents, error: srcErr } = await supabase
        .from("checklist_instances")
        .select("*")
        .eq("mes", previousMonth)
        .eq("ano", previousYear)
        .eq("tipo_item", "recorrente")
        .is("parent_id", null);

      if (srcErr) {
        console.error("❌ Error fetching checklist source:", srcErr);
      } else if (sourceParents && sourceParents.length > 0) {
        console.log(`📊 Found ${sourceParents.length} checklist parent items to copy`);

        // Insert parents
        const parentInserts = sourceParents.map((inst: any) => ({
          template_id: inst.template_id,
          ano: currentYear,
          mes: currentMonth,
          semana: inst.semana,
          tipo_item: "recorrente",
          status: "pendente",
          descricao_override: inst.descricao_override,
          link_override: inst.link_override,
          ordem_override: inst.ordem_override,
          is_group: inst.is_group,
          prioridade: inst.prioridade || "media",
          parent_id: null,
        }));

        const { data: insertedParents, error: parentErr } = await supabase
          .from("checklist_instances")
          .insert(parentInserts)
          .select();

        if (parentErr) {
          console.error("❌ Error inserting checklist parents:", parentErr);
        } else if (insertedParents) {
          checklistCopied += insertedParents.length;

          // Build old→new ID mapping
          const idMap = new Map<string, string>();
          for (let i = 0; i < sourceParents.length; i++) {
            if (insertedParents[i]) {
              idMap.set(sourceParents[i].id, insertedParents[i].id);
            }
          }

          // Copy parent assignees
          const parentIds = sourceParents.map((p: any) => p.id);
          const { data: parentAssignees } = await supabase
            .from("checklist_instance_assignees")
            .select("*")
            .in("instance_id", parentIds);

          if (parentAssignees && parentAssignees.length > 0) {
            const assigneeInserts = parentAssignees
              .filter((a: any) => idMap.has(a.instance_id))
              .map((a: any) => ({
                instance_id: idMap.get(a.instance_id)!,
                user_id: a.user_id,
              }));
            if (assigneeInserts.length > 0) {
              await supabase.from("checklist_instance_assignees").insert(assigneeInserts);
              checklistAssigneesCopied += assigneeInserts.length;
            }
          }

          // Copy children for group items
          const { data: sourceChildren, error: childErr } = await supabase
            .from("checklist_instances")
            .select("*")
            .eq("mes", previousMonth)
            .eq("ano", previousYear)
            .in("parent_id", parentIds);

          if (!childErr && sourceChildren && sourceChildren.length > 0) {
            const childInserts = sourceChildren
              .filter((c: any) => idMap.has(c.parent_id))
              .map((c: any) => ({
                template_id: c.template_id,
                ano: currentYear,
                mes: currentMonth,
                semana: c.semana,
                tipo_item: c.tipo_item,
                status: "pendente",
                descricao_override: c.descricao_override,
                link_override: c.link_override,
                ordem_override: c.ordem_override,
                is_group: c.is_group,
                prioridade: c.prioridade || "media",
                parent_id: idMap.get(c.parent_id)!,
              }));

            const { data: insertedChildren } = await supabase
              .from("checklist_instances")
              .insert(childInserts)
              .select();

            if (insertedChildren) {
              checklistCopied += insertedChildren.length;

              // Copy children assignees
              const childIds = sourceChildren.map((c: any) => c.id);
              const { data: childAssignees } = await supabase
                .from("checklist_instance_assignees")
                .select("*")
                .in("instance_id", childIds);

              if (childAssignees && childAssignees.length > 0) {
                const childIdMap = new Map<string, string>();
                for (let i = 0; i < sourceChildren.length; i++) {
                  if (insertedChildren[i]) {
                    childIdMap.set(sourceChildren[i].id, insertedChildren[i].id);
                  }
                }
                const childAssigneeInserts = childAssignees
                  .filter((a: any) => childIdMap.has(a.instance_id))
                  .map((a: any) => ({
                    instance_id: childIdMap.get(a.instance_id)!,
                    user_id: a.user_id,
                  }));
                if (childAssigneeInserts.length > 0) {
                  await supabase.from("checklist_instance_assignees").insert(childAssigneeInserts);
                  checklistAssigneesCopied += childAssigneeInserts.length;
                }
              }
            }
          }
        }

        console.log(`✅ Checklist rollover: ${checklistCopied} items, ${checklistAssigneesCopied} assignees copied`);
      } else {
        console.log(`ℹ️ No checklist items found in ${previousMonth}/${previousYear}`);
      }
    }

    const executionTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto rollover completed: ${copied} demands, ${checklistCopied} checklist items copied`,
        demandas: { copied, skipped },
        checklist: { copied: checklistCopied, assigneesCopied: checklistAssigneesCopied },
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
