# Revisão de acesso no Supabase — 03/11/2026

## Correções aplicadas em 03/11/2026

Os dois pontos de manutenção abaixo foram tratados no banco remoto, após autorização e testes isolados:

- **Permissões internas:** migration `20261103191822_restrict_internal_trigger_execution` aplicada pelo MCP. EXECUTE foi retirado de PUBLIC, anon e authenticated nas quatro funções de trigger do ERP e, condicionalmente, em `rls_auto_enable`. Dono, implementação, vínculos dos triggers e permissões de serviço foram preservados. Os RPCs e helpers usados pela aplicação mantiveram seus acessos.
- **Histórico:** as quatro versões aplicadas manualmente (`20261031000000`, `20261031010000`, `20261031020000`, `20261031030000`) foram registradas na tabela de migrations, sem executar novamente os scripts. O histórico remoto passou a conter as seis migrations anteriores e a nova migration de segurança. Os arquivos locais usam as mesmas versões.

Antes de reconciliar o histórico, foi comparado o catálogo remoto com um banco isolado reconstruído das seis migrations: nove tabelas, 89 colunas, 61 restrições, 22 índices, 14 políticas, cinco triggers, 22 funções, privilégios de tabela/coluna para anon/authenticated e configuração do bucket de avatar. Todos esses itens coincidiram. A representação de NOT NULL em `pg_constraint` foi desconsiderada por variar entre versões de Postgres; nulabilidade foi comparada separadamente nas colunas. A função adicional de automação está registrada abaixo e não foi recriada.

A reconciliação foi feita por DML administrativo via MCP em `supabase_migrations.schema_migrations`, com lock da tabela, checagem do catálogo e rejeição de alterações concorrentes no histórico. É uma marcação de versões já aplicadas, como o objetivo de `migration repair --status applied`; o CLI não foi usado e nenhum segredo de conexão foi solicitado. Veja [migration repair](https://supabase.com/docs/reference/cli/supabase-migration-repair).

**Validação posterior:** apenas os grants das funções-alvo mudaram no catálogo comparado. O advisor deixou de emitir o aviso de execução anônima de SECURITY DEFINER; os cinco avisos correspondentes para authenticated também desapareceram. A verificação remota de leitura/autorização passou. Em banco isolado, as cinco suítes SQL passaram com e sem `ensure_rls`, incluindo cadastro como serviço de Auth, fluxo entre áreas, histórico, reexecução idempotente da migration e ativação automática de RLS após a revogação de EXECUTE.

A nova migration já está aplicada neste projeto. **Não reenviar os SQLs antigos pelo editor.** Para outras instalações, seguir a ordem normal das migrations.

### Alerta adicional de Auth

Na nova consulta do advisor apareceu `auth_leaked_password_protection`: a proteção contra senhas vazadas está desativada. É uma configuração de Supabase Auth, não uma política SQL. Os MCPs disponíveis nesta sessão não oferecem alteração dessa configuração. Ela deve ser conferida em Authentication → Sign In / Providers → Email. Segundo a [documentação oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), o recurso exige plano Pro ou superior. Não foi contratado plano nem alterada configuração de Auth nesta correção.

Os avisos de RPCs SECURITY DEFINER autenticados necessários, da tabela interna `financial_batches` e de performance continuam exigindo a interpretação descrita abaixo. Não foram removidos índices nem adicionadas políticas públicas para silenciar o advisor.

### Arquivos para manutenção

- Migration: `supabase/migrations/20261103191822_restrict_internal_trigger_execution.sql`.
- Teste com fixtures, somente em ambiente isolado: `supabase/tests/internal_trigger_permissions.sql`.
- Inspeção de catálogo sem registros da aplicação: `supabase/audits/schema_snapshot.sql`.
- Verificação remota somente de leitura, como administrador: `supabase/audits/verify_internal_trigger_access.sql`.

## Resultado da revisão inicial

A revisão do banco remoto pelo MCP não encontrou um desvio de acesso nas políticas e nos testes realizados. A separação de áreas está aplicada no banco, além da interface. Isso não substitui uma auditoria integral de segurança ou testes completos do serviço de autenticação.

Na revisão inicial, nenhum dado, usuário, política, função ou histórico de migration foi alterado. As correções posteriores estão registradas acima. Os testes SQL dessa revisão foram executados em transações `READ ONLY`, encerradas com rollback. Não foram criadas contas fictícias em produção, nem expostos nomes, e-mails, senhas ou tokens no relatório.

## Evidências

- As nove tabelas públicas do ERP estão com RLS ativada. `anon` não tem privilégios de leitura/escrita nessas tabelas.
- Em `demands`, o cliente autenticado pode ler diretamente somente `id` e `status`. Campos comerciais, financeiros e de RH chegam por `get_visible_demands`, que aplica a projeção por cargo. O histórico usa `get_visible_demand_history` com a separação por área.
- Perfis têm leitura do próprio usuário ou por Administração. A única política de atualização exige Administração; não há política que permita a um usuário comum criar, promover ou excluir perfis diretamente.
- A criação de perfil usa o trigger esperado. Os valores padrão continuam sendo COMERCIAL, setor Comercial e situação PENDING. O trigger não copia cargo/situação fornecidos em metadados públicos de cadastro.
- Financeiro, equipe/alocações e mensagens têm leitura por políticas de área. Escritas nessas novas tabelas passam pelos RPCs; o cliente não tem privilégios de INSERT/UPDATE/DELETE.
- `current_profile_role` consulta o perfil ACTIVE pelo `auth.uid()`. Os RPCs de escrita verificam o cargo atual. Parâmetros e metadados de cadastro não substituem essa verificação.
- Os corpos das 22 funções existentes nas migrations locais coincidem com os corpos instalados, desconsiderando espaços. Essa comparação não é uma equivalência completa de todos os objetos do esquema. Há uma função adicional `rls_auto_enable`, vinculada à automação de RLS e ausente das migrations locais.
- As funções examinadas têm `search_path` explícito. `anon` e `authenticated` não podem criar objetos no schema `public`.
- Os triggers de cadastro, validação de demanda e histórico estão presentes. O bucket `profile-avatars` é privado, aceita somente JPEG de até 1 MiB e tem políticas para o caminho fixo do próprio usuário ACTIVE, sem políticas adicionais amplas em `storage.objects`.

## Testes no banco remoto

Existem atualmente contas ACTIVE somente de ADMIN e FINANCEIRO. Sem modificar essas contas, foram simuladas suas identidades no contexto SQL de `authenticated`, verificando também que o teste não permanecia com privilégios de administrador do banco.

Passaram:

1. Resolução do cargo pelo perfil atual.
2. Acesso administrativo aos leitores de Financeiro e Pessoas.
3. Financeiro autorizado ao financeiro e impedido de acessar Pessoas e o canal RH.
4. Ausência de `required_roles`, `assigned_staff_count` e `rh_approved` nos resultados de demandas recebidos pelo Financeiro.
5. Financeiro sem leitura de perfis de terceiros.
6. Leitura direta de `budget_total` negada aos dois cargos de aplicação — o acesso autorizado ocorre pelo RPC.
7. Identidade inexistente, mesmo declarando ADMIN/ACTIVE nos metadados, sem cargo, permissões de área ou resultados de demandas.
8. RPCs de envio de mensagem, criação de conta financeira e gravação de colaborador rejeitando essa identidade antes de qualquer escrita.
9. `anon` impedido de executar o RPC de leitura de demandas.

COMERCIAL, RH, GERENCIA, PENDING e REJECTED foram examinados pelas políticas, pelos corpos das funções e pelos testes isolados já documentados em `ROUTING_ACCESS.md`. Não foram criadas identidades desses tipos no banco remoto. Os testes SQL não reproduzem login HTTP, renovação/revogação de JWT, confirmação de e-mail ou upload/download completo do serviço Storage.

## Pontos encontrados na revisão inicial

Os dois primeiros itens foram resolvidos conforme a seção de correções acima. Os parágrafos a seguir preservam o diagnóstico original.

### Privilégios de execução de funções internas

O advisor aponta execução permitida a `anon` em cinco funções SECURITY DEFINER internas: `create_profile_for_new_auth_user`, `guard_demand_insert`, `guard_demand_update`, `write_demand_history` e `rls_auto_enable`.

As quatro primeiras retornam `trigger`, e a última retorna `event_trigger`. Isso não equivale a um RPC comum de leitura/escrita. Uma chamada direta de `guard_demand_insert` como `anon` foi rejeitada pelo Postgres porque uma função de trigger não pode ser chamada dessa forma. Não foi demonstrada uma forma de contornar a autorização por esse alerta.

Ainda assim, recomenda-se retirar EXECUTE de PUBLIC, anon e authenticated nessas funções internas em uma migration específica, depois de validar os triggers e o cadastro em ambiente isolado. Não revogar indiscriminadamente todas as funções: os RPCs usados pela aplicação e os helpers das políticas precisam continuar acessíveis. A função adicional de automação deve ter sua origem/ownership documentados antes de mudanças.

Referências: [alerta sobre execução anônima de SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) e [privilégios de funções](https://supabase.com/docs/guides/database/functions#function-privileges).

### Histórico incompleto de migrations

O Supabase registra somente `20261027000000_initial_schema` e `20261028000000_role_scoped_demand_access`. As estruturas, funções e políticas de avatars, comunicação, equipe e financeiro estão presentes, coerentes com a aplicação manual dos SQLs pelo editor.

Isso é uma divergência do registro de migrations, não uma indicação de que essas funcionalidades estejam ausentes. Não reexecutar os scripts CREATE TABLE para tentar resolver. Antes de adotar deploy automatizado de migrations, comparar integralmente os objetos e reconciliar o histórico com as versões realmente aplicadas.

### Alertas que exigem interpretação

- `financial_batches` com RLS e sem políticas é intencional: tabela interna de idempotência, sem privilégios do cliente, acessada pelo RPC autorizado. Não criar política pública para remover esse aviso. [Explicação do advisor](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- O aviso de SECURITY DEFINER executável por `authenticated` também inclui RPCs e helpers que precisam desse acesso. A revisão dos corpos confirmou as verificações de cargo/situação; remover EXECUTE de todos quebraria funcionalidades.
- O advisor de performance apontou oito FKs sem índices de cobertura. É uma oportunidade de melhoria conforme o volume cresça, não evidência de acesso indevido. [Referência](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).
- O advisor também apontou oito índices ainda sem uso. Não removê-los automaticamente: eles cobrem consultas e restrições de módulos com pouco ou nenhum registro.
- Nos logs das últimas 24 horas, seis warnings de Auth tinham a mensagem genérica `request completed`. Essa mensagem agregada não permite concluir a causa nem representa, por si só, uma falha de autorização. Não foi feita inspeção de payloads pessoais dos logs.

## Próximas validações de publicação

Conferir login/logout e navegação no preview com as contas disponíveis. Testar demais cargos em ambiente isolado, sem mudar o cargo de contas reais para produzir dados de teste. Qualquer ajuste futuro de permissões deve entrar em uma nova migration e ser testado antes da aplicação remota.
