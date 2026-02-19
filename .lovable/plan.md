

# Remover Sincronização em Tempo Real (Realtime)

## O que muda

Todas as assinaturas de canais Realtime do Supabase serão removidas. A interface deixará de receber atualizações automáticas de outros usuários. Os dados serão carregados apenas quando o usuário abrir/navegar para a página ou realizar uma ação (criar, editar, excluir).

## Arquivos afetados

### 1. `src/hooks/useDemandas.ts`
- Remover o `useEffect` inteiro que cria o canal `demandas-realtime` (linhas ~194-249)
- Remover os `console.log` de realtime

### 2. `src/hooks/useChecklist.ts`
- Remover as assinaturas dos canais `checklist_items_changes` e `checklist_assignees_changes` (linhas ~118-153)
- Manter apenas a chamada `fetchItems()` no `useEffect`

### 3. `src/hooks/useMonthSettings.ts`
- Remover o `useEffect` inteiro do canal `month-settings-realtime` (linhas ~43-78)

### 4. `src/hooks/useMomentoAPT.ts`
- Remover a assinatura do canal `momento_apt_settings_changes` (linhas ~37-55)
- Manter apenas a chamada `fetchSettings()` no `useEffect`

### 5. `src/pages/Dashboard.tsx`
- Remover o `useEffect` inteiro do canal `dashboard-realtime` (linhas ~182-200)

## Comportamento após a mudança

- Os dados são carregados ao montar o componente (como já acontece)
- Após cada ação do próprio usuário (marcar status, criar demanda, etc.), a interface continua atualizando normalmente via estado local ou refetch manual
- Para ver alterações feitas por outros usuários, basta recarregar a página ou navegar entre telas

## Detalhes técnicos

Nenhuma alteração no banco de dados é necessária. Apenas remoção de código JavaScript nos 5 arquivos listados acima. As importações do `supabase` permanecem pois são usadas para as queries normais (SELECT, INSERT, UPDATE, DELETE).

