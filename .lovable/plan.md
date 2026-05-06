
## Problema identificado

Confirmei no banco que as 5 demandas (#2442, 2443, 2444, 2466, 2598) que deveriam ser irmãs têm **5 `grupo_id` DIFERENTES** — por isso "Editar todas" só edita uma e o mesmo vale para "Excluir todas".

### Causa raiz

Nos edge functions `rollover-demandas/index.ts` (linha 189) e `auto-rollover/index.ts`, o rollover gera um **novo UUID por demanda copiada**:

```ts
grupo_id: d.semanas_repeticao > 1 ? crypto.randomUUID() : null,
```

Como cada demanda irmã é processada individualmente no `.map()`, cada uma recebe um UUID único. Resultado: o grupo é destruído a cada virada de mês.

### Causa secundária

O fallback heurístico no `EditarDemandaIrmaDialog` e `ExcluirDemandaIrmaDialog` exige `descricao` idêntica para reagrupar órfãos. Após qualquer edição parcial (como já aconteceu com #2442 e #2443), a heurística falha.

## Correções

### 1. Corrigir o rollover (raiz do problema)

Em `supabase/functions/rollover-demandas/index.ts` e `supabase/functions/auto-rollover/index.ts`:

- Antes do `.map()`, construir um `Map<oldGrupoId, newGrupoId>` que preserva o agrupamento: todas as demandas que compartilhavam o mesmo `grupo_id` na origem recebem o **mesmo novo `grupo_id`** no destino.
- Demandas sem `grupo_id` mas com `semanas_repeticao > 1` (caso degenerado) recebem UUID individual como antes.

### 2. Reparar dados existentes via migration

Detectar grupos quebrados e reagrupá-los pela assinatura `(responsavel_id, semanas_repeticao, mes, ano)` + similaridade de descrição prévia ao "drift" de edições. Como as descrições já divergiram (#2442/2443 viraram "para ele" e #2444/2466/2598 continuam "MATADORA"), a migration usará uma heurística mais permissiva:

- Agrupar por `(responsavel_id, mes, ano, semanas_repeticao)` quando o número de demandas no agrupamento for **igual a `semanas_repeticao`** e cada uma cobrir uma semana distinta de 1..N. Atribuir um único `grupo_id` ao grupo.
- Já normalizar a descrição dessas 5 demandas específicas para `"Acompanhar com o Patrick os processos internos das empresas. e apresentar as informações para ele"` (conforme pedido do usuário).

### 3. Melhorar o fallback heurístico do dialog

Em `EditarDemandaIrmaDialog.tsx` e `ExcluirDemandaIrmaDialog.tsx`:

- Quando `grupo_id` existir mas a busca primária retornar apenas 1 resultado (grupo quebrado), executar **fallback adicional** por `(responsavel_id, mes, ano, semanas_repeticao)` ignorando descrição.
- Se encontrar `N` demandas onde `N === semanas_repeticao` e as semanas forem distintas, reagrupá-las atribuindo o mesmo `grupo_id` (auto-cura).

### 4. Suíte de testes

Atualizar `supabase/functions/rollover-demandas/index.test.ts` cobrindo:

- Rollover de grupo de 5 semanas → as 5 demandas no destino compartilham **1 único** `grupo_id` (não 5).
- Rollover de grupo single-mês → preserva agrupamento.
- Rollover de grupo multi-mês → não duplica (já coberto, manter).
- Edição em massa: simular update por `grupo_id` e verificar que afeta N linhas.
- Exclusão em massa: simular delete por `grupo_id` e verificar que afeta N linhas.
- Caso degenerado: demanda solo com `semanas_repeticao=1` continua com `grupo_id=null`.

## Arquivos alterados

- `supabase/functions/rollover-demandas/index.ts` — preservar agrupamento via Map
- `supabase/functions/auto-rollover/index.ts` — mesma correção
- Migration SQL — reparar os 5 órfãos atuais + corrigir descrição
- `src/components/apt/EditarDemandaIrmaDialog.tsx` — fallback adicional sem exigir descrição
- `src/components/apt/ExcluirDemandaIrmaDialog.tsx` — mesmo fallback
- `supabase/functions/rollover-demandas/index.test.ts` — novos testes

## Validação

Após aplicar:
1. Rodar testes Deno do edge function (`supabase--test_edge_functions`).
2. Verificar via SQL que as 5 demandas compartilham o mesmo `grupo_id` e têm a descrição correta.
3. Pedir ao usuário para abrir #2442 → "Editar todas as 5 demandas do grupo" e confirmar que afeta as 5.
