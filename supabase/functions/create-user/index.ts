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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar cliente com token do usuário para verificar permissões
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verificar se o usuário atual é gestor ou admin
    const { data: { user: currentUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !currentUser) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar role do usuário
    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id)
      .single();

    if (!roleData || (roleData.role !== "admin" && roleData.role !== "gestor")) {
      return new Response(
        JSON.stringify({ error: "Permissão negada. Apenas administradores e gestores podem criar usuários." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, nome, role } = await req.json();

    if (!email || !password || !nome) {
      return new Response(
        JSON.stringify({ error: "E-mail, senha e nome são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar role
    const validRoles = ["admin", "gestor", "colaborador"];
    const userRole = role && validRoles.includes(role) ? role : "colaborador";

    // Usar service role para criar o usuário
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Criar usuário
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar e-mail
      user_metadata: { nome },
    });

    if (createError) {
      console.error("Erro ao criar usuário:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = newUser.user.id;
    console.log(`Usuário criado no auth: ${newUserId}`);

    // Inserir profile manualmente (trigger não é acionado via admin API)
    const { error: profileError } = await adminClient
      .from("profiles")
      .insert({
        user_id: newUserId,
        nome: nome.trim(),
        email: email.trim(),
      });

    if (profileError) {
      console.error("Erro ao criar profile:", profileError);
      // Tentar deletar o usuário criado para manter consistência
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: "Erro ao criar perfil do usuário" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Profile criado para usuário: ${newUserId}`);

    // Inserir role
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: newUserId,
        role: userRole,
      });

    if (roleError) {
      console.error("Erro ao criar role:", roleError);
      // Profile já foi criado, mas role falhou - tentar limpar
      await adminClient.from("profiles").delete().eq("user_id", newUserId);
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: "Erro ao definir perfil do usuário" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Role ${userRole} atribuído ao usuário: ${newUserId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: newUser.user.id, 
          email: newUser.user.email,
          nome,
          role: userRole
        } 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
