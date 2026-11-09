# Central de conversas

A tela `/mensagens` reúne **Pessoas**, para conversas individuais, e **Setores**, com os canais já existentes. O layout segue a primeira referência enviada: lista/busca à esquerda, conversa aberta à direita, cabeçalho da pessoa e campo de envio na parte inferior. Usa os temas do Fluxo, sem áudio, chamadas, arquivos externos ou indicadores de presença fictícios.

## Uso

Busque uma conta ativa pelo nome (mínimo de dois caracteres) ou pelo e-mail completo. A busca retorna até dez resultados, somente com nome e setor. E-mails não são expostos em uma listagem geral. O campo pesquisa pessoas; não pesquisa o conteúdo das mensagens.

Selecione uma pessoa para abrir ou retomar a conversa existente. Cada par de usuários tem uma única conversa, independentemente de quem a iniciou. A lista mostra a última mensagem e as não lidas. Os avatares usam iniciais: o bucket atual de fotos continua privado para a própria conta.

Enter envia e Shift+Enter insere uma nova linha. O botão também permite enviar. Em caso de falha, o texto é mantido enquanto a conversa continua aberta. Repetir o mesmo envio após uma falha de rede reutiliza seu identificador para evitar duplicação. Rascunhos não são persistidos ao sair da conversa.

O botão de vínculo permite selecionar uma demanda. A mensagem guarda somente o identificador dessa demanda; o card mostra código/título disponíveis para a conta e abre `/demandas?demanda=...`, com os detalhes do registro. Não copia orçamento, custos, dados de RH ou a conversa privada para o histórico de outra área. Os pareceres formais continuam sendo registrados nos fluxos existentes.

No celular a lista e a conversa aparecem separadamente, com botão de voltar. O foco principal do layout é desktop.

## Privacidade e acesso

As conversas individuais só podem ser lidas pelos dois participantes com perfil ACTIVE. Administração/Gerência não recebem acesso automático a uma conversa alheia pela aplicação. Essa regra é própria da comunicação privada; as permissões gerenciais dos módulos ERP e dos canais de setor continuam iguais.

A privacidade é aplicada por RLS e RPCs, não somente pelo menu. Administradores técnicos do banco e credenciais de serviço continuam tendo acesso administrativo; esta implementação não é criptografia de ponta a ponta.

- `direct_conversations`: par único de participantes.
- `direct_messages`: texto imutável, autor derivado da sessão, vínculo opcional e nonce de envio.
- `direct_reads`: posição de leitura da própria conta; não expõe o marcador do outro participante.
- `direct_action_limits`: estado interno do limitador, sem acesso direto de clientes.

Nenhuma dessas tabelas permite INSERT/UPDATE/DELETE direto por anon/authenticated. A busca de pessoas não amplia a política da tabela `profiles`; usa uma função específica com projeção mínima. Contas pendentes/rejeitadas não aparecem na busca nem usam a central. Ao desativar um participante, o outro mantém o histórico, mas não pode enviar novas mensagens para essa conta.

O banco limita buscas e aberturas a uma por segundo por autor, e envios a um a cada dois segundos por autor. Locks serializam operações concorrentes. O nonce por autor torna tentativas repetidas idempotentes. Atualizações de leitura nunca movem o marcador para trás.

## Atualização e paginação

`direct_messages` participa da publicação `supabase_realtime`. Os eventos de INSERT respeitam a política de SELECT do assinante. A interface também atualiza a lista/conversa a cada 15 segundos quando a aba está visível, e ao voltar à janela, como fallback. Não há promessa de presença online ou confirmação de leitura do destinatário.

A lista carrega páginas de 30 conversas; o histórico carrega 50 mensagens por página, com cursor de data/ID. Mensagens novas não obrigam quem está lendo o histórico a pular para o fim. A leitura só é marcada com a conversa visível e próxima do fim, usando o último ID carregado/exibido. O marcador é validado no servidor e sincronizado pelo par data/ID.

## Arquivos de manutenção

| Arquivo | Responsabilidade |
|---|---|
| `frontend/src/components/MessagingCenter.tsx` | Lista, busca, seleção e alternância Pessoas/Setores |
| `frontend/src/components/DirectConversationPanel.tsx` | Histórico, leitura, rascunho, teclado e envio |
| `frontend/src/hooks/useDirectInbox.ts` | Lista paginada, atualização e contadores |
| `frontend/src/services/directMessages.ts` | RPCs, consulta e assinatura Realtime |
| `frontend/src/utils/conversations.ts` | Ordenação/deduplicação e iniciais |
| `frontend/src/messaging.css` | Layout e temas da central |
| `frontend/src/components/Communication.tsx` | Canais de setor e conversa da demanda, preservados |
| `supabase/migrations/20261103204909_private_conversations.sql` | Estrutura, regras e funções do banco |

## Aplicação e validação

A migration `20261103204909_private_conversations` foi aplicada pelo MCP no projeto conectado. Não é necessário reenviar SQL pelo editor. Em uma instalação nova, seguir a ordem normal das migrations. Nenhuma mensagem de teste foi enviada a pessoas reais, nem foram criadas contas de teste em produção.

Os testes SQL de `supabase/tests/private_conversations.sql` são somente para banco isolado, com rollback. Verificam: diretório mínimo, destinatário pendente, conversa consigo mesmo, unicidade do par, idempotência e limite de envio, mensagens não lidas, leitura monotônica, histórico paginado, bloqueio de terceiros inclusive ADMIN/GERENCIA, contas desativadas e ausência de privilégios de escrita direta. As seis suítes SQL foram executadas com e sem a automação `ensure_rls`.

A verificação remota sem escrita está em `supabase/audits/verify_private_conversations.sql`. Confere RLS, privilégios, identidade ausente, acesso anônimo e tentativa de envio para conversa inexistente, sem criar mensagens.

O Chrome foi usado com respostas simuladas para testar envio, falha/reenvio com mesmo nonce, recebimento/atualização, busca de pessoa, canais preservados, vínculo com demanda, mensagens escapadas como texto, Enter/Shift+Enter, temas e largura de 375 px. Os corpos de teste foram removidos do código de produção. A entrega não inclui teste ponta a ponta de Realtime com duas sessões reais; a publicação e as políticas foram verificadas no banco e há fallback por consulta.

Validações locais:

```sh
npm run build
npm run lint
npm run test:messages --workspace=frontend
npm run test:auth --workspace=frontend
npm run test:access
```

O advisor pode apontar RLS sem política em `direct_action_limits`: é intencional para essa tabela interna, que também tem todos os privilégios de cliente revogados. Os RPCs precisam continuar executáveis por authenticated; a autorização é conferida dentro das funções. Não crie políticas públicas nem revogue todos os RPCs para silenciar esses avisos.
