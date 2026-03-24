

## Plano: Sistema de Mesclagem de Semanas no Checklist

### Objetivo
Permitir rodar 2 a 5 semanas juntas no checklist, mesclando suas demandas em uma visualização única. Ao completar todas as demandas ou desativar manualmente, as semanas se separam preservando a ordem original. O cronômetro conta uma vez e duplica o tempo para todas as semanas mescladas.

### Como Funciona

1. **Ativar mesclagem**: Botão "Mesclar Semanas" abre um seletor onde o gestor escolhe quais semanas (2-5) rodar juntas
2. **Visualização mesclada**: Os cards das semanas selecionadas se fundem em um único card combinado. A tabela exibe os itens de todas as semanas agrupados, cada item mantendo sua semana de origem visível (badge colorido)
3. **Cronômetro**: Funciona normalmente para o grupo mesclado. Ao parar, o tempo é duplicado para cada semana do grupo (criando um registro `checklist_timers` para cada)
4. **Separação automática**: Quando todas as demandas de todas as semanas mescladas forem marcadas (concluído ou não realizado), as semanas se separam automaticamente
5. **Separação manual**: Botão para desativar a mesclagem a qualquer momento
6. **Ordem preservada**: Itens mantêm seu `ordem_override` original — sem reordenação

### Alterações Técnicas

**1. Estado de mesclagem (client-side via `localStorage` + state no `Checklist.tsx`)**
- Novo estado `mergedWeeks: number[]` — array das semanas mescladas (ex: `[4, 5]`)
- Persistido em `localStorage` com chave por mês/ano para sobreviver reloads
- Sem alteração de banco — a mesclagem é puramente visual/UI

**2. Atualizar `src/pages/Checklist.tsx`**
- Adicionar botão "Mesclar Semanas" na barra de ações (gestores)
- Popover/dialog com checkboxes para selecionar semanas (mín 2, máx 5)
- Quando `mergedWeeks` está ativo:
  - Cards das semanas mescladas são substituídos por um único card combinado ("Semanas 4 e 5")
  - Ao clicar, abre a tabela com itens de todas as semanas juntas, separados por seções/headers
  - Botão para desativar mesclagem visível no card/tabela
- Detectar automaticamente quando todas as demandas das semanas mescladas estão processadas → limpar `mergedWeeks`

**3. Atualizar `src/components/checklist/ChecklistSummaryCard.tsx`**
- Aceitar prop opcional `mergedWeeks: number[]` para exibir card combinado
- Somar totais/progresso de todas as semanas mescladas
- Header multicolorido com as cores de cada semana

**4. Atualizar `src/components/checklist/ChecklistWeekTable.tsx`**
- Aceitar prop `semanas: number[]` (plural) além do `semana` singular
- Quando receber múltiplas semanas, agrupar itens por semana com headers separadores (ex: "— 4ª Semana —", "— 5ª Semana —")
- Manter drag-and-drop funcionando dentro de cada grupo de semana

**5. Atualizar `src/hooks/useChecklistTimer.ts`**
- `startTimer` aceitar `semanas: number[]` — inicia um único timer associado à primeira semana do grupo
- `stopTimer` — ao parar, criar registros duplicados de `checklist_timers` para cada semana do grupo com o mesmo `duration_seconds`
- Guardar quais semanas estão mescladas no timer (nova coluna `merged_weeks integer[]` na tabela ou via state local)

**6. Migração de banco**
- Adicionar coluna `merged_weeks integer[]` à tabela `checklist_timers` (nullable, default null) para saber quais semanas rodaram juntas

### Fluxo do Usuário
1. Gestor clica "Mesclar Semanas" → seleciona semanas 4 e 5 → confirma
2. Cards 4 e 5 viram um card único "Semanas 4 e 5" com progresso combinado
3. Ao clicar, tabela mostra itens da semana 4, depois itens da semana 5, cada grupo com header
4. Cronômetro inicia para "Semanas 4 e 5"
5. Usuários marcam demandas normalmente
6. Ao finalizar cronômetro, tempo é salvo para semana 4 E semana 5
7. Quando todas marcadas → separação automática; ou gestor clica "Separar" manualmente

