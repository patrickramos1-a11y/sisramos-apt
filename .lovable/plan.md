

## Plano: Melhorar Sistema de Mesclagem de Semanas

### Objetivo
Três melhorias na mesclagem de semanas:
1. **Deduplicar tarefas iguais** (mesmo texto) — exibir como uma só; status se aplica a todas as cópias
2. **Remover separadores de semana** — itens aparecem em lista única intercalada (sem headers "Semana X")
3. **Intercalar por posição** — itens se alternam pela ordem original (posição 1 da sem.3, posição 1 da sem.4, posição 2 da sem.3, posição 2 da sem.4, ...)
4. **Preservar reordenação no unmerge** — ao separar, cada semana recebe a ordem relativa que seus itens tinham na visualização mesclada

### Como Funciona

**Intercalação**: Itens são organizados por `ordem_override`, alternando entre as semanas. Se sem.3 tem [a1, b2, c3] e sem.4 tem [e1, r2, g3, h4], o resultado é [a, e, b, r, c, g, h].

**Deduplicação**: Tarefas com texto idêntico (mesma `descricao`) viram uma única linha. Ao mudar status, todas as instâncias originais recebem o mesmo status. Badge visual indica "2 semanas" na tarefa deduplicada.

**Unmerge com ordem preservada**: Ao desmesclar, percorre-se a lista mesclada na ordem atual. Para cada semana, atribui-se `ordem_override` incremental baseado na posição relativa dos itens daquela semana na lista mesclada.

### Alterações

**1. `src/pages/Checklist.tsx`**
- Alterar `selectedWeekItems` para intercalar itens por posição em vez de concatenar (`flatMap`)
- Implementar lógica de deduplicação: agrupar por `descricao`, manter apenas um representante, guardar mapa de IDs duplicados
- No `handleUnmerge`, antes de limpar `mergedWeeks`, salvar a ordem atual dos itens no banco (atualizar `ordem_override` de cada item baseado na posição relativa por semana)

**2. `src/components/checklist/ChecklistWeekTable.tsx`**
- Remover a lógica de separadores por semana na visualização mesclada (blocos `semanas!.map(weekNum => ...)`)
- Na visualização mesclada, tratar itens como lista única (igual à visualização normal, sem headers de semana)
- Adicionar badge de semana colorido em cada item para indicar sua origem
- Para itens deduplicados, mostrar badge "Sem. 3 e 4"
- Ao mudar status de item deduplicado, chamar `onUpdateStatus` para todos os IDs originais

**3. Novo: lógica de intercalação e deduplicação (em `Checklist.tsx`)**
```
Intercalação:
- Pegar itens de cada semana ordenados por ordem_override
- Percorrer por posição: pos 0 de todas as semanas, pos 1, pos 2...
- Resultado: lista intercalada

Deduplicação:
- Agrupar por descricao (texto normalizado)
- Para cada grupo com >1 item: manter o primeiro, guardar IDs dos outros
- Ao atualizar status: aplicar a todos os IDs do grupo
```

**4. Lógica de unmerge com preservação de ordem**
- Antes de limpar `mergedWeeks`, percorrer a lista mesclada atual
- Para cada semana, extrair apenas seus itens na ordem em que aparecem
- Atualizar `ordem_override` de cada um (0, 1, 2, ...) via `reorderItem` ou update direto

### Detalhes Técnicos
- A deduplicação é puramente visual/client-side — não altera dados no banco
- Um `Map<string, string[]>` mapeia `descricao` → `[id1, id2, ...]` para propagar status
- O `onUpdateStatus` wrapper chama update em batch para todos os IDs duplicados
- A intercalação usa um algoritmo round-robin por posição sobre as semanas ordenadas
- No unmerge, um loop atualiza `ordem_override` no banco para cada item de cada semana

