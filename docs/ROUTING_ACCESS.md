# Rotas e controle de acesso

## Diagnóstico e decisões

O projeto usa React 18, TypeScript e Vite. Antes desta alteração, os módulos eram escolhidos por estado dentro de `App.tsx`; a URL não identificava a tela. A apresentação, o login e o cadastro usavam fragmentos (`#/entrar`). Não havia biblioteca de roteamento instalada.

A aplicação publicada usa Supabase Auth e solicita dados diretamente ao Postgres por PostgREST/RPC. O diretório `backend` contém uma API Express com JWT e repositório em memória, que não é chamada pelo frontend atual. Essa API foi mantida, sem substituir a autenticação Supabase.

Os cargos existentes são ADMIN, COMERCIAL, FINANCEIRO, RH e GERENCIA. O setor (`department`) é descritivo: não concede acesso. Cadastros PENDING ou REJECTED não entram no sistema. Não foram criados novos perfis nem módulos fictícios de usuários ou segurança.

A implementação foi dividida em: definição das rotas e política comum; integração do menu e telas; acompanhamento da sessão; revisão do backend e do SQL existente; testes e documentação. A identidade visual e as operações dos setores foram preservadas. Nenhuma dependência de produção foi adicionada.

## Endereços e permissões

| Endereço | Tela | Cargos ativos permitidos |
|---|---|---|
| `/` | Apresentação | Público; autenticados seguem para dashboard |
| `/entrar` | Login | Público |
| `/cadastro` | Solicitação de cadastro | Público |
| `/dashboard` | Visão geral | Todos os cinco cargos |
| `/demandas` | Demandas | Todos os cinco cargos |
| `/mensagens` | Conversas | Todos os cinco cargos; canais limitados no banco |
| `/comercial` | Comercial | ADMIN, COMERCIAL |
| `/financeiro` | Financeiro | ADMIN, FINANCEIRO, GERENCIA |
| `/pessoas` | Pessoas & RH | ADMIN, RH, GERENCIA |
| `/cadastros-pendentes` | Cadastros pendentes | ADMIN |
| `/perfil` | Meu perfil | Todos os cinco cargos |

Gerência continua consultando Financeiro e Pessoas & RH sem as ações de alteração desses módulos. O menu Comercial mantém a permissão anterior; Gerência continua podendo consultar os dados comerciais na visão geral e em Demandas.

Sem sessão ativa, abrir um módulo redireciona para `/entrar?retorno=...`. Após login, somente um endereço conhecido pode ser usado como retorno. A permissão é conferida novamente no destino. Um usuário autenticado sem acesso recebe “Acesso restrito”, sem montar o módulo. Uma URL inexistente mostra “Página não encontrada” para autenticados. Logout bem-sucedido encerra a sessão e segue para `/entrar`; uma falha é exibida sem fingir que o logout funcionou.

A sessão é verificada ao abrir a aplicação, nos eventos de autenticação e ao voltar à aba/janela. Alterações de cargo e saída da conta limpam os dados privados e invalidam respostas de consultas antigas. Revogações não têm uma assinatura realtime própria: se a conta for alterada remotamente enquanto a aba permanece em primeiro plano, a interface será revalidada no próximo evento de sessão/foco. O banco verifica as permissões em cada nova operação independentemente disso.

## Onde mexer manualmente

| Arquivo | Responsabilidade |
|---|---|
| `frontend/src/routing/routes.ts` | Caminhos, títulos e cargos permitidos por módulo; decisões de acesso |
| `frontend/src/routing/navigation.ts` | Ordem, grupos e ícones do menu, filtrados pela mesma política |
| `frontend/src/routing/browser.ts` | History API, Voltar/Avançar e compatibilidade dos links antigos |
| `frontend/src/routing/Link.tsx` | Links internos; preserva abrir em outra aba e teclas modificadoras |
| `frontend/src/hooks/useAuthSession.ts` | Sessão, revalidação e descarte de respostas antigas |
| `frontend/src/App.tsx` | Composição das telas, ações e limpeza dos dados da conta |
| `frontend/src/services/api.ts` | Login/cadastro/perfil e acesso às demandas no Supabase |
| `frontend/src/components/RouteFeedback.tsx` | Avisos de rota restrita/inexistente |
| `frontend/vercel.json` | Fallback para acessar ou recarregar URLs diretamente |
| `backend/src/middlewares/auth.ts` | Validação do JWT e consulta do usuário atual na API Express |
| `backend/src/services/accessPolicy.ts` | Campos e histórico retornados por cargo pela API Express |
| `supabase/migrations/` | Políticas RLS, validação e RPCs reais do banco |

Para criar uma nova aba, defina a página e a permissão em `routes.ts`, inclua o ícone e a posição em `navigation.ts` e componha a tela em `App.tsx`. Proteja também a API/RPC/tabela correspondente no servidor/banco. Não use o setor, parâmetros da URL ou metadados enviados no cadastro para conceder permissões. Mudanças de banco entram em uma nova migration, sem editar migrations já aplicadas.

## Proteção dos dados

As migrations existentes já autorizam pelo perfil ACTIVE armazenado no banco. Demandas são lidas por `get_visible_demands`; leitura direta dos campos privados está revogada. RH não recebe orçamento. Campos financeiros só chegam a ADMIN, GERENCIA e FINANCEIRO; campos de alocação só a ADMIN, GERENCIA e RH. O histórico segue a mesma separação de áreas.

Contas financeiras, equipe/alocações e canais de conversa usam suas políticas RLS e RPCs existentes. Os RPCs derivam o autor da sessão. A tabela de perfis impede autopromoção por usuários comuns. O armazenamento de avatar continua privado e limitado ao caminho da própria conta ativa.

Na API Express legada, o token passa a identificar a conta; cargo, setor e situação vêm do usuário atual a cada requisição. Tokens de contas inexistentes/inativas são rejeitados e campos privados são filtrados também nas respostas de alterações. O repositório dessa API continua em memória: não o confunda com o banco Supabase de produção.

## Validação

Na raiz do repositório:

```sh
npm run build
npm run lint
npm run test:access
```

O último comando executa a matriz de rotas dos cinco cargos e um teste HTTP da API Express em porta local temporária. As contas e a chave do teste são geradas somente para o processo de teste. A suíte verifica login, tokens inválidos, cargo falso no token, conta inativa, usuário atual, leitura por campo/área, bloqueio de alterações e o fluxo Comercial → Financeiro → RH.

Os scripts em `supabase/tests/` devem ser executados somente em banco de teste isolado após as migrations. Usam transações com rollback. `access_boundaries.sql` verifica os cinco cargos, cadastros pendentes/rejeitados, metadados de cadastro falsos, autopromoção, leitura direta proibida e acesso anônimo. Os demais scripts cobrem Financeiro, RH e comunicação.

Nesta implementação, todas as seis migrations e as quatro suítes SQL passaram em PostgreSQL isolado com PGlite, com schemas mínimos de Auth/Storage para os testes. Na etapa inicial não foi feita verificação de contas reais no Supabase de produção. Depois da conexão do MCP, a revisão remota somente de leitura foi registrada em [SUPABASE_ACCESS_AUDIT.md](SUPABASE_ACCESS_AUDIT.md). As correções remotas posteriores, autorizadas separadamente, também estão registradas nesse relatório. O teste SQL não equivale a validar o serviço de autenticação/Storage hospedado.

No Chrome, com sessão e respostas simuladas, foram verificados os cinco menus, destinos permitidos e negados, ausência de requisições do módulo proibido, navegação sem reload, histórico Voltar/Avançar, login com retorno, logout, expiração, troca de cargo e larguras de 375/1440 px nos dois temas, contraste do menu, cadastro pendente e abertura do tour. Também foram conferidos os links diretos e o recarregamento da entrada real sem sessão. Não foram usados usuários ou senhas reais.

## Publicação

O roteamento não exige SQL novo no Supabase. A correção de segurança posterior usa `20261103191822_restrict_internal_trigger_execution.sql`, já aplicada no projeto remoto e descrita em `SUPABASE_ACCESS_AUDIT.md`. Os arquivos de teste SQL não são migrations de produção.

O projeto Vercel deve usar Root Directory `frontend`, build `npm run build` e saída `dist`. O fallback em `frontend/vercel.json` envia URLs da interface para `index.html`, preservando `/assets` e `/api`. Isso é necessário para recarregar `/financeiro`, por exemplo. Veja a [documentação oficial de Vite no Vercel](https://vercel.com/docs/frameworks/frontend/vite) e a [sintaxe de rewrites](https://vercel.com/docs/project-configuration/vercel-json).

Confira o preview com login real antes de promover: login/logout, recarregamento de um módulo e uma conta de cada cargo disponível. Não foi publicado um deployment nesta tarefa. Siga `feature/*` → PR para `develop` → PR para `main`, conforme `IA/security.md`.
