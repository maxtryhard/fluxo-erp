# Fluxo — Gestão integrada

Sistema ERP do TCC com frontend React/TypeScript e Supabase Auth/Postgres. Comercial, Financeiro e RH trabalham na mesma demanda, com políticas de acesso e histórico no banco.

## Estrutura

- `frontend/`: interface web, login, perfil, painel, demandas e filas por área.
- `backend/`: API Express/TypeScript mantida para serviços futuros; a interface atual acessa o Supabase com Auth e RLS.
- `supabase/migrations/`: esquema Postgres, gatilhos de histórico e políticas RLS.
- `IA/`: diretrizes do projeto e regras de segurança.

## Desenvolvimento local

1. Instale Node.js 20 ou superior.
2. Instale as dependências na raiz:

   ```sh
   npm install
   ```

3. Crie `frontend/.env.local` a partir de `frontend/.env.example` e preencha URL do projeto e chave publicável do Supabase. A chave publicável é apropriada ao frontend; nunca coloque chaves `service_role`/secret no cliente.
4. No Supabase, abra **SQL Editor** e execute as migrations em ordem: `supabase/migrations/20261027000000_initial_schema.sql` e `supabase/migrations/20261028000000_role_scoped_demand_access.sql`. Se o esquema inicial já estiver instalado, execute somente a segunda migration. Habilite a confirmação de e-mail conforme a política do projeto.
5. Crie a primeira conta pelo formulário do site e confirme o e-mail. No SQL Editor do Supabase, promova somente essa conta inicial substituindo o e-mail no comando abaixo:

   ```sql
   update public.profiles
   set role = 'ADMIN', department = 'Diretoria', status = 'ACTIVE'
   where lower(email) = lower('email-do-administrador@empresa.com')
     and status = 'PENDING'
   returning id, email, role, status;
   ```

   Confira o registro retornado antes de prosseguir. Depois do bootstrap, administradores aprovam solicitações e atribuem perfis pela tela **Cadastros pendentes**. Não promova cadastros públicos a administrador. Nenhuma migration concede privilégios automaticamente por correspondência de e-mail.

   Se uma versão anterior da migration já foi aplicada, confira os administradores existentes e valide a identidade de cada conta antes de alterar permissões:

   ```sql
   select id, email, role, status
   from public.profiles
   where role = 'ADMIN';
   ```

   Não rebaixe automaticamente nenhuma conta existente: confirme primeiro se ela é o administrador legítimo do projeto.

6. Inicie o frontend:

   ```sh
   npm run dev:frontend
   ```

   O site fica em `http://localhost:5173`. O formulário cria uma conta Supabase pendente; RLS impede que ela veja dados até a aprovação por um administrador.

## Validação

```sh
npm run build
npm run lint
npm audit
```

## Segurança e configuração

RLS é a barreira de autorização do banco; a chave publicável não concede acesso sem políticas. As migrations devem ser aplicadas no projeto Supabase antes de usar login e telas do ERP. Demandas e histórico são lidos por funções SQL que retornam somente os campos permitidos para cada perfil; o acesso direto às colunas financeiras e de RH é revogado para usuários autenticados. Comercial vê dados da demanda e orçamento; Financeiro vê também os dados financeiros; RH vê os dados de alocação; Gerência e Administração veem todos os campos. O histórico é filtrado por área, preservando para Financeiro e RH os eventos comerciais necessários ao fluxo. A conta administrativa inicial é promovida manualmente no SQL Editor porque não existe usuário administrador confiável antes desse bootstrap. O frontend não usa nem deve receber uma chave `service_role`.

Os registros de auditoria são escritos por gatilhos SQL e não podem ser criados/alterados pelo cliente autenticado. Rate limiting e mitigação de DDoS em produção ainda dependem da infraestrutura de borda.
