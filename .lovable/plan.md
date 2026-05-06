## Plano para corrigir o checklist automático

### Objetivo
Garantir que as tarefas recorrentes do checklist passem automaticamente do mês anterior para o mês atual, sem depender de ação manual do usuário, e reparar o mês atual que ficou vazio.

### O que encontrei
- Abril/2026 tem 103 itens recorrentes principais e 51 subtarefas no `checklist_instances`.
- Maio/2026 tem apenas 1 item avulso, ou seja, o rollover automático do checklist não aconteceu neste mês.
- A função `auto-rollover` já contém lógica para copiar o checklist, mas não há evidência de execução recente dela.
- No código do app não existe nenhum ponto chamando `auto-rollover`; hoje ela depende de um agendamento externo que aparentemente não está disparando.
- Também não encontrei teste automatizado cobrindo o rollover do checklist dentro da função `auto-rollover`, então esse fluxo ficou sem proteção.

### Implementação proposta
1. Reparar imediatamente os dados do mês atual
- Executar a cópia de abril/2026 para maio/2026 preservando:
  - itens recorrentes
  - subtarefas/grupos
  - links
  - responsáveis
  - prioridades
  - ordem manual
- Resetar os status para `pendente`, como já é o padrão do rollover.
- Validar no banco a contagem final para garantir que maio fique consistente.

2. Tornar a automação confiável
- Criar um mecanismo de auto-recuperação no frontend do Checklist para quando o usuário abrir o mês atual e ele estiver sem itens recorrentes, mas o mês anterior tiver tarefas recorrentes.
- Esse mecanismo chamará a função de rollover automático de forma idempotente e silenciosa, apenas quando necessário, evitando depender 100% do agendamento.
- Incluir proteção para não duplicar dados se o mês atual já tiver checklist preenchido.

3. Endurecer a função `auto-rollover`
- Ajustar a função para aceitar execução segura sob demanda focada no mês atual.
- Garantir retorno explícito separando resultado de demandas e checklist para facilitar diagnóstico.
- Preservar o comportamento de não duplicar quando o destino já tiver registros.

4. Adicionar cobertura de testes
- Criar testes da `auto-rollover` cobrindo:
  - cópia automática de itens recorrentes do checklist
  - cópia de subtarefas com `parent_id` remapeado
  - cópia de responsáveis
  - preservação de prioridade/ordem/link
  - não duplicação quando o mês destino já possui checklist

5. Verificação final
- Testar a função após a correção.
- Confirmar via consulta no banco que maio/2026 recebeu os itens esperados.
- Validar no app que o checklist do mês atual volta a aparecer automaticamente.

### Arquivos e áreas afetadas
- `src/pages/Checklist.tsx`
- `src/hooks/useChecklistV2.ts`
- `supabase/functions/auto-rollover/index.ts`
- testes da função `auto-rollover`
- atualização de dados no banco para reparar maio/2026

### Resultado esperado
Daqui para frente, o checklist recorrente entra no mês novo automaticamente. Mesmo se o agendamento falhar, o próprio sistema se corrige ao abrir o checklist, sem você precisar copiar mês manualmente.