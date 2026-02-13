

# Correção: Botão "Iniciar Momento APT" não atualiza

## Causa Raiz

O hook `useMomentoAPT.ts` depende exclusivamente da **subscription realtime** para atualizar o estado local (`settings`) após o PATCH no banco. Os logs mostram `CHANNEL_ERROR` no canal realtime, o que significa que após o clique:

1. O PATCH vai ao banco e retorna 204 (sucesso)
2. Mas o realtime não dispara o callback de refetch
3. O estado local `settings` continua com `bloqueado: false`
4. A UI não muda -- o botão continua mostrando "Iniciar Momento APT"
5. Cliques subsequentes enviam `bloqueado: true` novamente

## Correção

Alterar o `useMomentoAPT.ts` para chamar `fetchSettings()` imediatamente após cada update/insert bem-sucedido, sem depender exclusivamente do realtime. O realtime continua funcionando como complemento (para sincronizar entre abas/usuários), mas a atualização local é garantida.

### Arquivo: `src/hooks/useMomentoAPT.ts`

Na função `toggleBloqueio`:
- Após o bloco `if (!error)` do update, adicionar `await fetchSettings()`
- Após o bloco `if (!error)` do insert, adicionar `await fetchSettings()`

Isso garante que o estado local seja atualizado imediatamente após a ação, independentemente do status do canal realtime.

### Detalhes técnicos

Trecho atual (update):
```
if (error) { toast erro }
else { toast sucesso }
```

Trecho corrigido:
```
if (error) { toast erro }
else {
  await fetchSettings();
  toast sucesso;
}
```

Mesma alteração para o bloco de insert.

Total: **1 arquivo** modificado, **2 linhas** adicionadas.
