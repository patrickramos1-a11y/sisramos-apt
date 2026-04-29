## Objetivo

Corrigir os bugs reportados na aba **APT → Execução** onde:
- Excluir uma demanda do grupo escolhendo "Todas (5)" remove só uma (ou nenhuma).
- Editar escolhendo "Todas as 5 demandas do grupo" não propaga para as irmãs.
- Validar se o fluxo de "Solicitar Exclusão" do colaborador também respeita "Todas".

## Diagnóstico já feito

1. RLS está totalmente aberto (`USING true` em SELECT/UPDATE/DELETE/INSERT em `demandas`). Não é problema de permissão.
2. Não existem foreign keys apontando para `demandas` que bloqueariam o DELETE em cascata.
3. A demanda #1473 do print existe no banco com `grupo_id = 5f314f15-...` e tem 5 irmãs reais (números 1473–1477) compartilhando o mesmo `grupo_id`. Então o caso é **bom** (não é órfão).
4. Apesar disso, o usuário diz que ao clicar em "Todas (5)" só uma é removida/editada. Isso indica problema no caminho do **frontend** (estado, race condition ou refetch incorreto), não no SQL em si.

### Causas prováveis identificadas no código

**a) `EditarDemandaIrmaDialog.tsx` (linha 191)**
- O ramo "Todas" só executa `update().eq("grupo_id", demanda.grupo_id)` se `demanda?.grupo_id` for truthy.
- Quando o `grupo_id` é nulo (órfão), o `useEffect` da heurística faz `demanda.grupo_id = newGrupoId` (mutação direta da prop). Essa mutação é frágil: a `prop` pode ser substituída por nova referência ao reabrir, e o estado `editScope === "all"` cai no `else`, atualizando só uma linha sem aviso.
- Solução: armazenar `resolvedGrupoId` em estado local (igual ao `ExcluirDemandaIrmaDialog`) e usar esse valor no submit.

**b) `EditarDemandaIrmaDialog.tsx` "Apenas esta" sobrescrevendo `semana_limite` indevidamente**
- Ao editar "single" sem mudar semanas, cai no `else` final (linha 298) que faz `semana_limite: newWeeks` sobre a linha. Como `formData.semanas_selecionadas` é inicializado com `demanda.semana_limite || [1]`, normalmente fica igual. Mas se o usuário marcar/desmarcar pode reduzir indevidamente a irmã. Vamos garantir que no modo "single" a edição **nunca** mexa nas irmãs, e no modo "all" use sempre o `resolvedGrupoId`.

**c) `ExcluirDemandaIrmaDialog.tsx` aparenta estar correto**
- Usa `resolvedGrupoId` em estado local. Vamos validar com teste real.
- Possível bug: o `onDemandaExcluida()` é chamado dentro de `setTimeout` em "Apenas esta" mas imediatamente em "Todas". Vamos padronizar e adicionar log para detectar erros silenciosos.

**d) Erros silenciosos**
- Vários `await supabase.from("demandas").delete()...` ignoram o `error` retornado (ex.: `SolicitacoesExclusaoLista.handleAprovar` em linhas 122–149, e dentro de `updateSiblingsRepetitions`). Vamos adicionar checagem e log.

**e) `SolicitarExclusaoDialog.tsx`** já resolve `grupo_id` por heurística e envia `tipo_exclusao: "todas"` com `grupo_id` — ramo correto. A aprovação em `SolicitacoesExclusaoLista.handleAprovar` faz `delete().eq("grupo_id", solicitacao.grupo_id)` quando `tipo_exclusao === "todas"`. Funciona se o grupo_id estiver salvo. Vamos confirmar via teste.

## Plano de correção

### 1. Hardenizar `EditarDemandaIrmaDialog.tsx`
- Adicionar estado local `resolvedGrupoId` (igual ao `ExcluirDemandaIrmaDialog`).
- No `useEffect`, após heurística, gravar `setResolvedGrupoId(...)` em vez de mutar a prop.
- No submit:
  - `editScope === "all"` → exigir `resolvedGrupoId`; se ausente, mostrar toast de erro claro e abortar.
  - `editScope === "all"` → atualizar **apenas** `baseUpdateData` em todas as irmãs (sem mexer em `semana_limite`).
  - `editScope === "single"` → atualizar **apenas** a linha clicada; nunca tocar em irmãs, exceto quando o usuário expandiu para mais semanas (criar novas irmãs).
- Capturar `error` de cada chamada Supabase e exibir toast com mensagem real.

### 2. Hardenizar `ExcluirDemandaIrmaDialog.tsx`
- Tratar `error` em `updateSiblingsRepetitions`.
- Logar quantas linhas foram afetadas após `delete()` (usando `.select()` no retorno).
- Se "Todas" não tiver `resolvedGrupoId`, exibir erro claro em vez de silenciosamente fechar.

### 3. Hardenizar `SolicitacoesExclusaoLista.handleAprovar`
- Capturar `error` dos `delete()` e `update()`.
- Validar que `solicitacao.grupo_id` existe antes de excluir "todas"; caso contrário usar fallback heurístico (descricao+responsavel+mes+ano) idêntico ao do dialog de exclusão direta.

### 4. Validar via browser real
- Abrir a preview, ir em APT → Execução.
- Criar uma demanda de teste com 3 repetições.
- Editar com "Todas" → confirmar via banco que as 3 mudaram.
- Excluir com "Todas" → confirmar via banco que sumiram as 3.
- Logar como colaborador (trocar perfil), solicitar exclusão "Todas" → confirmar registro em `solicitacoes_exclusao`.
- Voltar para gestor, aprovar → confirmar via banco que as 3 sumiram.

### 5. Após correções, retestar e remover demanda de teste

## Arquivos que serão modificados

- `src/components/apt/EditarDemandaIrmaDialog.tsx` — adicionar `resolvedGrupoId`, tratar erros, garantir escopo correto.
- `src/components/apt/ExcluirDemandaIrmaDialog.tsx` — tratar erros e contagem real de linhas removidas.
- `src/components/apt/SolicitacoesExclusaoLista.tsx` — validar `grupo_id` na aprovação e tratar erros.

## Resultado esperado

- "Excluir → Todas (N)" remove de fato as N demandas do grupo.
- "Editar → Todas as N demandas do grupo" propaga para as N (sem alterar `semana_limite` de cada uma).
- "Editar → Apenas esta" altera somente a linha clicada.
- Solicitar exclusão "Todas" como colaborador, ao ser aprovada, remove as N.
- Erros do banco passam a ser exibidos via toast em vez de falhar silenciosamente.
