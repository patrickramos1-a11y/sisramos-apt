import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "ID do usuário é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof userId !== "string" || !uuidRegex.test(userId)) {
      return new Response(
        JSON.stringify({ error: "ID do usuário inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Soft-delete: marca o profile como excluído (preserva histórico em demandas, checklists, timers, etc.)
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (profileError) {
      console.error("Erro ao marcar profile como excluído:", profileError);
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Remove role para que o usuário deixe de aparecer com permissões
    await adminClient.from("user_roles").delete().eq("user_id", userId);

    // Remove acesso de autenticação (defesa em profundidade). Não há FK para auth.users
    // nas tabelas de domínio, então o histórico é preservado.
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      // Não bloqueia: o soft-delete já protege o acesso pelo seletor de perfil.
      console.warn("Aviso ao remover usuário do auth:", authDeleteError.message);
    }

    console.log(`Usuário ${userId} excluído (soft-delete) com sucesso`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
