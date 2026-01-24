import { supabase } from "@/integrations/supabase/client";

interface CheckWeekCompleteParams {
  responsavelId: string;
  semana: number;
  mes: number;
  ano: number;
  gestorId: string;
  gestorNome: string;
}

/**
 * Verifica se todas as demandas de uma semana específica para um responsável foram marcadas pelo gestor
 * Se sim, cria uma notificação para o responsável
 */
export async function checkAndCreateWeekNotification({
  responsavelId,
  semana,
  mes,
  ano,
  gestorId,
  gestorNome,
}: CheckWeekCompleteParams): Promise<boolean> {
  // Buscar todas as demandas ativas do responsável para essa semana/mês/ano
  const { data: demandas, error: fetchError } = await supabase
    .from("demandas")
    .select("id, status_gestor, semana_limite")
    .eq("responsavel_id", responsavelId)
    .eq("mes", mes)
    .eq("ano", ano)
    .eq("ativa", true);

  if (fetchError || !demandas) {
    console.error("Erro ao buscar demandas para verificação de semana:", fetchError);
    return false;
  }

  // Filtrar demandas que incluem essa semana
  const demandasDaSemana = demandas.filter((d) =>
    d.semana_limite?.includes(semana)
  );

  // Se não há demandas para essa semana, não criar notificação
  if (demandasDaSemana.length === 0) {
    return false;
  }

  // Verificar se todas as demandas da semana foram marcadas (não estão pendentes)
  const todasMarcadas = demandasDaSemana.every(
    (d) => d.status_gestor !== "pendente"
  );

  if (!todasMarcadas) {
    return false;
  }

  // Verificar se já existe uma notificação para essa semana/responsável
  const { data: existingNotification } = await supabase
    .from("notifications")
    .select("id")
    .eq("responsavel_id", responsavelId)
    .eq("semana", semana)
    .eq("mes", mes)
    .eq("ano", ano)
    .eq("tipo", "semana_concluida")
    .single();

  if (existingNotification) {
    // Já existe notificação, não criar duplicata
    return false;
  }

  // Buscar nome do responsável para mensagem
  const { data: profile } = await supabase
    .from("profiles")
    .select("nome")
    .eq("user_id", responsavelId)
    .single();

  const responsavelNome = profile?.nome || "Colaborador";
  const isSelfApproval = gestorId === responsavelId;

  // Criar mensagem apropriada
  let mensagem: string;
  if (isSelfApproval) {
    mensagem = `O gestor ${gestorNome} concluiu sua própria semana ${semana}.`;
  } else {
    mensagem = `O gestor ${gestorNome} concluiu a semana ${semana} de ${responsavelNome}.`;
  }

  // Criar notificação
  const { error: insertError } = await supabase.from("notifications").insert({
    tipo: "semana_concluida",
    mensagem,
    responsavel_id: responsavelId,
    gestor_id: gestorId,
    gestor_nome: gestorNome,
    semana,
    mes,
    ano,
  });

  if (insertError) {
    console.error("Erro ao criar notificação:", insertError);
    return false;
  }

  console.log(`Notificação criada: ${mensagem}`);
  return true;
}

/**
 * Verifica múltiplos responsáveis/semanas após atualização em massa
 */
export async function checkBulkWeekNotifications(
  demandaIds: string[],
  gestorId: string,
  gestorNome: string
): Promise<void> {
  // Buscar as demandas atualizadas para saber os responsáveis e semanas afetados
  const { data: updatedDemandas, error } = await supabase
    .from("demandas")
    .select("responsavel_id, semana_limite, mes, ano")
    .in("id", demandaIds);

  if (error || !updatedDemandas) {
    console.error("Erro ao buscar demandas atualizadas:", error);
    return;
  }

  // Criar um Set de combinações únicas responsavel+semana+mes+ano
  const combinacoes = new Set<string>();
  
  updatedDemandas.forEach((d) => {
    d.semana_limite?.forEach((semana: number) => {
      combinacoes.add(`${d.responsavel_id}|${semana}|${d.mes}|${d.ano}`);
    });
  });

  // Verificar cada combinação
  for (const combo of combinacoes) {
    const [responsavelId, semana, mes, ano] = combo.split("|");
    await checkAndCreateWeekNotification({
      responsavelId,
      semana: parseInt(semana),
      mes: parseInt(mes),
      ano: parseInt(ano),
      gestorId,
      gestorNome,
    });
  }
}
