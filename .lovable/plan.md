## Objetivo

Remover o realtime do APT. Voltar ao comportamento anterior: para ver as bolinhas marcadas por outros usuários, é preciso reaplicar filtro ou dar refresh.

## Mudança

**`src/hooks/useDemandas.ts`**: remover o `useEffect` que cria o channel `"demandas-realtime"` e a subscription em `postgres_changes`. Sem isso, o hook só refaz `fetchDemandas` quando `filters` mudam ou quando algo chama `fetchDemandas()` manualmente (refresh, troca de filtro, ações locais).

## Não muda

- Atualização local imediata para o próprio usuário (o `setDemandas` otimista em `updateStatusResponsavel` / `updateStatusGestor` continua).
- Bulk update (`AtualizarStatusEmMassaDialog`) continua chamando `onStatusAtualizado` → `fetchDemandas`.
- Nenhuma mudança em banco, RLS ou publication.