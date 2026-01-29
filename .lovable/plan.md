
## Plano: Correção da Visualização das Demandas Consolidadas no Gerenciamento

### Problema Identificado
A tabela "Demandas Consolidadas" mostra o badge "156 únicas" mas exibe apenas 7 linhas visíveis. A causa é que o componente `ScrollArea` do Radix UI não está calculando corretamente a altura do conteúdo quando usado com valores `max-h` calculados dinamicamente. Isso faz com que o conteúdo seja cortado sem a barra de rolagem aparecer.

### Análise Comparativa
- **Aba APT principal**: Usa `Table` diretamente dentro de um `Card`, sem `ScrollArea`, e funciona corretamente porque depende do scroll natural da página
- **Aba Gerenciamento**: Usa `ScrollArea` com `max-h-[calc(100vh-400px)]` que não está funcionando corretamente

### Solução Proposta
Remover o `ScrollArea` e substituir por um container div com overflow-auto e altura fixa, permitindo scroll nativo do navegador que funciona de forma mais confiável.

### Mudanças Técnicas

**Arquivo: `src/components/apt/APTGerenciamento.tsx`**

1. **Remover ScrollArea da tabela de Demandas Consolidadas** (linhas 912-938)
   - Trocar `ScrollArea` por um `div` com classes `overflow-auto max-h-[60vh]`
   - Isso usa o scroll nativo do navegador que é mais confiável

2. **Aplicar a mesma correção no Dialog de Setor** (se houver tabela similar)
   - Garantir que qualquer outra lista longa também use scroll nativo

### Código Antes vs Depois

```text
ANTES:
<Card>
  <ScrollArea className="max-h-[calc(100vh-400px)] min-h-[300px]">
    <Table>...</Table>
  </ScrollArea>
</Card>

DEPOIS:
<Card>
  <div className="overflow-auto max-h-[60vh]">
    <Table>...</Table>
  </div>
</Card>
```

### Resultado Esperado
- Todas as 156 demandas consolidadas serão visíveis através da rolagem
- A barra de scroll aparecerá corretamente quando houver mais itens do que cabem na tela
- Comportamento consistente com a aba APT principal
