## Objetivo

Refinar a aparência das páginas **APT** e **Checklist** para reduzir "ruído visual" (linhas inteiras pintadas, painel de filtros pesado, contraste cru) e elevar a hierarquia da informação. Zero mudanças de lógica/back-end.

## Direção de design (escolhas padrão)

- **Paleta:** mantém `#6FAE2E` (primário) e `#2D4A22` (accent), porém com novas superfícies neutras quentes (off-white `#FAFAF7`, surface `#F4F5F1`, borda `#E5E7DF`) para reduzir contraste cru.
- **Tipografia:** mantém Plus Jakarta Sans, mas com escala refinada (display 28/600, h2 18/600, body 14/450, label 12/500 uppercase tracking).
- **Densidade:** padding de linha 12px (era 16-20), altura de linha de tabela 48px (era 56-64), bordas 1px com `border-border/60`.

## 1. Painel de filtros (APT + Checklist)

**Hoje:** sempre visível, 11 dropdowns lado a lado, botão "Filtrar" manual, ocupa ~180px de altura.

**Refinamento:**
- Barra superior compacta (~48px) com: busca + filtros essenciais inline (Mês, Ano, Responsável) + botão **"Mais filtros"** que abre um `Sheet` lateral com os demais (Setor, Repetições, Semana, Status, Urgente, Prioridade).
- **Chips de filtros ativos** abaixo da barra: cada filtro aplicado vira um chip removível com X (ex.: `Mês: Maio ×`, `Setor: Serviços ×`). "Limpar tudo" só aparece quando há ≥1 chip.
- **Aplicação automática** com debounce de 300ms — botão "Filtrar" sai. Mantém botão "Limpar" só no Sheet.
- Filtros "Urgente"/"Prioridade" viram `Toggle` (pill) ao invés de botão sólido vermelho/laranja.

## 2. Sinalização de Urgente / Prioridade

**Hoje:** linha inteira vermelha/amarela → ilegível.

**Refinamento:**
- Fundo da linha **neutro** (zebra suave) em todos os casos.
- **Barra vertical 3px** na lateral esquerda da linha: vermelho para Urgente, âmbar para Prioridade.
- **Badge inline** discreto após o N° ("• Urgente" em vermelho 600, "• Prioridade" em âmbar 600), tamanho `text-[10px]` uppercase.
- Texto da linha mantém `text-foreground` com 100% legibilidade.

## 3. Tabela APT (`DemandaTableRow`, `APTGerenciamento`)

- Header verde mantido, mas com tipografia label uppercase tracking-wide, peso 500 (não 700).
- **Zebra stripe** com `bg-muted/30` em vez de listras coloridas; hover `bg-accent/5`.
- StatusBolinha: tamanho reduzido para 20px (era 28px), border refinado, micro-anel de halo no hover.
- Coluna **Semana** vira pill arredondada cinza com o número (`1ª`, `2ª`...) ao invés de texto solto.
- Coluna **Rep.** ganha ícone de loop discreto + número.
- KPI cards no topo do Gerenciamento ("2 PENDENTES", "1 AGUARDANDO"): bordas finas em vez de fill colorido, número em destaque, label uppercase pequeno.
- Cards de setor (Feedback/Serviços/Compras): converter de blocos coloridos para cards neutros com **anel colorido fino** (2px) na lateral, número grande, % à direita em verde/âmbar conforme valor.

## 4. Checklist

- Headers de semana mantêm código de cores, mas como **chip pill** no topo do card em vez de barra de cor sólida (reduz peso visual).
- Cards de tarefa: superfície `bg-card`, borda `border/60`, sombra `shadow-sm` no hover apenas.
- StatusBolinha consistente com APT (20px, halo no hover).
- Progress circular: stroke mais fino (3px), número central com tipo display.
- Temporal bar de mês: tipografia maior, setas chevron leves, mês atual com underline verde de 2px ao invés de fill.

## 5. Dark mode

- Atualizar tokens `--background`, `--card`, `--muted`, `--border` para superfícies escuras quentes (não preto puro): `hsl(140 8% 9%)` / `hsl(140 8% 12%)` / `hsl(140 6% 18%)`.
- Manter contraste WCAG AA em todos os badges/chips.

## Arquivos afetados (visual apenas)

```
src/index.css                                   tokens de superfície
tailwind.config.ts                              novos tokens semânticos (surface, surface-elevated)
src/components/apt/APTFilters.tsx               novo layout colapsável + chips
src/components/apt/APTHorizontalFilters.tsx     mesma estrutura
src/components/checklist/ChecklistFilters.tsx   mesma estrutura
src/components/apt/DemandaTableRow.tsx          barra lateral, badge, zebra neutro
src/components/apt/DemandaCard.tsx              barra lateral mobile
src/components/apt/StatusBolinha.tsx            tamanho/halo
src/components/apt/APTGerenciamento.tsx         KPI cards + setor cards refinados
src/components/apt/TopSetoresBar.tsx            cards neutros com ring
src/components/checklist/ChecklistWeekTable.tsx pill de semana
src/components/checklist/ChecklistCard.tsx     superfície + sombra
src/components/checklist/CircularProgress.tsx   stroke fino
```

## Fora de escopo

- Lógica de filtros (debounce só envolve UI do `APTFilters` chamando `onApply` automaticamente).
- Queries, RLS, edge functions, dados.
- Comportamento de bulk select, aprovação, momento APT, rollover.
- Dashboard (pode vir em fase 2 se aprovado).

## Validação

Após implementação: screenshots de APT (Execução + Gerenciamento) e Checklist em light e dark mode, com e sem filtros ativos, com linhas urgentes/prioritárias, para confirmar legibilidade.
