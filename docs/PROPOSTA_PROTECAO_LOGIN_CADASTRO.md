# Proposta: validação de e-mail e proteção de login/cadastro

Status: implementada com ajuste aprovado pelo usuário: **sem CAPTCHA**. O código das telas foi alterado; configurações do Supabase Auth e do banco remoto não foram alteradas nesta etapa. Veja a seção de entrega ao fim do documento.

## Situação atual

O frontend usa Supabase Auth diretamente. O campo de e-mail já tem `type="email"`, é obrigatório e tem limite de 254 caracteres. O botão fica desativado durante o envio, mas não existe uma política de tentativas com prazo de espera na interface.

O backend Express possui limite de 10 requisições por IP a cada 15 minutos. Esse limite pertence à API legada e não protege as chamadas diretas do frontend ao Supabase.

A organização conectada está no plano Free. Isso influencia as opções de controle exato de falhas no serviço Auth.

## Estrutura proposta para aprovação

### E-mail

- Validar no login e no cadastro, com mensagem junto ao campo: “Informe um e-mail válido, como nome@empresa.com”.
- Retirar espaços externos; rejeitar espaços internos, partes ausentes e domínio incompleto conforme a política de e-mail da aplicação. Exemplos rejeitados: `nome`, `nome@`, `@empresa.com`, `nome@empresa`.
- Aceitar domínios válidos em geral nesta etapa, incluindo provedores pessoais. O rótulo será “E-mail”, pois ainda não há restrição corporativa.
- Centralizar a regra e preparar uma configuração de domínios permitidos, inicialmente desativada. Quando o domínio for definido, a restrição também deverá ser aplicada no Auth/servidor, e não apenas no formulário.
- Validação de formato não prova que a caixa existe ou pertence à pessoa. Confirmação por e-mail será uma etapa separada, após conferir SMTP e entrega, mantendo a aprovação administrativa já existente.

### Tentativas e espera na interface — recomendação inicial

| Ação | Regra proposta | Depois do limite |
|---|---|---|
| Login | 5 respostas de credenciais inválidas em uma janela de 10 minutos | Pausa de 5 minutos no formulário |
| Cadastro | 3 envios ao serviço em uma janela de 10 minutos | Pausa de 10 minutos no formulário |
| Repetição de cadastro | Intervalo mínimo de 60 segundos entre envios ao serviço | Exibir tempo restante |
| Envios simultâneos | Uma requisição em andamento por formulário | Desativar o botão até concluir |

Os números são sugestões configuráveis para aprovação. O cadastro não tem “senha incorreta”: nele o objetivo é limitar envios repetidos e criação automatizada de contas.

Comportamento:

- Após uma falha de credenciais: “Não foi possível entrar. Confira seu e-mail e sua senha.” e “Restam 2 tentativas antes da pausa”, conforme o contador.
- No limite: “Muitas tentativas. Tente novamente em 04:59”. O botão mostra a espera e volta a funcionar ao terminar.
- Não bloquear a edição dos campos, a navegação nem o gerenciador de senhas. Desativar somente o envio durante a pausa.
- Preservar contadores e prazo ao recarregar, trocar de tela e abrir outra aba no mesmo navegador. Usar metadados locais de contagem/data, sem senha, token ou e-mail em armazenamento próprio do limitador. Trocar o endereço digitado não zera o contador do navegador.
- Erros de formato e confirmação de senha não enviam requisição e não consomem tentativas. Falhas de rede e indisponibilidade não contam como senha incorreta. Uma conta pendente com senha correta também não conta como credencial inválida.
- Login válido limpa o contador de login. Cadastro aceito mantém o estado de solicitação em análise e a limitação contra novos envios.
- Não remover espaços da senha nem modificá-la silenciosamente. Preservar o mínimo de 12 caracteres no cadastro e o comportamento de login das contas existentes.

### Proteção no Supabase — necessária além da interface

O contador local melhora a experiência, mas pode ser contornado limpando armazenamento ou chamando o Auth diretamente. Ele não será apresentado como bloqueio global da conta.

Para esta fase no plano Free, a recomendação é combinar os limites nativos de Supabase Auth com CAPTCHA verificado no próprio Auth, tanto para login quanto para cadastro. Cloudflare Turnstile é uma opção suportada. A interface enviará o token do desafio; não será suficiente apenas esconder/desativar o botão. A integração precisa da configuração do provedor e do Auth, com a chave secreta mantida fora do frontend e do Git.

A implementação deverá tratar HTTP 429 e respeitar o prazo fornecido pelo serviço quando disponível. Os limites nativos usam suas próprias regras, inclusive por IP e por envio de e-mail: não equivalem à contagem exata de cinco senhas incorretas por conta. Redes compartilhadas também precisam ser consideradas ao ajustar limites.

**Se a exigência for exatamente “5 falhas por conta, bloqueadas no servidor por 5 minutos, inclusive em outros dispositivos e chamadas diretas”**, isso precisa de uma solução adicional no ponto que verifica a senha. O Password Verification Attempt Hook do Supabase atende a esse tipo de controle, mas a documentação atual o limita aos planos Teams e Enterprise. Não será contratado plano nem inventada uma garantia equivalente com um contador local ou um endpoint intermediário que possa ser contornado.

Um eventual bloqueio por conta deverá evitar que terceiros consigam impedir o acesso de outra pessoa somente conhecendo seu e-mail. Essa política exige análise própria antes de ativação.

## Arquivos e responsabilidades

| Arquivo/área | Alteração planejada |
|---|---|
| `frontend/src/components/LoginScreen.tsx` | Mensagens junto aos campos, tentativas restantes, espera e botão |
| `frontend/src/utils/authValidation.ts` — novo | Validação de e-mail e configuração futura de domínios |
| `frontend/src/hooks/useAuthAttemptLimit.ts` — novo | Política local, persistência e sincronização entre abas |
| `frontend/src/services/api.ts` | Validação antes do envio, classificação de erros de Auth, suporte ao token CAPTCHA |
| `frontend/src/App.tsx` | Preservar os códigos de erro/espera até o formulário, sem perder o fluxo de aprovação |
| `frontend/src/components/AuthCaptcha.tsx` — novo | Desafio de login/cadastro conforme configuração aprovada |
| Configurações Supabase Auth/provedor CAPTCHA | Aplicar proteção no serviço, sem substituir a autenticação atual |
| Testes | Validação, contadores, concorrência, prazos, navegação e respostas do serviço |

Não se propõe criar uma tabela pública de tentativas gravável por usuários não autenticados, nem guardar senhas ou credenciais para calcular os limites.

## Validação antes de publicar

- Formatos válidos e inválidos de e-mail; provedores pessoais continuam aceitos.
- Clique duplo, Enter repetido e requisições simultâneas sem envios duplicados.
- Quinta falha de login, terceira solicitação de cadastro e liberação após o prazo, usando relógio de teste.
- Recarregamento, múltiplas abas e navegação sem zerar os contadores.
- Separação entre credencial inválida, conta pendente, falha de rede e resposta 429.
- CAPTCHA inválido/ausente rejeitado pelo Auth quando a proteção estiver habilitada; conferir também chamada direta ao serviço.
- Login, cadastro, aprovação administrativa, responsividade, acessibilidade e temas preservados.

## Aprovação solicitada

Recomendação: aprovar os valores da tabela e a fase compatível com o plano Free, com proteção nativa do Auth + CAPTCHA e contador/espera local claramente delimitados. A configuração de domínio fica preparada e desativada. Confirmação de caixa de e-mail e bloqueio global exato por conta ficam fora desta fase.

A aprovação desta proposta autoriza a implementação local e os testes. Ativar CAPTCHA no ambiente publicado ocorrerá somente depois de conferir a configuração e o funcionamento do frontend correspondente, para não interromper o login da versão já publicada.

## Referências

- [Limites de Supabase Auth](https://supabase.com/docs/guides/auth/rate-limits).
- [Proteção com CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha).
- [Disponibilidade dos Auth Hooks por plano](https://supabase.com/docs/guides/auth/auth-hooks).
- [Password Verification Hook](https://supabase.com/docs/guides/auth/auth-hooks/password-verification-hook).


## Entrega após aprovação — sem CAPTCHA

O usuário aprovou a proteção de tentativas e pediu que CAPTCHA não fosse adicionado. Os trechos anteriores preservam a proposta original; esta seção define o comportamento efetivamente entregue.

- E-mail validado no login/cadastro e na camada de serviço frontend, com formato comum de endereço completo, mensagem junto ao campo e normalização de espaços externos/maiúsculas. Domínios pessoais continuam aceitos. O rótulo é E-mail. Nenhuma confirmação de caixa foi adicionada.
- Login: cinco respostas de credenciais inválidas em dez minutos geram pausa local de cinco minutos. Há também intervalo de dois segundos entre requisições para evitar repetição imediata, sem contabilizar erro de rede como senha incorreta.
- Cadastro: três envios em dez minutos geram pausa local de dez minutos, com intervalo de sessenta segundos entre envios. Erros de formato/nome/senha são tratados antes da chamada. Cadastro aceito continua mostrando solicitação em análise.
- Uma requisição em andamento por página; navegadores com Web Locks também impedem requisições simultâneas em abas diferentes da mesma origem. Nos demais, o intervalo persistido é compartilhado, mas não se promete exclusão atômica entre abas.
- Persistência em `fluxo.auth-attempts.v1`: apenas contagens, datas de tentativas e prazos, separados para login/cadastro. Nenhum e-mail, senha ou token é gravado pelo limitador. Se armazenamento estiver indisponível, permanece proteção em memória naquela página, sem garantia de persistência após recarregar.
- Erros HTTP 429/códigos de rate limit do Auth geram espera local. O SDK não fornece Retry-After confiável em todas essas respostas; nessa situação a pausa local é de um minuto, sem prometer que o limite do serviço expire nesse tempo. Se o Auth continuar limitando, a resposta seguinte mantém a espera.
- Login bem-sucedido limpa as falhas locais de login. Falhas de rede, indisponibilidade e conta pendente com senha correta não são contadas como credenciais inválidas.

A proteção local pode ser contornada por outro navegador, remoção dos dados locais ou chamada direta ao Auth. Continuam valendo os mecanismos próprios do Supabase. Nenhum limite global exato por conta foi implementado, nenhum CAPTCHA foi adicionado, e não foi feita alteração no plano ou em configurações remotas.

Arquivos implementados: `authValidation.ts`, `authAttemptPolicy.ts`, `authErrors.ts`, `authAttempts.ts`, `useAuthAttemptLimit.ts`, além das alterações de `LoginScreen.tsx`, `api.ts`, `App.tsx` e estilos de acesso. Não foi criado `AuthCaptcha.tsx`.

Para ajustar números e prazos: `frontend/src/utils/authAttemptPolicy.ts`. Para a futura política de domínio: `frontend/src/utils/authValidation.ts`; qualquer restrição efetiva também precisará ser aplicada no servidor/Auth.

Validação: `npm run test:auth --workspace=frontend`, build e verificação de tipos. No Chrome, com respostas de Auth simuladas e sem contas reais: e-mail inválido/normalizado, quinta falha, terceira solicitação, espera após recarregar, sincronização entre duas abas, término do prazo, exclusão por Web Locks, erro de serviço sem consumir falhas de senha, HTTP 429, sucesso de cadastro e largura de 375px nos dois temas. Não foi feito ataque de força bruta nem criação de usuários em produção.
