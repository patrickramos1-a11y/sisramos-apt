## Problema

Hoje, quando uma demanda tem recorrência multi-mês (ex: mai, jul, set), na virada de mai → jun o rollover **copia indevidamente** a demanda para jun, mesmo jun não fazendo parte do plano de recorrência. Isso "vaza" a demanda em meses não desejados.

## Correção

Em ambos os edge functions de rollover, adicionar uma verificação extra: **se a demanda origem tem `grupo_id` E o grupo possui ocorrências em outros meses (qualquer `(mes,ano)` diferente do mês origem), pular a cópia**.

Isso garante que demandas pré-agendadas pela recorrência mensal NUNCA sejam expandidas para meses não planejados pelo rollover.

### Arquivos a editar

1. **`supabase/functions/auto-rollover/index.ts`**
   - Após buscar `sourceDemandas`, coletar todos os `grupo_id` distintos não-nulos.
   - Fazer uma query extra: `select grupo_id, mes, ano from demandas where grupo_id in (...)`.
   - Construir `Set<string>` de `grupo_id` que são "multi-mês" (têm pelo menos uma ocorrência em mês/ano ≠ origem).
   - No filtro de `newDemandas`, pular se `d.grupo_id` está nesse set.

2. **`supabase/functions/rollover-demandas/index.ts`**
   - Mesma lógica aplicada no rollover manual.

### Pseudocódigo da regra

```ts
const groupIds = [...new Set(sourceDemandas.map(d => d.grupo_id).filter(Boolean))];
const { data: groupOccurrences } = await supabase
  .from("demandas")
  .select("grupo_id, mes, ano")
  .in("grupo_id", groupIds);

const multiMonthGroups = new Set<string>();
for (const occ of groupOccurrences ?? []) {
  if (occ.mes !== sourceMes || occ.ano !== sourceAno) {
    multiMonthGroups.add(occ.grupo_id);
  }
}

// No filtro existente:
if (d.grupo_id && multiMonthGroups.has(d.grupo_id)) return false;
```

## Teste

Após aplicar:
1. Inserir via SQL uma demanda fake com `grupo_id` em mai/26 e set/26 (simulando recorrência a cada 2 meses pulando jun e jul).
2. Chamar `rollover-demandas` com `sourceMes=5, sourceAno=2026, targetMes=6, targetAno=2026, dryRun=true`.
3. Verificar no JSON de resposta que essa demanda **não** aparece em `wouldCopy` (apenas demandas sem `grupo_id` ou de grupos single-month aparecem).
4. Limpar os dados de teste do banco.

## Sem mudanças necessárias

- Nenhuma migration de schema.
- Nenhuma mudança de UI.
- A regra antiga (`existingGrupoIds` no destino) permanece como segunda barreira.
