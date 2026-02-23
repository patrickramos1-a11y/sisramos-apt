

## Funcionalidade: Itens Avulsos no Checklist

### Objetivo
Tornar os itens "Avulso" visualmente distintos na lista de tarefas da semana, com uma forma rapida de adiciona-los inline (sem precisar abrir o dialog). Subtarefas continuam sendo subtarefas e nao sao avulsos.

### O que muda

**1. Badge visual "Avulso" no item da tabela**
- No componente `SortableChecklistItem`, quando o item tiver `tipo_item === "avulso_semana"`, exibir um badge pequeno "Avulso" ao lado do texto da tarefa (cor amarela/amber para diferenciar).
- Itens recorrentes nao mostram badge nenhum (sao o padrao).

**2. Separacao visual na lista da semana**
- No `ChecklistWeekTable`, agrupar os itens em duas secoes:
  - **Tarefas recorrentes** (listadas primeiro, como ja funciona)
  - **Avulso** (separados por um divisor com label "Avulso", listados abaixo)
- Isso facilita a visualizacao sem misturar os dois tipos.

**3. Botao "Adicionar Avulso" inline na tabela**
- No rodape da secao "Avulso" do `ChecklistWeekTable`, adicionar um input inline (similar ao `AddSubItemInline` que ja existe) para criar rapidamente um item avulso direto na semana atual, sem abrir o dialog completo.
- O item criado tera `tipo_item: "avulso_semana"`, vinculado ao mes/ano/semana corrente.

**4. Filtro de tipo na barra de filtros**
- Restaurar o dropdown de filtro por tipo (Todos / Recorrente / Avulso) na barra de filtros da tabela semanal, permitindo ver apenas um tipo.

### Detalhes tecnicos

**Arquivos modificados:**

| Arquivo | Alteracao |
|---|---|
| `src/components/checklist/SortableChecklistItem.tsx` | Aceitar prop `tipo_item`, renderizar badge "Avulso" quando aplicavel |
| `src/components/checklist/ChecklistWeekTable.tsx` | Separar itens em duas secoes (recorrente + avulso), adicionar input inline para avulso, restaurar filtro de tipo |
| `src/hooks/useChecklistV2.ts` | Adicionar funcao `addQuickAvulso(descricao, semana)` que cria um item avulso rapidamente com parametros minimos |

**Logica de rollover:** Ja esta implementada corretamente -- a funcao `rolloverToNextMonth` no hook so copia itens com `tipo_item === "recorrente"`, entao avulsos ficam no mes de origem.

**Subtarefas:** Subtarefas continuam usando `parent_id` e nao tem relacao com o tipo avulso. Um item avulso pode ter subtarefas, e um item recorrente tambem.

