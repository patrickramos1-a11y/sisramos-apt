

# Correção: Botão Momento APT não persiste alterações

## Causa Raiz

A política de segurança (RLS) da tabela `momento_apt_settings` exige autenticação real do banco (`auth.uid()`) para permitir atualizações. Como o sistema usa seleção de usuário via localStorage (sem login real no banco), `auth.uid()` é sempre nulo, e a política bloqueia silenciosamente o UPDATE -- o banco retorna "sucesso" (204) mas nenhuma linha é de fato alterada.

Isso explica por que o GET após o PATCH continua retornando `bloqueado: true`: a escrita nunca aconteceu.

## Solução

Alinhar a política RLS de `momento_apt_settings` com o mesmo padrão usado nas demais tabelas do sistema (como `demandas`), que permitem operações públicas.

### Alteração no banco de dados

Remover a política restritiva atual e criar políticas permissivas para INSERT, UPDATE e DELETE, seguindo o padrão já existente:

- **Remover**: política "Gestors and admins can manage momento_apt_settings"
- **Criar**: 3 novas políticas com `true` (inserção, atualização e exclusão públicas)

A política de leitura ("Everyone can read") já está correta e permanece inalterada.

A validação de permissão (apenas gestores podem alterar) continua sendo feita no código frontend pelo hook `useMomentoAPT.ts`, que já verifica `isGestorOrAdmin` antes de executar qualquer operação.

### Detalhes técnicos

```sql
DROP POLICY "Gestors and admins can manage momento_apt_settings" ON momento_apt_settings;
CREATE POLICY "Inserção pública" ON momento_apt_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualização pública" ON momento_apt_settings FOR UPDATE USING (true);
CREATE POLICY "Exclusão pública" ON momento_apt_settings FOR DELETE USING (true);
```

Nenhuma alteração de código é necessária -- apenas a correção da política no banco.

