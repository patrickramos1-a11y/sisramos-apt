

# Autonomia do Colaborador com Fluxo Controlado de Exclusao na APT

## Resumo

Essa evolucao amplia as permissoes do perfil Colaborador (criar, editar e solicitar exclusao de demandas) e implementa um fluxo de exclusao sob aprovacao, onde colaboradores nao apagam demandas diretamente -- apenas solicitam, e gestores/admins aprovam ou recusam.

---

## Etapa 1 -- Banco de Dados

Criar uma nova tabela `solicitacoes_exclusao` para registrar as solicitacoes e decisoes:

```text
solicitacoes_exclusao
---------------------
id                  uuid (PK, default gen_random_uuid())
demanda_id          uuid (FK demandas.id)
grupo_id            uuid (nullable) -- se a exclusao eh do grupo inteiro
tipo_exclusao       text ('unica' | 'todas') -- apenas esta ou todas as repeticoes
solicitante_id      uuid -- user_id de quem pediu
justificativa       text (NOT NULL)
status              text ('pendente' | 'aprovada' | 'recusada') default 'pendente'
decisor_id          uuid (nullable) -- quem aprovou/recusou
justificativa_recusa text (nullable)
created_at          timestamptz default now()
decided_at          timestamptz (nullable)
```

RLS: acesso publico (seguindo o padrao existente do projeto).

---

## Etapa 2 -- Permissoes do Colaborador (Criar e Editar)

Atualmente, os botoes de "Nova Demanda", "Editar" e "Excluir" so aparecem quando `isGestorOrAdmin` eh verdadeiro.

**Arquivos afetados:**
- `src/pages/APT.tsx` -- Mostrar botao "Nova Demanda" tambem para colaboradores
- `src/components/apt/DemandaTableRow.tsx` -- Mostrar menu de acoes (editar/excluir) para colaboradores
- `src/components/apt/DemandaCard.tsx` -- Habilitar swipe de edicao/exclusao para colaboradores
- `src/components/apt/APTGerenciamento.tsx` -- Mostrar acoes de editar/excluir para colaboradores
- `src/components/apt/GerenciamentoLista.tsx` -- Idem

A logica muda de `isGestorOrAdmin` para `true` (todos podem criar/editar), mas a exclusao tera comportamento diferente conforme o perfil.

---

## Etapa 3 -- Fluxo de Exclusao para Colaboradores

### 3.1 Novo Dialog: `SolicitarExclusaoDialog`

Criar `src/components/apt/SolicitarExclusaoDialog.tsx`:
- Campo de justificativa obrigatorio (textarea)
- Texto explicativo sobre aprovacao do gestor
- Se demanda tem repeticoes: pergunta "apenas esta" ou "todas as repeticoes"
- Botoes: "Enviar Solicitacao" e "Cancelar"
- Ao confirmar: insere registro na tabela `solicitacoes_exclusao` com status `pendente`

### 3.2 Logica de Decisao no Click de Excluir

Quando o usuario clica em "Excluir":
- Se `isGestorOrAdmin`: abre o `ExcluirDemandaIrmaDialog` existente (comportamento atual, exclusao direta)
- Se `isColaborador`: abre o novo `SolicitarExclusaoDialog`

Essa logica sera aplicada em:
- `src/pages/APT.tsx`
- `src/components/apt/APTGerenciamento.tsx`
- `src/components/apt/GerenciamentoLista.tsx`

---

## Etapa 4 -- Indicacao Visual "Aguardando Exclusao"

### 4.1 Buscar solicitacoes pendentes

Em cada componente que lista demandas, buscar da tabela `solicitacoes_exclusao` os registros com `status = 'pendente'` e criar um `Set<string>` de `demanda_id`s pendentes.

### 4.2 Exibicao visual

- **Na tabela (DemandaTableRow):** Adicionar tag/badge amarelo-alaranjado "Aguardando exclusao" ao lado da descricao
- **No card mobile (DemandaCard):** Badge similar no header do card
- **No Gerenciamento (Painel e Lista):** Badge similar

### 4.3 Tooltip

Ao passar o mouse sobre a tag, mostrar:
- Justificativa informada
- Data da solicitacao
- Nome do solicitante

---

## Etapa 5 -- Area de Gestao: "Solicitacoes de Exclusao"

### 5.1 Nova subtab no Gerenciamento

Adicionar uma terceira subtab ao menu de gerenciamento: `exclusoes`.

Rota: `/apt?tab=gerenciamento&subtab=exclusoes`

Atualizar o dropdown menu de navegacao em `src/components/layout/APTDropdownMenu.tsx`.

### 5.2 Novo componente: `SolicitacoesExclusaoLista`

Criar `src/components/apt/SolicitacoesExclusaoLista.tsx`:
- Lista todas as solicitacoes com `status = 'pendente'`
- Exibe: descricao da demanda, responsavel, setor, semana, mes, repeticoes, data da solicitacao, justificativa completa, tipo de exclusao (unica/todas)
- Botoes: "Aprovar" e "Recusar"
- Ao aprovar: executa a exclusao real (delete da demanda, ou do grupo) + atualiza solicitacao para `aprovada`
- Ao recusar: atualiza solicitacao para `recusada`, remove o status visual da demanda
- Campo opcional de justificativa de recusa

### 5.3 Indicador de pendencias

Adicionar badge no menu/header do Gerenciamento mostrando quantidade de solicitacoes pendentes (ex: "3 pendentes").

---

## Etapa 6 -- Log e Rastreabilidade

A propria tabela `solicitacoes_exclusao` serve como log completo:
- Quem solicitou (`solicitante_id`)
- Justificativa
- Data da solicitacao (`created_at`)
- Decisao (`status`)
- Quem decidiu (`decisor_id`)
- Data da decisao (`decided_at`)
- Justificativa de recusa (`justificativa_recusa`)

Nao eh necessario tabela de log separada -- os registros nunca sao deletados.

---

## Etapa 7 -- Ajustes no APTDropdownMenu

Atualizar `src/components/layout/APTDropdownMenu.tsx` para incluir a nova subtab "Solicitacoes de Exclusao" dentro do submenu de Gerenciamento (visivel apenas para gestor/admin).

---

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar tabela `solicitacoes_exclusao` + RLS |
| `src/components/apt/SolicitarExclusaoDialog.tsx` | **Novo** -- Dialog de solicitacao para colaborador |
| `src/components/apt/SolicitacoesExclusaoLista.tsx` | **Novo** -- Tela de gestao de solicitacoes |
| `src/pages/APT.tsx` | Liberar criar/editar para colaborador; renderizar nova subtab; redirecionar exclusao |
| `src/components/apt/DemandaTableRow.tsx` | Mostrar acoes para colaborador; badge "Aguardando exclusao" |
| `src/components/apt/DemandaCard.tsx` | Habilitar swipe para colaborador; badge visual |
| `src/components/apt/APTGerenciamento.tsx` | Liberar acoes para colaborador; badge visual |
| `src/components/apt/GerenciamentoLista.tsx` | Liberar acoes para colaborador; badge visual |
| `src/components/layout/APTDropdownMenu.tsx` | Adicionar link para subtab "Exclusoes" |
| `src/hooks/useDemandas.ts` | Buscar solicitacoes pendentes para exibicao visual |

