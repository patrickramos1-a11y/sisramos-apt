
# Refatoramento Completo de Responsividade Mobile/Tablet

Revisao completa de todas as paginas e componentes para garantir uma experiencia de qualidade em celulares e tablets, mantendo a experiencia desktop intacta.

---

## Problemas Identificados

1. **Dashboard**: Titulo e filtros ocupam muito espaco em mobile. KPIs em grid 2 colunas funcionam, mas tabs com 4 itens ficam apertadas. Graficos de donut e barras nao se adaptam bem a telas pequenas.
2. **APT**: Toolbar de acoes (Export, Colunas, Momento APT, Rollover, Nova Demanda) transborda horizontalmente em mobile. Botoes de acao em massa nao se adaptam.
3. **Backlog Lista**: Tabela com 8 colunas nao e visivel em mobile -- nao tem versao em cards como a APT.
4. **Backlog Painel**: Grid de 6 cards summary e graficos lado a lado nao se adaptam a telas menores que 768px.
5. **Checklist**: Header com muitos botoes inline (navegacao de mes, filtro de semana, lock, novo item, copiar mes) transborda em telas pequenas.
6. **Configuracoes**: Cards de usuario mobile ja existem, mas a secao de dados pessoais e de aparencia poderiam ter melhor espacamento.
7. **Login**: Ja esta responsivo (grid adapta de 2 a 5 colunas). Apenas ajustes menores.

---

## Fase 1 -- Dashboard Mobile

### 1.1 `src/pages/Dashboard.tsx`
- Titulo `text-2xl` para `text-lg md:text-2xl`
- Subtitulo com `line-clamp-2` em mobile
- TabsList: reduzir tamanho de fonte em mobile, esconder icones em telas menores

### 1.2 `src/components/dashboard/DashboardFilters.tsx`
- Botao de filtros mobile: garantir altura minima de 44px (touch target)
- Sheet de filtros: ajustar padding e scroll

### 1.3 Graficos (donuts, barras)
- `StatusDonutChart.tsx` e `GestorStatusDonutChart.tsx`: reduzir `innerRadius`/`outerRadius` em mobile, esconder legendas longas
- Graficos de barras: reduzir altura em mobile de 300px para 250px

---

## Fase 2 -- APT Mobile

### 2.1 `src/pages/APT.tsx`
- Toolbar de acoes: agrupar botoes secundarios em um DropdownMenu "Mais acoes" em mobile, mostrando apenas os botoes essenciais (Nova Demanda, Filtros)
- Bulk actions bar: layout vertical em mobile com botoes de largura total
- Esconder texto dos botoes em mobile, manter apenas icones

### 2.2 `src/components/apt/DemandaCard.tsx`
- Ajustar padding interno para `p-2.5` em telas muito pequenas
- Garantir que badges nao quebrem o layout (flex-wrap ja existe)

---

## Fase 3 -- Backlog Mobile

### 3.1 `src/components/backlog/BacklogLista.tsx`
- Criar versao mobile com cards em vez de tabela (similar ao padrao APT)
- Card mostra: numero, titulo, status badge, prioridade badge, projeto
- Manter tabela apenas para `md:` e acima

### 3.2 `src/components/backlog/BacklogPainel.tsx`
- Summary cards: `grid-cols-2` em mobile (em vez de comecar em `md:grid-cols-2`)
- Graficos: empilhar verticalmente em mobile (`grid-cols-1` sempre em mobile)
- Itens urgentes: ajustar layout flex para wrap em telas pequenas

---

## Fase 4 -- Checklist Mobile

### 4.1 `src/pages/Checklist.tsx`
- Header: separar controles em duas linhas em mobile
  - Linha 1: titulo + navegacao de mes
  - Linha 2: filtro de semana + botoes de acao (agrupados em menu)
- Botoes "Copiar mes" e "Lock": colocar dentro de um DropdownMenu em mobile
- Summary cards: manter `grid-cols-2` em mobile (ja funciona)

### 4.2 `src/components/checklist/ChecklistWeekTable.tsx`
- Filtros do topo (busca, status, tipo): empilhar em mobile
- Itens da lista: garantir que o texto nao transborde

---

## Fase 5 -- Configuracoes Mobile

### 5.1 `src/pages/Configuracoes.tsx`
- Titulo: `text-lg md:text-2xl`
- Cards de dados pessoais: ajustar padding em mobile
- Secao de aparencia: ja funciona bem, apenas garantir touch targets

---

## Fase 6 -- Melhorias Globais de Responsividade

### 6.1 `src/components/ui/dialog.tsx` e modais
- Garantir que dialogs usem `max-h-[85vh]` em mobile com scroll interno
- Dialogs em mobile: largura `w-[95vw]` em vez de tamanhos fixos

### 6.2 Touch targets
- Revisar todos os botoes `size="icon"` para garantir min 44x44px em mobile
- Inputs e selects: `h-10` minimo (ja esta na maioria)

### 6.3 Overflow e scroll
- Adicionar `overflow-x-hidden` no container principal para evitar scroll horizontal
- Tabelas que nao tem versao card: adicionar `overflow-x-auto` com wrapper

---

## Detalhes Tecnicos

### Arquivos a modificar:
1. `src/pages/Dashboard.tsx` -- titulos e tabs responsivos
2. `src/pages/APT.tsx` -- toolbar de acoes agrupada em mobile
3. `src/pages/Checklist.tsx` -- header reorganizado em mobile
4. `src/pages/Configuracoes.tsx` -- ajustes menores de titulo
5. `src/components/backlog/BacklogLista.tsx` -- versao card mobile
6. `src/components/backlog/BacklogPainel.tsx` -- grid e graficos responsivos
7. `src/components/dashboard/StatusDonutChart.tsx` -- tamanho responsivo
8. `src/components/dashboard/GestorStatusDonutChart.tsx` -- tamanho responsivo
9. `src/components/checklist/ChecklistWeekTable.tsx` -- filtros empilhados

### Principios:
- Zero alteracoes de logica ou dados
- Usar breakpoints existentes: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Touch targets minimos de 44px
- Textos truncados com `truncate` ou `line-clamp`
- Botoes secundarios agrupados em DropdownMenu/Sheet em mobile
- Tabelas convertidas para cards abaixo de `md:`
