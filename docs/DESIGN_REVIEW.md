# Revisão visual do Fluxo — 9 de novembro de 2026

A revisão foi dividida entre três agentes: apresentação pública, telas operacionais e acessibilidade. A integração e a validação no navegador foram feitas no projeto real, com React, TypeScript, Vite, Lucide e CSS existentes.

## Avaliação geral

A composição já segue a direção aprovada: superfícies neutras e cartões arredondados nos dashboards; paleta de laranja e pervinca; navegação horizontal; apresentação pública centralizada com demonstração expansível; conversas em duas colunas. Os ajustes concentram-se em tipografia, hierarquia, estados e telas estreitas. As referências orientam a composição; suas imagens, marcas e dados não são distribuídos pelo sistema.

Referências consideradas: dashboards Retail Inventory e Financial Analytics, cartões de perfil, imagem de conversa fornecida pelo usuário e estrutura da apresentação hero registrada em `.github/skills/fluxo-ui-design/references/inspiration.md`.

## Fase 1 — Usabilidade e acessibilidade

- Cabeçalho em telas pequenas: o título absoluto podia encostar nos controles → coluna própria entre marca e ações, com truncamento local → contexto legível sem cobrir os botões. Medido em 320, 375 e 600px.
- Erros de acesso: faltava direcionamento de foco para alguns avisos → foco no aviso geral ou na confirmação inválida, sem apagar os campos → recuperação pelo teclado. Um erro de login não acompanha a navegação ao cadastro.
- Páginas públicas: havia navegação antes do conteúdo → link “Pular para o conteúdo”, com destino focável → atalho pelo teclado. Ícones junto a rótulos ficam ocultos da árvore acessível.

## Fase 2 — Refinamento

- Conversas: nomes, resumos e metadados tinham tamanhos de 10–11px → nomes/campo de escrita de 14px, resumos de 13px e metadados maiores → leitura mais confortável. Nomes longos quebram no cabeçalho.
- Dashboard: legendas laterais compactas → 12px com altura de linha consistente → leitura sem alterar a composição dos KPIs e gráficos. Valores financeiros usam algarismos tabulares.
- Landing: algumas legendas da demonstração eram pequenas e o texto dependia da posição lateral → tipografia ampliada e texto independente da posição → apresentação coerente também quando empilhada. Títulos inferiores quebram naturalmente.
- Formulários: rótulos menores competiam com o texto auxiliar → rótulos de 14px, campos de 16px, mensagens com medida de linha limitada → hierarquia clara sem trocar a tela de acesso.

## Fase 3 — Acabamento

- Conversa selecionada perdia a superfície de seleção no hover → preservar o destaque → estado estável.
- Estado vazio de conversas tinha ilustração desproporcional → ícone e título mais discretos → prioridade para a próxima ação.
- Demonstração em telas estreitas tinha molduras redundantes → reduzir a moldura interna e equilibrar abas/CTAs → mais espaço útil. A etapa atual expõe `aria-current="step"`; a ação inferior informa “Ver na demonstração”.
- Cadastro concluído recebe foco no título; os formulários dispensam rótulos superiores redundantes em maiúsculas.

## Sistema de design e implementação

Paleta, fonte local, tokens semânticos, capas de perfil, módulos, permissões e animação nativa ao rolar foram preservados. `access-page.css` agrupa os refinamentos dos formulários e o atalho público. `entry-page.css`, `messaging.css`, `reference-layout.css` e `navigation-dock.css` mantêm seus respectivos limites. A API, o banco e as políticas de autenticação não foram alterados; não há nova migration ou dependência.

## Evidências e limites

- AccessLint core 0.21.0: 12 verificações com 94 regras por execução, sem violações automáticas nos estados iniciais de `/`, `/entrar` e `/cadastro`. Combinações: claro/escuro e 375×812/1440×1000. Viewport e tema conferidos antes de cada scan.
- Chrome: demonstração completa, equipe vazia, reinício, teclado das abas, retorno dos cards, expansão sem cortar o card, escolha manual preservada, movimento reduzido e rotas separadas.
- Chrome com respostas simuladas: e-mail inválido sem requisição, erro de login com campos preservados, confirmação de senha inválida, cadastro concluído e separação do contexto dos avisos. Nenhuma conta real foi criada.
- Conversas com respostas simuladas: dois temas, nomes longos, duas mensagens e compositor contido no painel em 320, 375, 768, 1024 e 1440px. Sem rolagem horizontal da página.
- Build, validação de tipos e suítes existentes de acesso, autenticação, conversas e financeiro verificadas antes da publicação.

Os scans não são uma declaração de conformidade WCAG completa. Não incluem avaliação por usuários de tecnologia assistiva, todos os estados privados ou um novo teste com contas reais em produção. Testes simulados não enviaram mensagens a pessoas reais.
