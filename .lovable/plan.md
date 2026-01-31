
# Plano de Implementação: Backlog de Produto

## Visao Geral

Implementar um modulo completo de **Backlog de Produto** seguindo boas praticas de Scrum/Agile, com foco em planejamento estruturado, controle de evolucao, rastreabilidade completa e apoio a tomada de decisao.

---

## Estrutura de Navegacao

O Backlog sera acessivel atraves de um novo item no menu principal:
- **Backlog** (novo item no header, ao lado de Checklist)
  - Subpaginas internas: **Painel** (indicadores) e **Lista** (itens detalhados)

---

## Fase 1: Estrutura de Banco de Dados

### Tabelas Principais

**1. backlog_projetos** - Cadastro de projetos/produtos
```text
- id (uuid, PK)
- nome (text) - Ex: "Projeto A", "Sistema X"
- descricao (text, nullable)
- ativo (boolean, default true)
- created_at, updated_at (timestamps)
```

**2. backlog_modulos** - Modulos por projeto
```text
- id (uuid, PK)
- projeto_id (uuid, FK -> backlog_projetos)
- nome (text) - Ex: "APT", "Checklist", "Dashboard"
- created_at (timestamp)
```

**3. backlog_items** - Itens do backlog
```text
- id (uuid, PK)
- numero (serial) - Identificacao sequencial
- titulo (text) - Titulo curto e objetivo
- projeto_id (uuid, FK -> backlog_projetos)
- categoria (enum) - Nova Funcionalidade, Melhoria, Correcao, etc.
- descricao_detalhada (text) - Rich Text/Markdown
- status (enum) - Ideia, Em Analise, Refinado, etc.
- prioridade (enum) - Alta, Media, Baixa
- impacto_esperado (enum) - Baixo, Medio, Alto
- estimativa_esforco (enum) - Pequeno, Medio, Grande
- dependente_de_creditos (boolean)
- responsavel_produto_id (uuid, FK -> profiles)
- responsavel_tecnico_id (uuid, nullable)
- data_inicio_implementacao (date, nullable)
- data_conclusao (date, nullable)
- data_lancamento (date, nullable)
- created_at, updated_at (timestamps)
```

**4. backlog_item_modulos** - Relacao N:N entre items e modulos
```text
- id (uuid, PK)
- backlog_item_id (uuid, FK)
- modulo_id (uuid, FK)
```

**5. backlog_anexos** - Anexos permanentes
```text
- id (uuid, PK)
- backlog_item_id (uuid, FK)
- nome_arquivo (text)
- url (text) - URL do storage
- tipo_arquivo (text) - mime type
- tamanho (integer) - bytes
- uploaded_by (uuid, FK -> profiles)
- created_at (timestamp)
```

**6. backlog_changelog** - Historico automatico imutavel
```text
- id (uuid, PK)
- backlog_item_id (uuid, FK)
- usuario_id (uuid, FK -> profiles)
- acao (text) - Tipo de evento
- dados_anteriores (jsonb, nullable)
- dados_novos (jsonb, nullable)
- observacao (text, nullable)
- created_at (timestamp)
```

**7. backlog_registros_implementacao** - Registros de ajustes
```text
- id (uuid, PK)
- backlog_item_id (uuid, FK)
- descricao (text)
- responsavel_id (uuid, FK -> profiles)
- status (enum) - Executado, Nao executado
- data (date)
- created_at (timestamp)
```

**8. backlog_validacoes** - Confirmacao de entrega
```text
- id (uuid, PK)
- backlog_item_id (uuid, FK)
- validado (boolean)
- tipo_validacao (enum) - Teste funcional, Visual, Tecnica, Regra de negocio
- validado_por (uuid, FK -> profiles)
- data_validacao (timestamp)
- observacoes (text, nullable)
- created_at (timestamp)
```

### ENUMs a Criar

```sql
-- Categorias
CREATE TYPE backlog_categoria AS ENUM (
  'nova_funcionalidade',
  'melhoria',
  'correcao_bug',
  'ajuste_tecnico',
  'ux_ui',
  'relatorios',
  'seguranca',
  'infraestrutura'
);

-- Status do Pipeline
CREATE TYPE backlog_status AS ENUM (
  'ideia',
  'em_analise',
  'refinado',
  'aguardando_recursos',
  'em_implementacao',
  'em_testes',
  'implementado',
  'lancado',
  'validado',
  'arquivado'
);

-- Prioridade
CREATE TYPE backlog_prioridade AS ENUM ('alta', 'media', 'baixa');

-- Impacto
CREATE TYPE backlog_impacto AS ENUM ('baixo', 'medio', 'alto');

-- Esforco
CREATE TYPE backlog_esforco AS ENUM ('pequeno', 'medio', 'grande');

-- Status de implementacao
CREATE TYPE backlog_registro_status AS ENUM ('executado', 'nao_executado');

-- Tipo de validacao
CREATE TYPE backlog_tipo_validacao AS ENUM (
  'teste_funcional',
  'validacao_visual',
  'validacao_tecnica',
  'regra_negocio'
);
```

### Storage Bucket

Criar bucket `backlog-anexos` para armazenar arquivos:
- Imagens, PDFs, planilhas
- Politicas RLS para usuarios autenticados

---

## Fase 2: Componentes e Paginas

### Arquivos a Criar

```text
src/pages/
  Backlog.tsx                    # Pagina principal com tabs Painel/Lista

src/components/backlog/
  BacklogPainel.tsx              # Dashboard com indicadores
  BacklogLista.tsx               # Lista completa com filtros
  BacklogFilters.tsx             # Filtros fixos
  BacklogItemCard.tsx            # Card de item na lista
  NovoBacklogItemDialog.tsx      # Criacao de novo item
  BacklogItemDetailDialog.tsx    # Visualizacao/edicao completa
  BacklogChangelogTimeline.tsx   # Timeline do historico
  BacklogAnexosSection.tsx       # Upload e gestao de anexos
  BacklogValidacaoSection.tsx    # Confirmacao de entrega
  BacklogRegistrosSection.tsx    # Registros de implementacao
  BacklogProjetosManagement.tsx  # CRUD de projetos
  BacklogModulosManagement.tsx   # CRUD de modulos por projeto

src/hooks/
  useBacklog.ts                  # Hook principal para dados do backlog
  useBacklogChangelog.ts         # Hook para historico automatico
```

### Estrutura da Pagina Backlog

**Painel (Dashboard)**
- Cards de resumo: Total, Aguardando recursos, Em implementacao, Implementados, Lancados, Validados
- Graficos de distribuicao por status, categoria e prioridade
- Lista rapida de itens em destaque

**Lista (Detalhada)**
- Bloco de filtros FIXO no topo:
  - Projeto
  - Categoria
  - Status
  - Prioridade
  - Dependente de creditos
  - Busca por texto
- Tabela com ordenacao
- Acoes: Ver detalhes, Editar, Arquivar

### Dialog de Novo Item

Campos organizados em sections:
1. **Identificacao**: Titulo, Projeto
2. **Classificacao**: Categoria, Modulos impactados (multi-select)
3. **Descricao**: FormattedTextarea com placeholder estruturado
4. **Planejamento**: Prioridade, Impacto, Esforco, Depende de creditos
5. **Responsabilidade**: Responsavel produto, Responsavel tecnico

### Dialog de Detalhes

Tabs internas:
1. **Informacoes**: Todos os campos editaveis
2. **Anexos**: Upload e listagem de arquivos
3. **Implementacao**: Registros de ajustes
4. **Validacao**: Confirmacao de entrega
5. **Historico**: Timeline do changelog

---

## Fase 3: Logica de Negocios

### Changelog Automatico

Trigger de banco para registrar:
- Criacao do item
- Mudanca de status
- Alteracao de prioridade
- Adicao/remocao de anexos
- Alteracao de datas
- Validacao
- Arquivamento

Cada registro inclui: data/hora, usuario, acao, observacao

### Regra de Encerramento

Item so pode ter status "Validado" se:
- Existe pelo menos 1 registro em `backlog_validacoes` com `validado = true`
- Validacao front-end antes de permitir mudanca

### Permissoes

- **Admin/Gestor**: CRUD completo
- **Colaborador**: Somente visualizacao (se implementado acesso)

---

## Fase 4: Integracao na Navegacao

### Atualizacoes no AppLayout

Adicionar item "Backlog" no menu principal:
- Dropdown com Painel e Lista
- Seguir mesmo padrao do APTDropdownMenu

### Rota no App.tsx

```tsx
<Route
  path="/backlog"
  element={
    <ProtectedRoute>
      <Backlog />
    </ProtectedRoute>
  }
/>
```

---

## Resumo de Arquivos

| Acao  | Arquivo |
|-------|---------|
| Criar | `src/pages/Backlog.tsx` |
| Criar | `src/components/backlog/BacklogPainel.tsx` |
| Criar | `src/components/backlog/BacklogLista.tsx` |
| Criar | `src/components/backlog/BacklogFilters.tsx` |
| Criar | `src/components/backlog/BacklogItemCard.tsx` |
| Criar | `src/components/backlog/NovoBacklogItemDialog.tsx` |
| Criar | `src/components/backlog/BacklogItemDetailDialog.tsx` |
| Criar | `src/components/backlog/BacklogChangelogTimeline.tsx` |
| Criar | `src/components/backlog/BacklogAnexosSection.tsx` |
| Criar | `src/components/backlog/BacklogValidacaoSection.tsx` |
| Criar | `src/components/backlog/BacklogRegistrosSection.tsx` |
| Criar | `src/components/backlog/BacklogProjetosManagement.tsx` |
| Criar | `src/components/backlog/BacklogModulosManagement.tsx` |
| Criar | `src/hooks/useBacklog.ts` |
| Criar | `src/hooks/useBacklogChangelog.ts` |
| Editar | `src/App.tsx` - adicionar rota /backlog |
| Editar | `src/components/layout/AppLayout.tsx` - adicionar menu Backlog |
| Criar | Migracao SQL com 8 tabelas + ENUMs + RLS + Storage |

---

## Estimativa de Complexidade

- **Banco de dados**: 8 tabelas, 6 ENUMs, triggers para changelog
- **Frontend**: ~15 novos componentes
- **Hooks**: 2 hooks especializados
- **Integracao**: Navegacao e rotas

Esta funcionalidade sera reutilizavel em qualquer projeto, mantendo padrao, governanca e maturidade conforme especificado.
