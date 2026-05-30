# Prompt Para Lovable: Verificar E Aplicar Migrations Supabase

Contexto: o app SISRAMOS APT usa Supabase e Vercel. Algumas funcionalidades dependem de migrations que podem não estar aplicadas no banco de produção. Preciso que você verifique o schema real do Supabase e aplique apenas o que estiver faltando, com segurança/idempotência.

## Objetivo

Resolver divergências de produção relacionadas a:

- configuração global dos Momentos APT por mês/ano;
- ações configuráveis por setor, especialmente WhatsApp;
- tags globais vinculadas às demandas.
- demandas persistentes/rotinas APT por setor, com ocorrências por data e resumo semanal.

## Arquivos de referência no repositório

Verifique o conteúdo destes arquivos e compare com o banco Supabase:

- `supabase/migrations/20260523120000_apt_momentos_config.sql`
- `supabase/migrations/20260525152000_fix_apt_momentos_config_policies.sql`
- migrations relacionadas a `setores.acoes`, se existirem;
- migrations relacionadas a `tags` e `demanda_tags`, se existirem;
- `supabase/migrations/20260530120000_apt_rotinas_persistentes.sql`
- `src/hooks/useAptMomentos.ts`
- `src/hooks/useAptRotinas.ts`
- `src/pages/Execucao.tsx`
- componentes/telas de configuração de setores que salvam `acoes`.

## O que deve existir no banco

### 1. Tabela `apt_momentos_config`

Deve existir uma tabela pública `apt_momentos_config` com, no mínimo:

- `id`
- `mes`
- `ano`
- `momentos` em `jsonb`
- `momento_ativo` aceitando `null`
- `created_at`
- `updated_at`

Requisitos:

- constraint/índice único para `(mes, ano)`;
- RLS habilitado;
- políticas permitindo leitura para usuários autenticados;
- políticas permitindo insert/update/delete para gestores/admins, conforme o modelo de permissões já usado no projeto;
- trigger/função de `updated_at`, se o padrão do projeto usar isso.

Problema que precisa ser resolvido:

- Hoje, quando a configuração salva apenas localmente no navegador, outros navegadores/usuários não enxergam os Momentos APT. A configuração precisa salvar de fato no Supabase.

### 2. Coluna `setores.acoes`

Na tabela `setores`, deve existir a coluna:

- `acoes jsonb not null default '{}'::jsonb`

Problema observado:

- Ao salvar ação WhatsApp no setor, aparece erro: `Could not find the 'acoes' column of 'setores' in the schema cache`.

Após aplicar a coluna:

- forçar reload do schema cache se necessário;
- confirmar que o update de setor com `acoes` funciona;
- manter compatibilidade com setores que não têm ação configurada.

Formato esperado para WhatsApp:

```json
{
  "whatsapp": {
    "enabled": true,
    "phone": "91984299440",
    "messageTemplate": "Patrick, estou com uma dúvida sobre a demanda:\n\n*{{descricao}}*\n\nNúmero: #{{numero}}\nSetor: {{setor}}\nResponsável: {{responsavel}}\nSemanas: {{semanas}}\nMês/Ano: {{mes}}/{{ano}}\n\n{{observacoes}}"
  }
}
```

### 3. Tags

Se ainda não existir, criar:

- tabela `tags` com `id`, `nome`, `slug`, `cor`, `created_at`, `updated_at`;
- tabela `demanda_tags` com `demanda_id`, `tag_id`;
- unicidade por `tags.slug`;
- unicidade por par `(demanda_id, tag_id)`;
- foreign keys para `demandas` e `tags`;
- RLS compatível com o restante do sistema.

Requisitos funcionais:

- tags são globais;
- tag nova digitada vira catálogo global;
- edição de tags em demanda repetida deve sincronizar no grupo quando o front solicitar;
- ao copiar demandas para outro mês, vínculos de tags devem ser copiados para as novas demandas.

## Cuidados

- Não recriar tabelas que já existem.
- Não apagar dados existentes.
- Usar SQL idempotente sempre que possível (`create table if not exists`, `alter table ... add column if not exists`, `create policy` com verificação prévia quando necessário).
- Após aplicar, validar se o app consegue:
  - salvar Momentos APT e enxergar em navegador anônimo/outro usuário;
  - salvar ação WhatsApp no setor `Ac. Processos`;
- exibir botão WhatsApp nas demandas desse setor;
- criar/editar tags e filtrar por tags.

### 4. Demandas Persistentes / Rotinas APT

Aplicar a migration:

- `supabase/migrations/20260530120000_apt_rotinas_persistentes.sql`

Ela cria a base paralela para rotinas persistentes, sem alterar a tabela atual `demandas`.

Devem existir as tabelas:

- `apt_rotina_modelos`
- `apt_rotina_ocorrencias`
- `apt_rotina_avaliacoes`

Requisitos principais:

- `apt_rotina_modelos` guarda os modelos configurados por setor;
- `apt_rotina_ocorrencias` guarda cada ocorrência por data;
- `apt_rotina_avaliacoes` guarda o resumo por mês/ano/momento/semanas agrupadas;
- RLS habilitado nas três tabelas;
- leitura para usuários autenticados conforme permissão;
- escrita de modelos/avaliações por gestor/admin;
- colaborador pode atualizar as próprias ocorrências;
- índice único em `(modelo_id, data)` nas ocorrências, para geração idempotente;
- índice único em `(modelo_id, responsavel_id, mes, ano, momento)` nas avaliações;
- função `apt_rotina_marcar_atrasadas()` para marcar pendências vencidas como `nao_realizado`.

Após aplicar a migration:

- testar a tela `Configurações > Setores > Rotinas persistentes`;
- criar uma rotina no setor `Limpeza`;
- gerar ocorrências do mês;
- abrir `/` ou `/execucao` e verificar se a seção “Rotinas persistentes do momento” aparece;
- marcar uma ocorrência como feita/não feita;
- calcular resumo do momento;
- aprovar/reprovar resumo do gestor.

Cron/job recomendado:

- rodar diariamente após 00:10 no fuso `America/Sao_Paulo`;
- executar `select public.apt_rotina_marcar_atrasadas();`;
- o job é idempotente e não deve duplicar ocorrências.

## Entrega esperada

Depois de aplicar, publicar o projeto e me informar:

- quais objetos do banco foram criados/alterados;
- se havia algo já existente;
- se houve algum ajuste de política/RLS;
- se o schema cache foi atualizado;
- URL do deploy final.
