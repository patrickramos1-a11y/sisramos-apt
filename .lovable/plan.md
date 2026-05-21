
# Plano: Painel de Gerenciamento (aba Lista)

Objetivo: transformar `/gerenciamento?tab=lista` no centro de comando do gestor — onde ele realmente edita demandas em massa, transfere responsáveis, ajusta prioridades e enxerga tudo (inclusive meses futuros/inativos) de forma agrupada.

Escopo desta etapa: **só a aba Lista** (`GerenciamentoLista.tsx`) e o cabeçalho da página `Gerenciamento.tsx`. O Painel por setor e Exclusões ficam como estão.

---

## 1. Cabeçalho enxuto

Hoje "Gerenciamento / Gestão estratégica de demandas e setores" ocupa ~80px sem trazer informação.

- Remover o bloco título+subtítulo grande.
- Linha única (40px) com: tabs (Painel / Lista / Exclusões) à esquerda + contador "X demandas / Y grupos" + botão "Nova demanda" à direita.
- Ganha-se ~60px de altura útil para a tabela.

## 2. Barra de filtros — chips e botões, não selects

Substituir os 5 "caixinhas de seleção" atuais (Buscar / Responsável / Setor / Repetições / Mês) por uma barra mais densa e intuitiva:

```
[🔎 Buscar...........]  Mês: [Jan][Fev]...[Mai*][Jun]...[Dez]  Semana: [1][2][3][4][5]  [+ Mais filtros ▾]
Chips ativos: × Responsável: Celine   × Setor: Feedback   × Prioritária    [Limpar]
```

- Mês e Semana viram **toggle pills** (multi-seleção, clique e aplica). Botão "Todos" para tirar restrição de mês.
- Botões dedicados para "Urgente", "Prioritária", "Pendente aprovação" como toggles.
- Responsável, Setor, Repetições ficam dentro de "Mais filtros" (Sheet lateral) com multi-select buscável — escolhidos viram chips removíveis na barra principal.
- Aplicação automática (sem botão Filtrar), debounce de 200ms na busca.
- Atalho persistente no localStorage para "lembrar" os últimos filtros.

## 3. Ver demandas de **qualquer mês** (inclusive futuros)

Hoje o filtro já permite escolher mês, mas o usuário não percebe que pode olhar adiante. Mudanças:

- Default ao abrir: mês atual selecionado.
- Botão "**Mostrar todos os meses ativos**" (single click) e botão "**Incluir meses futuros/desativados**".
- Indicador visual ao lado de cada linha quando a demanda pertence a um mês ≠ do atual (badge cinza "Jul/2026").

## 4. Agrupamento dinâmico (a peça central)

Toolbar acima da tabela:

```
Agrupar por: [Nenhum] [Responsável] [Setor] [Setor → Responsável]   Ordenar: [...]   Linhas: 50 ▾
```

- **Sem agrupamento** = tabela plana (como hoje, mas mais compacta).
- **Por Responsável**: linhas agrupadas em accordion com header "Celine — 23 demandas, 7 pendentes" + checkbox no header que seleciona o grupo inteiro. Resolve direto o caso "Celine saiu, quero ver tudo dela".
- **Por Setor**: idem para setor.
- **Setor → Responsável**: dois níveis (atende "filtrar setor Feedback e aglutinar por responsável").
- Estado do agrupamento persistido em localStorage.

## 5. Seleção múltipla + barra de ações em massa

Adicionar coluna de checkbox + checkbox no header (seleciona página visível) e no header de cada grupo.

Quando ≥1 selecionado, aparece **barra de ação fixa** no rodapé:

```
3 selecionadas  |  Reatribuir ▾  Mover setor ▾  Repetições ▾  ⚑ Prioridade ▾  🔥 Urgência ▾  Status ▾  Duplicar  Excluir   [Limpar]
```

Ações principais (todas com dialog de confirmação mostrando quantas demandas serão afetadas):

- **Reatribuir responsável** → popover com lista buscável de profiles. Caso de uso central: "transferir tudo da Celine para outras pessoas".
- **Mover de setor** → popover de setores.
- **Alterar repetições** → seletor 1x–5x; recria/remove siblings via lógica já existente.
- **Marcar/desmarcar Prioritária** e **Muito Urgente** (toggles independentes).
- **Status do responsável** e **Status do gestor** (pendente/executado/não realizado).
- **Duplicar** (reaproveita `DuplicarDemandasEmMassaDialog`).
- **Excluir** (reaproveita `ExcluirDemandasEmMassaDialog` / `SolicitarExclusao` para colaborador).

A barra opera sobre **siblings expandidos** das linhas selecionadas (uma linha consolidada = N siblings; selecionar a linha = selecionar todos os siblings).

## 6. Edição inline na tabela

Cada célula da linha vira clicável (sem abrir o detail dialog), com edição rápida:

- **Descrição**: clique → input/textarea inline → Enter para salvar, Esc para cancelar.
- **Responsável**: clique → popover com lista de profiles.
- **Setor**: clique → popover com lista de setores.
- **Repetições**: clique no badge "2X" → popover com 1–5.
- **Prioridade / Urgência**: ícones clicáveis (estrela / chama) que togglam imediatamente.
- **Status**: as bolinhas continuam cicláveis como já são.

Clicar na seta `>` da última coluna continua abrindo o dialog detalhado (siblings por semana).

## 7. Densidade visual

Hoje a coluna Descrição é a única "grande" e empurra Responsável/Setor para a direita com muito espaço morto.

- Larguras de coluna fixas e proporcionais:
  - Checkbox 36px · `#` 56px · Descrição flex (min 320, max 560) · Responsável 180 · Setor 160 · Semanas 140 · Rep. 64 · Prio/Urg 56 · Status R 56 · Status G 56 · Ações 80.
- Altura de linha 40px (hoje varia muito).
- Descrição com truncate em 2 linhas + tooltip; expansão ao hover.
- Zebra `bg-muted/30`, hover `bg-accent/10`. Sem mais fundo vermelho/laranja em linha inteira — usa a barra lateral 3px já implementada no APT (`bg-destructive`/`bg-warning`).
- Sticky header da tabela (header congelado no scroll).

## 8. Coluna "Semanas" reveladora

Em vez de só mostrar repetições (`2X`), exibe os números de semana usados:

```
Semanas: [ 1 ][ 3 ]      Rep: 2X
```

Permite ao gestor entender de relance "essa demanda está em qual semana do mês".

---

## Arquitetura técnica

Arquivos afetados:
- `src/pages/Gerenciamento.tsx` — cabeçalho enxuto, mover tabs para a barra de topo.
- `src/components/apt/GerenciamentoLista.tsx` — reescrito (vira orquestrador).
- Novos componentes em `src/components/apt/gerenciamento/`:
  - `FiltersBar.tsx` (pills de mês/semana + chips ativos + "Mais filtros" Sheet)
  - `GroupingToolbar.tsx` (agrupar/ordenar/limite)
  - `BulkActionsBar.tsx` (rodapé fixo com ações)
  - `InlineResponsavelPicker.tsx`, `InlineSetorPicker.tsx`, `InlineRepeticoesPicker.tsx`, `InlineDescricaoEditor.tsx`
  - `GroupedDemandRow.tsx` e `DemandRow.tsx` (linha consolidada + linha de grupo)
  - `useBulkDemandaActions.ts` (hook com as mutações em massa via Supabase)

Dados:
- Mantém o fetch atual (`demandas` filtrado por mês), mas adiciona modo "todos meses" sem filtro de mês.
- Consolidação por `grupo_id` (heurística por descrição+responsável+mes+ano quando nulo) já existe — reaproveitada.
- Bulk update: `supabase.from("demandas").update({...}).in("id", siblingIds)` agrupado por mudança. Para "Reatribuir", roda um update único com a lista expandida de IDs.
- Sem mudança de schema, sem mudança de RLS.

Compatibilidade:
- Colaborador: continua vendo só as próprias demandas; barra de ações em massa fica oculta para ele (apenas seleção para visualização e solicitar exclusão).
- Gestor/Admin: acesso total às ações em massa.

Fora de escopo (próxima fase):
- Aba "Painel" (`APTGerenciamento.tsx`) — recebe só o cabeçalho novo.
- Dashboard / APT / Checklist visuais.
- Mudanças em edge functions ou rollover.

---

## Entregáveis em ordem

1. Cabeçalho enxuto + tabs reposicionadas.
2. Nova `FiltersBar` com pills de mês/semana e chips.
3. Tabela compacta com larguras fixas, sticky header e edição inline (responsável, setor, repetições, prioridade, urgência).
4. Agrupamento dinâmico (Nenhum / Responsável / Setor / Setor→Responsável).
5. Seleção múltipla + `BulkActionsBar` (reatribuir, mover setor, repetições, prioridade, urgência, status, duplicar, excluir).
6. Modo "todos os meses" + indicador de mês na linha.
