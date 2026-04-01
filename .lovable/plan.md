

## Plano: Refatoramento Mobile-First da Plataforma SISRAMOS

### Objetivo
Melhorar significativamente a experiência mobile em todas as telas da plataforma, focando em responsividade, UX touch-friendly, e eliminação de problemas de layout em telas pequenas (360-414px).

### Problemas Identificados

1. **Header (AppLayout)**: Logo e navegação competem por espaço; nome do usuário trunca mal no mobile
2. **APT**: Header com badges + botões ocupa muito espaço vertical; filtros mobile abrem em Sheet lateral (difícil de usar com uma mão); cards de demanda têm padding excessivo
3. **Checklist**: Header com navegação de mês + ações em linha única causa overflow; botões de ação ("Copiar mês", "Apagar mês") ficam cortados; summary cards em grid 2 colunas ficam apertados
4. **Dashboard**: TabsList com 5 tabs em mobile tem texto ilegível; KPI cards com grid 2 colunas ficam muito pequenos; gráficos não se adaptam bem
5. **Configurações**: Tabela de usuários em cards mobile funciona, mas ações ficam apertadas
6. **Bottom Nav**: Funciona bem mas falta feedback háptico visual (ripple)
7. **Dialogs/Modals**: Muitos usam Dialog que no mobile deveria ser Drawer (bottom sheet)
8. **Scroll e performance**: Listas longas no APT sem virtualização; toques acidentais em elementos pequenos

### Alterações por Arquivo

#### 1. `src/components/layout/AppLayout.tsx`
- Reduzir altura do header mobile para 48px (de 56px)
- Esconder completamente a nav desktop em mobile (já faz, mas remover gap residual)
- Tornar o nome do usuário mobile mais limpo

#### 2. `src/pages/APT.tsx`
- Reorganizar header mobile: badges de status em linha compacta com números grandes
- Mover botões de ação para um FAB (Floating Action Button) ou sticky bottom bar no mobile
- Adicionar skeleton loading nos cards em vez de spinner centralizado
- Melhorar espaçamento entre cards (gap-2 → gap-3)
- Converter Sheet de filtros de `side="right"` para `side="bottom"` com altura dinâmica

#### 3. `src/components/apt/DemandaCard.tsx`
- Aumentar touch targets dos status (bolinhas) para 44px mínimo
- Melhorar a hierarquia visual: número + setor mais proeminentes
- Reduzir padding lateral de `px-3` para `px-3` mas aumentar py para melhor toque
- Tornar a área de swipe mais evidente com visual sutil

#### 4. `src/components/apt/APTFilters.tsx`
- Converter Sheet lateral para Sheet bottom no mobile
- Adicionar chips de filtro ativo visíveis acima da lista (para contexto rápido)

#### 5. `src/pages/Checklist.tsx`
- Reorganizar header em 2 linhas claras no mobile:
  - Linha 1: Título + navegação de mês
  - Linha 2: Filtros + ações (agrupadas em dropdown "Mais")
- Agrupar ações de gestor (Copiar mês, Apagar mês, Timer History, Merge) em um único dropdown no mobile
- Summary cards: grid `grid-cols-2` com card mesclado `col-span-2`

#### 6. `src/components/checklist/SortableChecklistItem.tsx`
- Aumentar área de toque do drag handle
- Melhorar layout de edição inline no mobile: campos empilhados em vez de lado a lado
- Tornar botões de prioridade em edição mais largos e tocáveis

#### 7. `src/components/checklist/ChecklistWeekTable.tsx`
- Header da tabela sticky no scroll
- Melhorar área de busca e filtros para touch
- Botão de adicionar item rápido como FAB fixo no canto inferior

#### 8. `src/pages/Dashboard.tsx`
- TabsList: usar scroll horizontal com snap no mobile em vez de grid 5 colunas
- KPI cards: 2 colunas mas com números maiores e labels mais legíveis
- Gráficos: forçar `aspect-ratio` responsivo e labels menores

#### 9. `src/components/dashboard/DashboardFilters.tsx`
- Converter para Sheet bottom no mobile (consistente com APT)

#### 10. `src/pages/Configuracoes.tsx`
- Cards de usuário mobile: melhorar espaçamento e touch targets das ações
- Garantir que selects tenham min-height 44px

#### 11. `src/components/layout/BottomNav.tsx`
- Adicionar indicador visual mais forte no item ativo (background sutil)
- Aumentar label para text-[11px] para melhor legibilidade

#### 12. `src/index.css`
- Adicionar safe-area padding global para iOS
- Adicionar smooth scrolling
- Melhorar estados de :active para touch feedback
- Adicionar classe utilitária para min-touch-target (44px)

#### 13. Novos utilitários: `src/hooks/use-mobile.tsx`
- Adicionar hook `useIsSmallMobile()` para telas < 375px (ajustes extras)

### Detalhes Técnicos
- Todos os touch targets mínimos: 44x44px (WCAG 2.5.5)
- Sheet bottom para filtros e menus no mobile (mais natural que lateral)
- FAB pattern para ações primárias frequentes
- Sticky headers para contexto durante scroll
- Dashboard tabs com scroll horizontal + snap points
- CSS `:active` states para feedback visual imediato no touch
- `overscroll-behavior: contain` para evitar scroll acidental do body
- Safe area insets para iPhone com notch/Dynamic Island

### Ordem de Implementação
1. CSS global e utilitários (index.css, use-mobile)
2. Layout (AppLayout, BottomNav)
3. APT (page + cards + filtros)
4. Checklist (page + table + items)
5. Dashboard (page + filtros + tabs)
6. Configurações

