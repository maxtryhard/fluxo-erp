## Regras de Prioridade Máxima (Segurança)
1. **Proteção de Segredos:** Nunca versione o `.env` ou chaves de API. Use segredos do GitHub para CI/CD.
2. **Criptografia:** Dados sensíveis de usuários (senhas, documentos) devem ser transformados em hash (Argon2 ou Bcrypt são recomendados para senhas; SHA-256 para integridade).
3. **Zero Trust Frontend:** O backend deve validar e sanitizar toda entrada, tratando o frontend como um ambiente não confiável.
4. **CORS:** Configure o CORS para permitir apenas o domínio oficial do seu frontend.
5. **IMPEDIR** Impeça ataques ddos, não cometa erros.

## Regras de Versionamento
1. **Padronização:** Seguir [Conventional Commits](https://www.conventionalcommits.org/).
2. **Fluxo:** Todo desenvolvimento em `feature/*`, merge em `develop`, e deploy via `main`.
3. **Revisão:** Nenhum código entra em `main` sem passar por um Pull Request.