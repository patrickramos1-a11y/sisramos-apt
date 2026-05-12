## Objetivo

Mudar o comportamento dos filtros na tela **APT** para que NÃO sejam aplicados automaticamente a cada clique. Ao invés disso, as seleções ficam em um "rascunho" e só são aplicadas quando o usuário clicar no botão **Filtrar**.

## Comportamento desejado

- Selecionar responsável, setor, mês, semana, status, etc. **não** afeta a tabela imediatamente.
- Aparece um botão **Filtrar** (verde, primário) na barra de filtros.
- Quando clicar em **Filtrar**, as seleções viram efetivas e a lista é recarregada.
- O botão **Limpar** continua funcionando, e ao limpar, aplica imediatamente (volta tudo para o padrão).
- Indicador visual quando há mudanças pendentes ainda não aplicadas (ex.: botão Filtrar destacado / com badge "•" ou texto "Aplicar filtros").
- Campo de **busca** (texto) continua atualizando em tempo real (digitação), porque exigir clicar para cada letra seria ruim. *(Posso mudar isso se você preferir que também espere o botão.)*

## Onde mudar

Apenas presentation/frontend, sem alterar lógica de dados:

1. **`src/components/apt/APTHorizontalFilters.tsx`** (desktop) e **`src/components/apt/APTFilters.tsx`** (mobile):
   - Adicionar estado interno `draftFilters` que espelha `filters` recebidos por prop.
   - Todos os `CompactDropdown` / toggles passam a atualizar `draftFilters` localmente.
   - Adicionar botão **Filtrar** que dispara `onFiltersChange(draftFilters)`.
   - Quando `filters` (prop) mudar externamente (ex.: limpar, ou cross-filter de TopSetores), ressincronizar o `draftFilters`.
   - Botão Filtrar mostra estado "pendente" quando `draftFilters !== filters`.
   - Botão **Limpar** zera o draft E chama `onClearFilters()` na hora.

2. **`src/pages/APT.tsx`**: nenhuma mudança de lógica — o contrato `onFiltersChange` continua o mesmo, só passa a ser chamado no clique do botão.

## Detalhes técnicos

- Comparação `draft !== applied` via `JSON.stringify` simples (objeto pequeno).
- Busca textual (`busca`) **continua aplicando ao vivo** para não quebrar UX de digitação. Se preferir, troco para também esperar o botão.
- TopSetores (cross-filter por clique no card de setor) continua aplicando direto, pois é um atalho de 1 clique, não múltipla seleção.

## Fora do escopo

- Não muda Checklist nem Dashboard (que têm seus próprios filtros).
- Não altera persistência de filtros nem cache de dados.