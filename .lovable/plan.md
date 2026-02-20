
# Feedback visual para semanas finalizadas com itens "Nao Realizado"

## Contexto
Atualmente, quando **todos os itens** de uma semana sao concluidos (status `concluido`), o card exibe um efeito de brilho verde pulsante (`animate-glow-pulse`) com ring verde e icone de sucesso. Porem, quando a semana esta **totalmente processada** (nenhum item pendente) mas possui itens marcados como `nao_realizado`, nao ha nenhum feedback visual diferenciado.

## O que sera feito

Adicionar um estado intermediario: **"Semana Finalizada"** -- quando todos os itens foram processados (completados + nao realizados = total), mas existem itens `nao_realizado`. Esse estado tera uma estetica que transmite "quase conseguimos", com tom amarelo/ambar pulsante.

### Logica de estados do card

```text
+------------------------------------------+
| totalItems == 0         -> Estado normal  |
| completedItems == total -> Vitoria (verde)|
| completed + notDone == total              |
|   && notDone > 0        -> "Quase la"    |
| otherwise               -> Em progresso  |
+------------------------------------------+
```

### Mudancas visuais do estado "Quase la"

| Elemento | Vitoria (atual) | "Quase la" (novo) |
|---|---|---|
| Ring do card | `ring-primary/30` (verde) | `ring-amber-500/30` (amarelo) |
| Background | `bg-primary/5` | `bg-amber-500/5` |
| Animacao | `animate-glow-pulse` (verde) | `animate-glow-pulse-amber` (amarelo) |
| Header gradient | `from-primary/20 to-primary/10` | `from-amber-500/20 to-amber-500/10` |
| Icone | CheckCircle2 verde | AlertCircle amarelo com bounce |
| Titulo | "Semana Completa" | "Semana Finalizada" |
| Badge | `bg-primary/20 text-primary` | `bg-amber-500/20 text-amber-600` |

## Detalhes tecnicos

### 1. `src/index.css` - Nova animacao amber
Adicionar um `@keyframes glowPulseAmber` identico ao `glowPulse` mas usando a cor amber em vez de primary, e a classe `.animate-glow-pulse-amber`.

### 2. `src/components/checklist/ChecklistSummaryCard.tsx`
- Criar uma variavel `allProcessed` que verifica se `completedItems + notDoneItems === totalItems && totalItems > 0 && notDoneItems > 0`.
- Usar `allProcessed` para aplicar as classes amber no card, header, icone, titulo e badge.
- Usar o icone `AlertCircle` do lucide-react para o estado "quase la".
- Manter a logica de `allCompleted` inalterada para o estado de vitoria.

### 3. `src/components/checklist/ChecklistDetailDialog.tsx`
- Aplicar a mesma logica de `allProcessed` no cabecalho do dialogo de detalhes para consistencia visual entre card e dialogo.
