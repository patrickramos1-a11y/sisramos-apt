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
      email_confirm: true,
      user_metadata: { nome },
    });

    if (createError) {
      console.error("Erro ao criar usuário:", createError);
      
      let errorMessage = createError.message;
      if (errorMessage.includes("already been registered")) {
        errorMessage = "Já existe um usuário cadastrado com este e-mail";
      } else if (errorMessage.includes("invalid email")) {
        errorMessage = "E-mail inválido";
      } else if (errorMessage.includes("password")) {
        errorMessage = "A senha deve ter pelo menos 6 caracteres";
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = newUser.user.id;
    console.log(`Usuário criado no auth: ${newUserId}`);

    // Inserir profile
    const { error: profileError } = await adminClient
      .from("profiles")
      .insert({
        user_id: newUserId,
        nome: nome.trim(),
        email: email.trim(),
      });

    if (profileError) {
      console.error("Erro ao criar profile:", profileError);
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
