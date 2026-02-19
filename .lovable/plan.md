
## Problema

O cabeçalho da tabela foi removido como "solução" para o problema de sobreposição, mas isso foi incorreto. O problema real era que as colunas do cabeçalho não tinham as mesmas larguras que os elementos correspondentes dentro de cada linha `SortableChecklistItem`.

## Causa Raiz

A estrutura de cada linha (`SortableChecklistItem`) usa `flex` com os seguintes elementos em sequência:
1. **Drag handle** (GripVertical) — `shrink-0`, apenas quando `canModify`
2. **Botão de status** — `shrink-0` (ícone 20x20px)
3. **Texto da tarefa** — `flex-1 min-w-0`
4. **Responsáveis** — `shrink-0 flex items-center`
5. **Link** — `shrink-0` (condicional)
6. **Ações** — `shrink-0 flex` (apenas quando `canModify`)

O cabeçalho anterior usava larguras fixas como `w-5`, `w-24` e `flex-1` que não correspondiam precisamente aos elementos reais da linha. Em telas menores, isso causava desalinhamento e sobreposição.

## Solução

Restaurar o cabeçalho no `ChecklistDetailDialog.tsx` com larguras que **espelham exatamente** a estrutura do `SortableChecklistItem`:

- **Coluna drag** (se `canModify`): `w-5 shrink-0` — alinhada ao `GripVertical`
- **Coluna status**: `w-5 shrink-0` — alinhada ao botão de status (ícone `h-5 w-5`)
- **Coluna tarefa**: `flex-1 min-w-0` — mesma propriedade do `div` de texto
- **Coluna responsáveis**: `shrink-0 w-[72px]` — largura fixa correspondendo aos avatares empilhados
- **Coluna ações** (se `canModify`): `shrink-0 w-[60px]` — correspondendo aos dois botões `h-7 w-7`

O `gap-3` do contêiner do cabeçalho deve ser idêntico ao `gap-3` de cada linha para garantir alinhamento perfeito.

## Arquivo a Alterar

**`src/components/checklist/ChecklistDetailDialog.tsx`** — Reintroduzir o bloco do cabeçalho entre a linha 167 e o `ScrollArea`, com classes corretamente espelhadas à estrutura de linha do `SortableChecklistItem`.

## Resultado Esperado

- Cabeçalhos alinhados precisamente acima de cada coluna correspondente
- Nenhuma sobreposição de texto
- Funciona corretamente em desktop e mobile (o cabeçalho será `hidden md:flex` para não poluir telas pequenas onde o layout já é mais compacto)
