# Exclusão de usuário com preservação de histórico

## Objetivo
Permitir excluir um usuário do sistema (some das listas, não pode mais "logar" pelo seletor) **sem apagar** os dados onde ele aparece (demandas, checklists, timers, solicitações etc.). O nome continua aparecendo no histórico marcado como "(excluído)".

## Estratégia: soft-delete
Hoje a função `delete-user` apaga `profiles` + `user_roles` + `auth.users` em hard-delete. Isso quebra exibição histórica (cards/relatórios mostram "—" porque o `user_id` da demanda não acha mais o profile). Vamos trocar por exclusão lógica.

## Mudanças

### 1. Banco (migration)
- Adicionar `profiles.deleted_at timestamptz null` (índice parcial onde `deleted_at IS NULL`).
- Adicionar `profiles.ativo boolean` não é necessário; usaremos `deleted_at`.

### 2. Edge function `delete-user` (reescrita)
- Em vez de apagar profile/auth.user, fazer:
  - `UPDATE profiles SET deleted_at = now() WHERE user_id = ?`
  - `DELETE FROM user_roles WHERE user_id = ?` (impede que apareça com role; opcional manter)
  - `auth.admin.deleteUser(userId)` para garantir que ninguém consegue mais autenticar via Supabase Auth (mesmo que o login atual seja por seletor, isso é defesa em profundidade). Como não há FK para `auth.users` nas tabelas de domínio, essa exclusão é segura para o histórico.
- Mantém validação de UUID e logs.

### 3. Front-end — esconder usuários excluídos das listas "ativas"
Filtrar `deleted_at IS NULL` em todos os locais onde o usuário é selecionável:
- `src/pages/Login.tsx` — seletor de perfil
- `src/pages/Configuracoes.tsx` — listagem de "Usuários do Sistema" (com toggle opcional "Mostrar excluídos")
- `src/components/apt/NovaDemandaDialog.tsx`, `EditarDemandaIrmaDialog.tsx`, `DuplicarDemandasEmMassaDialog.tsx` — seletores de responsável
- `src/components/checklist/NovoItemChecklistDialog.tsx`, `UserAssignmentPopover.tsx` — assignees
- `src/components/dashboard/DashboardFilters.tsx`, `useDashboardFilters.ts` — filtros de pessoa
- `src/components/users/UserFilters.tsx` (se aplicável)

### 4. Exibição histórica
Onde o profile é resolvido para exibir nome (cards/tabelas/charts), continuar buscando **todos** os profiles (sem filtro) para conseguir mostrar nomes antigos. Acrescentar sufixo visual quando `deleted_at != null`:
- `DemandaCard`, `DemandaTableRow`, `GerenciamentoLista`, `CriticalDemandsList`, `WeeklyUserChart`, `BottleneckChart`, `IndividualProgress`, `SolicitacoesExclusaoLista`, `ChecklistTimerHistory`.
- Padrão: `"{nome} (excluído)"` em cinza/itálico.

Para evitar mexer em N hooks, criar utilitário `formatUserName(profile)` em `src/lib/utils.ts` e usar nas telas que renderizam nome de pessoas.

### 5. Diálogo `ExcluirUsuarioDialog.tsx`
- Atualizar copy: "O usuário será removido das listas e do login, mas seus registros históricos (demandas, checklists, timers) serão mantidos com a marcação 'excluído'. Esta ação não pode ser desfeita."
- Botão continua chamando `delete-user`.

### 6. Memory
Atualizar `mem://auth/...` documentando o padrão soft-delete + filtro `deleted_at IS NULL` em seletores e exibição com sufixo "(excluído)" em históricos.

## Não faz parte
- Tela de "restaurar usuário excluído" (pode ficar para depois; restauração manual via banco se necessário).
- Anonimização de dados (não pedido).
