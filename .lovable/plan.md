
Objetivo: adicionar um controle de quantidade de linhas no fim da página “Lista” de demandas, para reduzir carregamento/renderização desnecessários. O padrão será 50 linhas ao abrir a tela, com opções de 50, 100, 500, 1000 e 2000.

Implementação

1. Atualizar `src/components/apt/GerenciamentoLista.tsx`
- Criar um estado local para a quantidade máxima exibida, com valor inicial `50`.
- Definir as opções fixas de exibição:
  - 50
  - 100
  - 500
  - 1000
  - 2000
- Aplicar o limite depois da filtragem, consolidação e ordenação:
  - manter `sortedDemands` com a lista completa já processada
  - criar uma lista derivada, por exemplo `visibleDemands = sortedDemands.slice(0, rowLimit)`
- Alterar a renderização da tabela para usar `visibleDemands` em vez de `sortedDemands`.

2. Adicionar o seletor no final da lista
- Inserir abaixo da tabela um rodapé com:
  - seletor “Linhas por página” usando o componente `Select` já existente em `src/components/ui/select.tsx`
  - texto de contexto, por exemplo:
    - “Mostrando 50 de 1.284 demandas”
- Posicionar esse controle no fim do card/lista, como solicitado, não no topo.

3. Regras de comportamento
- Ao abrir a página, carregar com 50 linhas.
- Ao trocar filtros, busca ou ordenação, manter o limite atualmente escolhido.
- Se o total filtrado for menor que o limite, mostrar apenas o total disponível sem erro.
- Se não houver resultados, manter o estado vazio atual e ocultar/desabilitar o seletor conforme fizer mais sentido visualmente.

4. Ajustes de UX
- Deixar o seletor responsivo para mobile e desktop.
- Usar rótulo claro em português:
  - “Exibir”
  - “linhas”
  ou
  - “Linhas visíveis”
- Mostrar a contagem total consolidada e a quantidade exibida para o usuário entender que há mais resultados disponíveis.

5. Validação funcional após implementação
- Confirmar que a página abre com 50 linhas.
- Confirmar que 100, 500, 1000 e 2000 passam a expandir a tabela corretamente.
- Confirmar que busca, filtros e ordenação continuam funcionando antes do corte visual.
- Confirmar que ações da linha (editar/excluir/detalhes) continuam funcionando normalmente nas linhas exibidas.

Detalhes técnicos
- Arquivo principal: `src/components/apt/GerenciamentoLista.tsx`
- Componentes úteis já existentes:
  - `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`
- Estratégia:
  - não mudar schema, backend ou autenticação
  - fazer limitação no frontend da listagem consolidada
  - preservar a lógica existente de filtros, agrupamento e ordenação

Resultado esperado
- A aba “Lista” continuará funcionando igual, mas exibirá apenas 50 registros por padrão.
- O usuário poderá ampliar manualmente para 100, 500, 1000 ou 2000 no final da página.
- Isso reduz peso visual e renderização desnecessária na abertura da tela.
