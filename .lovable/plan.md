

# Melhorias de UX para o Checklist Semanal

## Resumo

Refatorar a interface do Checklist para uma experiencia visual premium com tabela interativa no dialog de detalhes, microinteracoes, feedback de progresso animado e hierarquia visual aprimorada. Nenhuma regra de negocio sera alterada.

## Alteracoes por Componente

### 1. ChecklistDetailDialog.tsx - Transformacao em Tabela Interativa

A visualizacao de detalhes da semana sera transformada de uma lista simples para uma **tabela interativa estilizada** (conforme imagem de referencia), com:

- **Colunas**: Status (icone) | Tarefa (descricao) | Responsaveis (avatares) | Link (icone clicavel) | Acoes (editar/excluir)
- **Zebra striping**: linhas com fundo alternado para facilitar leitura
- **Bordas arredondadas** e sombra leve em cada linha
- **Destaque visual por status**: fundo verde suave para concluido, vermelho suave para nao realizado, neutro para pendente
- **Header sticky** da tabela com cores da semana
- Manter drag-and-drop funcional com grip handle na primeira coluna
- Barra de progresso circular animada no header do dialog (ao inves de apenas barra linear)

### 2. SortableChecklistItem.tsx - Microinteracoes e Feedback Visual

- **Animacao ao marcar status**: efeito de "pulse" no icone ao clicar (escala + cor por 300ms)
- **Hover aprimorado**: fundo escurece suavemente, acoes de edicao ficam visiveis com fade-in
- **Linha risca com animacao**: ao marcar como concluido, texto recebe line-through com transicao CSS
- **Drag feedback**: ao arrastar, a linha fica com sombra elevada e borda primary, e a posicao de destino mostra um indicador visual (linha colorida)
- **Responsaveis com tooltip**: ao passar o mouse sobre avatares, exibir nome completo via Tooltip do Radix
- **Link mais destacado**: icone de link com cor primary e badge visual ao inves de texto simples

### 3. ChecklistSummaryCard.tsx - Feedback de Progresso Aprimorado

- **Indicador de progresso circular** (SVG) ao lado do titulo da semana, preenchendo conforme conclusao
- **Animacao de conclusao total**: quando 100%, o card recebe um efeito de "glow" verde com animacao suave
- **Texto "Semana Completa"** com icone de check animado quando todas as tarefas estao feitas
- **Contador de status**: exibir mini-badges mostrando quantas pendentes, concluidas e nao realizadas

### 4. ChecklistDetailDialog.tsx - Layout de Tabela (Desktop) vs Cards (Mobile)

- **Desktop**: layout tabular com colunas alinhadas (conforme referencia)
- **Mobile**: manter layout de cards empilhados (responsivo)
- Transicao suave entre os dois layouts via media queries

### 5. Microinteracoes Globais (CSS/Tailwind)

- Adicionar keyframes para:
  - `check-bounce`: animacao do icone ao marcar como feito
  - `strike-through`: animacao do texto riscado
  - `highlight-flash`: borda destacada por 500ms apos qualquer acao
  - `drag-lift`: elevacao visual ao arrastar item
- Transicoes suaves em todas as mudancas de estado (opacity, background, transform)

### 6. Checklist.tsx - Filtros Aprimorados (visual apenas)

- **Chips de filtros ativos** visiveis abaixo do header (ex: "Fev 2026", "1a Semana") com X para remover
- Melhorar visual dos summary cards com sombras mais definidas
- Header sticky no mobile com titulo + acoes

## Detalhes Tecnicos

### Arquivos a modificar:
| Arquivo | Alteracao |
|---|---|
| `src/components/checklist/ChecklistDetailDialog.tsx` | Layout tabular, progress circular, header aprimorado |
| `src/components/checklist/SortableChecklistItem.tsx` | Microinteracoes, tooltips, animacoes de status, zebra styling |
| `src/components/checklist/ChecklistSummaryCard.tsx` | Progress circular SVG, badges de status, animacao de conclusao |
| `src/pages/Checklist.tsx` | Chips de filtros ativos, layout aprimorado |
| `src/index.css` | Keyframes para animacoes (check-bounce, strike-through, highlight-flash) |

### Novas dependencias: Nenhuma

### Animacoes CSS a adicionar:
```text
@keyframes check-bounce: scale(1) -> scale(1.3) -> scale(1)  (300ms)
@keyframes strike-through: width 0 -> 100%  (200ms)
@keyframes highlight-flash: border-color primary -> transparent  (500ms)
```

### Padrao responsivo:
- Desktop (>768px): tabela com colunas | Status | Tarefa | Responsaveis | Link | Acoes |
- Mobile (<768px): cards empilhados (layout atual melhorado)

### O que NAO muda:
- Logica de drag-and-drop (dnd-kit)
- Sistema de 3 estados (pendente/concluido/nao_realizado)
- Regras de permissao (quem pode editar/concluir)
- Estrutura de dados e queries do banco
- Filtros e busca (funcionalidade identica, apenas visual aprimorado)
- Sistema de responsaveis e atribuicao

