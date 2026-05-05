## Objetivo

Adicionar à criação de demandas a opção de **repetição mensal recorrente** (a cada N meses, durante X meses), mantendo as semanas selecionadas dentro de cada mês. Garantir que editar/excluir demandas irmãs funcione normalmente abrangendo todos os meses do grupo.

## Exemplo de uso

Usuário quer uma demanda que se repete:
- A cada **2 meses** (intervalo)
- Por **3 ocorrências** (no mês atual, +2 meses e +4 meses)
- Em **3 semanas selecionadas** dentro de cada mês (ex: 1ª, 3ª e 5ª)

Resultado: 3 ocorrências × 3 semanas = **9 demandas irmãs** todas vinculadas pelo mesmo `grupo_id`.

## Mudanças em UI — Nova Demanda (`NovaDemandaDialog.tsx`)

Adicionar uma nova seção **"Repetição mensal"** logo abaixo do bloco Mês/Ano:

```text
[ ] Repetir em outros meses
    Intervalo: [ a cada 1 / 2 / 3 / 4 / 6 meses ▾ ]
    Ocorrências: [ 1 a 12 ]
    Pré-visualização: "Será criada nas semanas {1ª,3ª,5ª} de
                       Mai/2026, Jul/2026 e Set/2026 → 9 demandas"
```

- Quando desmarcado, comportamento atual permanece (1 mês único).
- Quando marcado, gera demandas para cada `(mês_alvo, semana)` combinada.
- **Todas as demandas geradas por um único responsável compartilham o mesmo `grupo_id`** — isso é o que garante que editar/excluir irmãs funcione abrangendo todos os meses.
- Multi-responsável: cada responsável recebe seu próprio `grupo_id` (igual ao padrão atual).

## Mudanças em UI — Editar Demanda Irmã (`EditarDemandaIrmaDialog.tsx`)

- O contador de irmãs já busca por `grupo_id` (sem filtro de mês), então funcionará automaticamente para grupos multi-mês.
- Ajustar texto de ajuda quando o grupo abrange vários meses: "Esta demanda faz parte de um grupo com X demandas em N meses diferentes".
- Ao escolher "Todas as N demandas do grupo" e alterar mês/ano: **manter o offset relativo** de cada irmã (não sobrescrever todos os meses para o mesmo valor). Opção mais simples e segura: quando o grupo abrange múltiplos meses, **bloquear a edição de Mês/Ano no escopo "Todas"** e exibir aviso "Para alterar datas use 'Apenas esta'". Editar descrição/observações/responsável/setor/prioridade em "Todas" continua funcionando.
- Edição de "semanas selecionadas" no escopo "Todas" também precisa ser tratada: bloquear quando o grupo for multi-mês (semanas pertencem a meses diferentes).

## Mudanças em UI — Excluir Demanda Irmã (`ExcluirDemandaIrmaDialog.tsx`)

- Já funciona via `grupo_id` — abrangerá todos os meses automaticamente.
- Atualizar a pré-visualização das irmãs para também mostrar o mês de cada uma:
  ```
  #123  Descrição...   [Mai/2026 · 1ª]
  #124  Descrição...   [Mai/2026 · 3ª]
  #130  Descrição...   [Jul/2026 · 1ª]
  ...
  ```

## Mudanças em UI — Solicitar Exclusão (`SolicitarExclusaoDialog.tsx`)

- Verificar que a opção "Todas as irmãs" usa `grupo_id` (não filtro por mês) — ajustar se necessário para que a solicitação cubra todas as ocorrências, inclusive em meses futuros.

## Mudanças no rollover

- O rollover automático/manual **não deve duplicar** demandas que já foram pré-criadas em meses futuros pelo novo sistema.
- Ajustar `auto-rollover/index.ts` e `rollover-demandas/index.ts`: ao copiar uma demanda para o próximo mês, verificar se já existe uma demanda com o mesmo `grupo_id` no mês de destino — se existir, **pular** (não duplicar).

## Detalhes técnicos

**Schema:** nenhuma migração necessária. Usa colunas existentes (`grupo_id`, `mes`, `ano`, `semana_limite`, `semanas_repeticao`).

**Cálculo dos meses-alvo (NovaDemandaDialog):**
```ts
const targetMonths: { mes: number; ano: number }[] = [];
for (let i = 0; i < ocorrencias; i++) {
  const offset = i * intervaloMeses;
  const d = new Date(parseInt(ano), parseInt(mes) - 1 + offset, 1);
  targetMonths.push({ mes: d.getMonth() + 1, ano: d.getFullYear() });
}
```

**Geração de demandas:**
```ts
for (const responsavelId of responsaveis) {
  const grupoId = (targetMonths.length * semanas.length) > 1
    ? crypto.randomUUID() : null;
  for (const { mes, ano } of targetMonths) {
    for (const semana of semanas) {
      allDemandas.push({ ..., mes, ano, semana_limite: [semana], grupo_id });
    }
  }
}
```

**Anti-duplicação no rollover:** antes de inserir as demandas duplicadas no próximo mês, fazer `select` agrupado por `grupo_id + mes + ano` e filtrar fora as que já existem.

## Arquivos afetados

- `src/components/apt/NovaDemandaDialog.tsx` — novo bloco de repetição mensal + lógica de geração
- `src/components/apt/EditarDemandaIrmaDialog.tsx` — bloqueios de mês/ano/semanas no escopo "Todas" quando grupo é multi-mês
- `src/components/apt/ExcluirDemandaIrmaDialog.tsx` — pré-visualização com mês
- `src/components/apt/SolicitarExclusaoDialog.tsx` — garantir uso de `grupo_id`
- `supabase/functions/auto-rollover/index.ts` — anti-duplicação por `grupo_id+mes+ano`
- `supabase/functions/rollover-demandas/index.ts` — anti-duplicação por `grupo_id+mes+ano`
