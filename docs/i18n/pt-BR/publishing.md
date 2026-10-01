# Publicação no GitHub e no npm

[English](../../publishing.md) | [简体中文](../zh-CN/publishing.md) | [繁體中文](../zh-TW/publishing.md) | [日本語](../ja/publishing.md) | [한국어](../ko/publishing.md) | [Español](../es/publishing.md) | [Français](../fr/publishing.md) | [Deutsch](../de/publishing.md) | **Português (Brasil)** | [Русский](../ru/publishing.md)

## Contas e nome do pacote

O repositório do GitHub é `Zeroman/react-auto-components`. Contas do npm exigem um registro separado. O nome de pacote pretendido é `@zeroman/react-auto-components`; confirme a propriedade do escopo `@zeroman` antes de publicar. O pacote ainda não foi publicado no npm.

1. Abra a [página de cadastro do npm](https://www.npmjs.com/signup), informe nome de usuário, e-mail e senha, e revise e aceite pessoalmente os termos.
2. Verifique o e-mail de cadastro. O npm exige um e-mail verificado antes da publicação; os endereços de e-mail de quem publica aparecem nos metadados do pacote, portanto escolha um endereço adequado à manutenção pública.
3. Ative a autenticação de dois fatores nas configurações da conta e salve as informações de recuperação. Nunca coloque senhas, códigos de verificação, códigos de recuperação ou tokens no repositório ou na conversa.
4. Execute `npm login --registry=https://registry.npmjs.org/` e siga as instruções do navegador. Confirme a conta com `npm whoami --registry=https://registry.npmjs.org/`.
5. Recomenda-se um escopo pessoal, como `@<npm-username>/react-auto-components`. Para um escopo de organização, verifique primeiro a associação à organização e as permissões de publicação.

Quando o nome for definitivo, atualize o nome no package.json da raiz, as importações em todas as traduções do README, as dependências do consumidor e as importações do código-fonte/testes. Em seguida, execute `pnpm prepare:test-project` para atualizar o arquivo de lock do consumidor. O script de empacotamento deriva os nomes dos arquivos tarball do package.json da raiz.

Documentação oficial: [cadastro de conta](https://docs.npmjs.com/creating-a-new-npm-user-account/), [pacotes públicos com escopo](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) e [autenticação de dois fatores](https://docs.npmjs.com/about-two-factor-authentication/).

## Verificação antes da publicação

Execute na raiz do repositório:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium
pnpm test:e2e
npm pack --dry-run
```

`prepack` compila JavaScript, CSS e declarações automaticamente; `prepublishOnly` executa verificações de tipos e testes unitários. O pacote npm contém apenas dist, as traduções do README e do guia de migração, LICENSE e package.json. Verifique se credenciais, logs locais e saídas de testes estão excluídos. O restante da documentação do repositório é acessado por links no GitHub.

`test-project` valida os pontos de entrada públicos reais por meio de um arquivo tarball com hash do conteúdo no nome. Em um clone novo, execute `pnpm prepare:test-project` na raiz antes de instalar nesse diretório. O comando de preparação atualiza a dependência local e o arquivo de lock do consumidor.

## Primeira publicação

Depois de concluir a configuração da conta, o nome definitivo do pacote, a licença e as verificações acima:

```sh
npm whoami --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```

Conclua qualquer verificação solicitada pelo npm. Após a publicação, execute `npm view <package-name> version` com o nome definitivo e, em seguida, instale e verifique o pacote em um novo projeto consumidor. Remova o aviso de preparação da primeira publicação de todas as traduções do README e adicione instruções de instalação após a primeira publicação bem-sucedida.

Atualize a versão e todas as traduções do CHANGELOG antes de cada publicação. Não tente sobrescrever uma versão publicada. A integração contínua atual do repositório apenas verifica as alterações; ela não publica automaticamente no npm.

## Futuras publicações automatizadas

Após a primeira publicação, configure [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) para vincular o pacote ao repositório do GitHub e a um arquivo de workflow específico. Use um runner hospedado pelo GitHub e OIDC `id-token: write`, sem um token npm de longa duração. Os requisitos documentados são Node >=22.14.0 e npm CLI >=11.5.1. Antes de ativar, implemente e verifique o workflow de publicação e confirme que a tag, a versão de package.json e o commit testado correspondem.

A integração contínua do GitHub Actions instala a partir do arquivo de lock, verifica os tipos, executa testes unitários, compila o consumidor do arquivo tarball real e executa testes Chromium. A proteção de branches pode exigir a integração contínua antes do merge; configure-a conforme as necessidades de manutenção evoluírem com contribuições externas.
