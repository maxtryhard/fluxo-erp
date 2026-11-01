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

## Fotos de perfil

Para habilitar **Alterar foto**, execute também `supabase/migrations/20261031000000_profile_avatars.sql` no SQL Editor do Supabase, após as migrations anteriores. A migration cria o bucket privado `profile-avatars` e políticas que permitem a contas ativas ler, inserir e substituir apenas o próprio avatar. Não é necessário configurar chaves secretas no frontend.

O perfil compacto abre pelo usuário no cabeçalho e fecha com Escape, botão de fechar ou clique fora. A página completa continua acessível na barra horizontal de navegação. O upload aceita JPG, PNG e WebP de até 5 MB, aplica recorte central e gera um JPEG de 384 × 384 px. A foto é salva na conta e reaparece ao entrar novamente. Sem a migration, o perfil abre normalmente e a tentativa de upload mostra uma mensagem de erro; nenhuma foto é marcada como salva.

## Comunicação entre setores e pareceres

Execute `supabase/migrations/20261031010000_sector_communication.sql` no SQL Editor do Supabase após as migrations anteriores para habilitar:

- **Conversas** na navegação: comunicação compartilhada entre setores e canais restritos de Financeiro/RH.
- **Dentro das demandas:** expanda os detalhes para registrar mensagens, análises e pendências/dúvidas vinculadas à demanda.
- **Revisão:** Comercial, Financeiro e RH registram um parecer antes de encaminhar; o parecer e a transição são gravados na mesma transação. Pareceres financeiros e de RH respeitam a visibilidade da área.

A conversa atualiza a cada 15 segundos quando a aba está visível e tem atualização manual e paginação de registros anteriores. Mensagens não podem ser editadas nem excluídas pelo cliente. O autor e setor são determinados no banco; contas pendentes não têm acesso. Há um intervalo mínimo de 2 segundos entre envios por usuário no banco. Isso limita rajadas de mensagens; a proteção de DDoS continua dependendo da infraestrutura.

Sem a migration, conversas e novos encaminhamentos mostram uma mensagem de configuração pendente, sem simular sucesso. Aplique-a antes de usar o novo fluxo em produção. Os testes SQL em `supabase/tests/sector_communication.sql` verificam leitura por perfil, bloqueio de envio não autorizado, imutabilidade e encaminhamento com parecer. Execute-os somente em um Supabase de teste com as migrations aplicadas; os dados de teste são revertidos por rollback.

## Pessoas & RH: equipe e alocações

Para habilitar o módulo ampliado, execute **somente a nova migration** `supabase/migrations/20261031020000_people_allocation.sql` no SQL Editor, após as migrations já aplicadas. Não execute novamente as migrations anteriores. Este desenvolvimento fica em `feature/people-allocation` e deve seguir PR para `develop` e depois PR para `main`.

- **Equipe:** cadastrar e editar colaboradores sem criar contas de acesso; registrar função, competências, disponibilidade (100%, 50% ou 0%) e situação ativa/inativa.
- **Alocações:** selecionar pessoa e demanda recebida do Financeiro, informar função, período e dedicação. A soma de compromissos simultâneos não pode ultrapassar a disponibilidade. Cancelamentos exigem motivo e preservam o histórico.
- **Demandas recebidas:** os cartões existentes, conversas e histórico continuam disponíveis. Monte a equipe e registre o parecer para enviar à execução. A contagem confirmada é derivada das pessoas alocadas; cancelamentos posteriores constam na aba Alocações e no histórico.

RH e Administração podem alterar; Gerência pode consultar. Comercial e Financeiro não recebem acesso ao cadastro ou às alocações. Os formulários e funções existentes de Comercial e Financeiro são preservados. Sem a migration, a nova tela de RH informa configuração pendente; as outras áreas continuam funcionando.

`supabase/tests/people_allocation.sql` contém testes de leitura por perfil, bloqueio de escrita, capacidade, reservas simultâneas/sequenciais, cancelamento e confirmação de equipe. Execute somente em banco Supabase de teste após aplicar as migrations; todos os dados de teste são revertidos por rollback. Os testes SQL não foram executados no ambiente local sem PostgreSQL/Supabase CLI.

## Painel financeiro e contas

Execute **somente a nova migration** `supabase/migrations/20261031030000_finance_dashboard.sql` após as migrations anteriores para habilitar o painel e as contas. O SQL foi validado em PostgreSQL temporário com uma simulação local do esquema Auth; isso não executa nem altera seu Supabase real. A publicação segue `feature/finance-dashboard` → PR para `develop` → PR para `main`.

- **Visão financeira:** recebido, pago e resultado por data efetiva, compromissos em aberto, contas vencidas e próximos vencimentos. O resultado não é saldo bancário. Orçamento e faturamento não são tratados como dinheiro recebido.
- **Revisões:** mantém o formulário anterior e o encaminhamento ao RH. O novo cadastro de contas não altera a etapa de uma demanda.
- **Contas a receber / pagar:** cadastro manual, com cliente/fornecedor, vencimento, parcelas mensais, demanda opcional e observações. A soma das parcelas preserva os centavos. Vincule somente demandas aprovadas pelo Comercial e não canceladas.
- **Baixas:** confirmação manual integral de cada parcela, por data efetiva. Não realiza transferência bancária, pagamento parcial ou estorno de baixas. Contas em aberto podem ser canceladas com motivo. Os históricos são preservados.

Financeiro e Administração alteram; Gerência consulta. Comercial e RH não podem ler as tabelas financeiras. Contas e eventos não podem ser escritos diretamente pelo cliente; os RPCs inferem o autor, validam a entrada e evitam duplicação ao repetir o mesmo envio de cadastro.

Validação dos cálculos:

```sh
npm run test:finance --workspace=frontend
```

Os testes SQL em `supabase/tests/finance_dashboard.sql` verificam divisão exata de parcelas, vencimento no fim do mês, reenvio idempotente, permissões por perfil, baixas e cancelamentos inválidos, trilha de auditoria e preservação da etapa das demandas. Execute somente em Supabase de teste; as fixtures são revertidas por rollback.

Para manutenção manual desta área: altere `frontend/src/components/FinanceOverview.tsx` para os indicadores; `FinanceForms.tsx` para os formulários; `FinancePage.tsx` para abas e filtros; `frontend/src/services/finance.ts` para solicitações; e `frontend/src/utils/finance.ts` para cálculos. Alterações futuras no banco devem entrar em uma nova migration, sem reexecutar ou editar scripts já aplicados.

## Navegação em cápsula

A barra horizontal usa botões circulares e uma cápsula deslizante para indicar a página atual. As cores são laranja no tema claro e lilás no tema escuro. Os nomes aparecem ao passar o mouse ou focar pelo teclado; no celular, a barra permite rolagem horizontal. As páginas, a busca e as permissões existentes são preservadas.

Para alterar manualmente o visual, edite `frontend/src/navigation-dock.css` (cores `--dock-*`, tamanhos e animações). Para adicionar/remover destinos, mantenha a configuração de `navGroups`, `Page` e renderização em `frontend/src/App.tsx`. `frontend/src/components/NavigationDock.tsx` controla o indicador e os rótulos. Essa alteração é somente de frontend e não exige SQL no Supabase.

## Guia visual do sistema

No cabeçalho, **Como usar** abre o **Conheça o Fluxo**. Os cards apresentam o fluxo completo e o papel de Comercial, Financeiro, RH, Demandas e Conversas. Clique em um card para ler o passo a passo. Atalhos aparecem apenas para áreas acessíveis ao perfil atual.

Um convite opcional aparece na Visão geral e pode ser dispensado. A preferência fica só no navegador; o guia continua disponível no cabeçalho. Essa parte não precisa de SQL no Supabase.

Para alterar manualmente o guia:

- Textos, etapas e observações: `frontend/src/content/systemGuide.ts`.
- Comportamento do diálogo e do convite: `frontend/src/components/SystemGuide.tsx`.
- Cores, cards e responsividade: `frontend/src/system-guide.css`.
- Botão do cabeçalho e autorização dos atalhos: `frontend/src/App.tsx`.

O guia foi conferido em Chrome com perfil temporário, incluindo expansão, atalhos autorizados/restritos, dispensa do convite, Escape, navegação por teclado e layout de 375px nos dois temas. A página temporária de teste não faz parte do produto.

O botão **Iniciar tour guiado** percorre as telas reais, destaca cada controle e explica seu uso. **Avançar**, **Voltar**, **Concluir**, o X e Escape controlam a visita. **Ver na prática** inicia somente o setor escolhido. O percurso usa as permissões da navegação e troca apenas páginas/abas, sem enviar formulários ou executar ações operacionais.

Para editar o tour manualmente:

- Textos, ordem, setor e seletor de cada destaque: `frontend/src/content/systemTour.ts`.
- Destaque, posicionamento, teclado e botões: `frontend/src/components/GuidedTour.tsx`.
- Cores e tamanhos: `frontend/src/guided-tour.css`.
- Elementos destacados: atributos `data-tour` em `App.tsx`, `NavigationDock.tsx`, `FinancePage.tsx`, `PeoplePage.tsx` e `Communication.tsx`.

Ao adicionar uma etapa, use um alvo existente e mantenha `activate` somente para botões de troca de aba. Nunca use botões de envio, aprovação ou baixa. Nenhuma migration é necessária.

## Landing page e telas de acesso

A página inicial é uma landing page: hero central, objetivo do Fluxo, botões para **Criar minha conta** e **Entrar no Fluxo**, e apresentação interativa dos setores. Ela não contém campos de login ou cadastro. Os mesmos destinos aparecem no cabeçalho.

- `#/`: apresentação pública.
- `#/entrar`: tela exclusiva de login.
- `#/cadastro`: tela exclusiva de solicitação de cadastro.

As telas de acesso mantêm a validação e a aprovação administrativa existentes. **Voltar à apresentação**, o logo e os botões Voltar/Avançar do navegador permitem navegar entre elas. Links diretos e recarregamento funcionam com o roteamento por fragmento, sem uma nova configuração de rotas no Vercel. Os campos de senha são descartados ao trocar de tela.

Para editar manualmente:

- Navegação pública, cabeçalho e composição das telas: `frontend/src/components/PublicEntry.tsx`.
- Hero, botões, textos, ícones e ilustrações dos setores: `frontend/src/components/ProductPresentation.tsx` (`topics`).
- Login, cadastro e estados de envio: `frontend/src/components/LoginScreen.tsx`.
- Layout, cores, tamanhos e animações: `frontend/src/entry-page.css`.
- Autenticação real: `frontend/src/services/api.ts`; integração com a sessão: `frontend/src/App.tsx`.

A apresentação cresce conforme a página é rolada, permanece em destaque enquanto apresenta os setores e recolhe antes da seção seguinte. A roda do mouse, o toque e o teclado mantêm a rolagem normal. O link Continuar a página permite pular diretamente para Como funciona. Os ícones também permitem escolher o setor manualmente. As ilustrações não usam dados reais.

A apresentação usa CSS/SVG e não baixa vídeos, imagens ou fontes externas. Financeiro, RH, gráficos e tour continuam carregados sob demanda. Essa mudança não exige SQL no Supabase.

A navegação foi conferida em Chrome de 320 a 1440px nos dois temas, incluindo ausência de formulários na inicial, CTAs do hero/cabeçalho, links diretos, recarregamento, histórico do navegador, foco e acesso a partir da apresentação. Formulários são validados com callbacks simulados para não criar contas reais durante os testes.

A ordem visual da referência é mantida na landing: cabeçalho com navegação e acesso → hero central com duas ações → apresentação interativa no gradiente → explicação central → quatro cards do fluxo. A seção inferior e seus textos ficam em `WorkflowPresentation`, dentro de `ProductPresentation.tsx`. Os links **O sistema** e **Como funciona** navegam pelas seções da inicial; as ações de acesso continuam abrindo telas separadas.

A animação de rolagem fica em `frontend/src/components/ScrollPresentation.tsx`. A altura do trecho é definida por `.entry-scroll-scene[data-scroll="active"]` em `entry-page.css`. O componente calcula o crescimento e o recolhimento do painel e troca o setor somente ao atravessar cada faixa de progresso. Não intercepta eventos da roda do mouse nem atualiza o estado React a cada pixel. Usa um listener passivo, `requestAnimationFrame` e `ResizeObserver`, com limpeza ao sair da tela.

Com movimento reduzido ativado, ou quando o conteúdo não cabe na altura disponível, o painel fica no fluxo normal e as abas funcionam manualmente. Textos da landing usam frases diretas sobre as funções do sistema; contadores decorativos, números de etapas, frases de efeito e rótulos redundantes foram removidos.

O fundo da landing fica em `frontend/src/components/LandingBackground.tsx`, com ondas SVG e gradientes leves. O movimento pausa quando a aba está oculta e respeita movimento reduzido. O card começa com até 820px e cresce até 18% durante a ampliação, limitado ao espaço disponível. A suavização da rolagem termina quando o painel alcança o destino, sem um loop permanente de JavaScript.

O trecho animado usa 200svh. A margem de saída compensa o espaço reservado pelo painel fixo, aproximando a seção seguinte; o espaçamento visível é definido pelo padding de `.entry-workflow`. As transições de texto, ilustração e linhas do card usam apenas opacidade e transformações. Estas alterações não exigem migrations.
