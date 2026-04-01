

## Plano: Sistema de Prioridade no Checklist

### Objetivo
Adicionar campo de prioridade (Alta, Média, Baixa) aos itens do checklist com filtros, ordenação temporária por prioridade (sem perder a ordem manual), e opção de escolher prioridade na criação.

### Alterações

#### 1. Migração de Banco de Dados
- Adicionar coluna `prioridade` (TEXT, default `'media'`) na tabela `checklist_instances`
- Adicionar coluna `prioridade_default` (TEXT, default `'media'`) na tabela `checklist_templates`
- Valores possíveis: `'alta'`, `'media'`, `'baixa'`

#### 2. Hook `useChecklistV2.ts`
- Adicionar campo `prioridade` à interface `ChecklistInstance`
- Incluir `prioridade` no fetch de instâncias e no campo resolvido (template default ou override)
- Adicionar `prioridade` ao `addInstance` e `updateInstance`

#### 3. Componente `ChecklistWeekTable.tsx`
- Adicionar filtro de prioridade (dropdown: Todas, Alta, Média, Baixa)
- Adicionar botão de ordenação por prioridade (↑ Alta→Baixa / ↓ Baixa→Alta / desativado)
- Quando ordenação por prioridade ativa: reordenar visualmente sem alterar `ordem_override` no banco
- Quando desativada: volta à ordem original (manual/drag-and-drop)

#### 4. Componente `SortableChecklistItem.tsx`
- Exibir badge colorido de prioridade ao lado do texto (vermelho=Alta, amarelo=Média, verde=Baixa)
- No modo edição, adicionar select de prioridade
- Propagar `onUpdateItem` com campo `prioridade`

#### 5. Componente `NovoItemChecklistDialog.tsx`
- Adicionar select de prioridade no formulário de criação (default: Média)
- Passar valor para `onAddItem`

#### 6. Rollover / Auto-rollover
- Copiar campo `prioridade` na duplicação mensal (migration SQL e edge function)

### Lógica de Ordenação
- Estado local `sortByPriority: 'off' | 'desc' | 'asc'` no `ChecklistWeekTable`
- Quando `off`: usa ordem existente (manual/drag-and-drop)
- Quando `desc`: alta(1) → media(2) → baixa(3), mantendo ordem relativa dentro do mesmo nível
- Quando `asc`: baixa → media → alta
- A `ordem_override` no banco **nunca** é alterada pela ordenação por prioridade

### Detalhes Técnicos
- Cores: Alta = `bg-red-500/15 text-red-700`, Média = `bg-amber-500/15 text-amber-700`, Baixa = `bg-green-500/15 text-green-700`
- Badge compacto similar ao badge "Avulso" já existente
- Filtro de prioridade no header da tabela, ao lado dos filtros de status e tipo existentes

