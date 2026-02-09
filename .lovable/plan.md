

# Correção: Demandas Irmãs Não Reconhecidas (grupo_id NULL)

## Diagnóstico

Investiguei o banco de dados e o código e encontrei a **causa raiz** do problema:

**254 demandas ativas possuem `semanas_repeticao > 1` (ou seja, possuem irmãs) mas o campo `grupo_id` está NULL.**

Isso acontece porque essas demandas foram criadas por processos que não geraram o `grupo_id`:
- **Rollover de demandas** (edge functions `rollover-demandas` e `auto-rollover`) -- define `grupo_id: null` intencionalmente
- **Duplicação em massa** (`DuplicarDemandasEmMassaDialog`) -- também define `grupo_id: null`
- **Demandas antigas** criadas antes do sistema de grupo_id ser implementado

Como resultado:
- A demanda **#654** tem `grupo_id` valido, irmãs sao detectadas corretamente
- A demanda **#670** tem `grupo_id = NULL` -- o sistema nao consegue encontrar suas 4 irmãs (que tambem tem `grupo_id = NULL`)

O codigo em `getSiblingCount()` e nos dialogs `ExcluirDemandaIrmaDialog` e `EditarDemandaIrmaDialog` depende 100% do `grupo_id` para encontrar irmãs. Quando ele e NULL, retorna 1 (nenhuma irmã).

## Solucao

A correção envolve duas frentes: **corrigir os dados existentes** e **corrigir o código** para nunca mais criar demandas irmãs sem `grupo_id`.

---

### Parte 1: Corrigir dados existentes (migração SQL)

Executar uma migração que agrupa demandas órfãs (`grupo_id IS NULL` com `semanas_repeticao > 1`) pela combinação de `descricao + responsavel_id + mes + ano`, atribuindo um novo UUID como `grupo_id` para cada grupo.

Essa é a heurística de fallback já documentada na memória do projeto.

---

### Parte 2: Corrigir o código

**2.1 - `getSiblingCount` em `useDemandas.ts` (linha 419-422)**

Problema: conta irmãs apenas na lista filtrada `demandas`, não no banco.

Solução: alterar para que, quando `grupo_id` não está presente mas `semanas_repeticao > 1`, use a heurística `descricao + responsavel_id + mes + ano` para contar irmãs na lista. Isso serve apenas como indicador visual -- a contagem real virá do banco nos dialogs.

**2.2 - `ExcluirDemandaIrmaDialog.tsx` (useEffect linha 57-74)**

Problema: o `useEffect` que busca irmãs no banco depende de `grupoId`. Se `grupoId` é null, não busca nada.

Solução: quando `grupo_id` é null mas `semanas_repeticao > 1`, buscar irmãs no banco pela heurística (`descricao + responsavel_id + mes + ano`). Além disso, atribuir um `grupo_id` novo ao grupo encontrado (corrigir os dados na hora).

**2.3 - `EditarDemandaIrmaDialog.tsx` (useEffect linha 87-106)**

Mesma correção: quando `grupo_id` é null, usar heurística para encontrar e contar irmãs no banco.

**2.4 - `APT.tsx` (linhas 167-185)**

Problema: `deletingSiblings` é calculado a partir do array `demandas` (filtrado). Se filtros estão ativos, irmãs que não estão visíveis não aparecem.

Solução: remover essa lógica local e deixar os dialogs buscarem os siblings diretamente do banco (que já fazem isso). Passar a demanda completa ao dialog para permitir a busca por heurística.

**2.5 - Edge Functions de Rollover (`rollover-demandas` e `auto-rollover`)**

Corrigir para gerar `grupo_id` quando há múltiplas semanas, em vez de sempre definir `null`.

**2.6 - `DuplicarDemandasEmMassaDialog.tsx`**

Corrigir para preservar ou gerar `grupo_id` quando duplicando demandas com repetições.

---

### Parte 3: Detalhes técnicos

A heurística para encontrar irmãs quando `grupo_id` é NULL:

```text
Buscar no banco WHERE:
  descricao = demanda.descricao
  AND responsavel_id = demanda.responsavel_id
  AND mes = demanda.mes
  AND ano = demanda.ano
  AND ativa = true
```

Quando encontrar irmãs por heurística, o sistema vai também **corrigir os dados na hora** (atribuir um `grupo_id` UUID compartilhado a todas as irmãs encontradas), para que futuras operações funcionem normalmente sem precisar da heurística novamente.

---

### Resumo de arquivos a alterar

| Arquivo | Alteração |
|---|---|
| Migração SQL | Atribuir `grupo_id` a 254+ demandas órfãs |
| `src/hooks/useDemandas.ts` | `getSiblingCount` com fallback por heurística |
| `src/components/apt/ExcluirDemandaIrmaDialog.tsx` | Buscar irmãs por heurística quando `grupo_id` é null |
| `src/components/apt/EditarDemandaIrmaDialog.tsx` | Buscar irmãs por heurística quando `grupo_id` é null |
| `src/pages/APT.tsx` | Passar info completa da demanda aos dialogs (descricao, mes, ano) |
| `supabase/functions/rollover-demandas/index.ts` | Gerar `grupo_id` para grupos de demandas |
| `supabase/functions/auto-rollover/index.ts` | Gerar `grupo_id` para grupos de demandas |
| `src/components/apt/DuplicarDemandasEmMassaDialog.tsx` | Preservar/gerar `grupo_id` |

