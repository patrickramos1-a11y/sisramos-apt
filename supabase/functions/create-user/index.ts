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

    // Type checks
    if (typeof email !== "string" || typeof password !== "string" || typeof nome !== "string") {
      return new Response(
        JSON.stringify({ error: "Tipos de campos inválidos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Length limits
    if (nome.trim().length === 0 || nome.length > 100) {
      return new Response(
        JSON.stringify({ error: "Nome inválido (1-100 caracteres)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (email.length > 255) {
      return new Response(
        JSON.stringify({ error: "E-mail muito longo (máx. 255 caracteres)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(
        JSON.stringify({ error: "Formato de e-mail inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (password.length < 6 || password.length > 72) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter entre 6 e 72 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Strip control characters and angle brackets from name
    const sanitizedNome = nome.trim().replace(/[\x00-\x1F\x7F<>]/g, "");
    if (sanitizedNome.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nome contém apenas caracteres inválidos" }),
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
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { nome: sanitizedNome },
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
        nome: sanitizedNome,
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
