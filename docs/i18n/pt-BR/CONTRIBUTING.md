# Como contribuir

[English](../../../.github/CONTRIBUTING.md) | [简体中文](../zh-CN/CONTRIBUTING.md) | [繁體中文](../zh-TW/CONTRIBUTING.md) | [日本語](../ja/CONTRIBUTING.md) | [한국어](../ko/CONTRIBUTING.md) | [Español](../es/CONTRIBUTING.md) | [Français](../fr/CONTRIBUTING.md) | [Deutsch](../de/CONTRIBUTING.md) | **Português (Brasil)** | [Русский](../ru/CONTRIBUTING.md)

Use Issues para relatar problemas reproduzíveis ou propor recursos, e Pull Requests para contribuir com melhorias.

## Desenvolvimento local

Requer Node.js >=22.12.0 e pnpm 12.5.1. A versão do gerenciador de pacotes é fixada no campo packageManager de package.json.

```sh
pnpm install --frozen-lockfile
pnpm prepare:test-project
pnpm --dir test-project dev
```

O projeto consumidor instala a biblioteca a partir de um arquivo tarball real. Após alterar a biblioteca, execute `pnpm prepare:test-project` novamente. Mantenha esse fluxo baseado no pacote em vez de introduzir aliases para o código-fonte. Não inclua artefatos, node_modules ou logs de execução nos commits.

## Verificação

```sh
pnpm typecheck
pnpm test
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium
pnpm test:e2e
```

A integração contínua executa essas verificações no Linux. Os testes de navegador usam automaticamente a porta 4174; a demonstração de desenvolvimento usa a porta 4173.

## Diretórios

- `src/components`: os sete componentes e seus tipos públicos.
- `src/core`: configuração, provedores, consultas e tipos compartilhados.
- `src/adapters`: o adaptador XLSX opcional.
- `src/styles`: estilos dos componentes importados explicitamente.
- `tests`: testes unitários e testes negativos de tipos.
- `test-project`: o projeto consumidor independente e os testes de interação do Chromium.
- `scripts`: scripts de empacotamento e preparação do projeto consumidor.

## Pull Requests

Descreva o problema, o comportamento resultante e as verificações que você realmente executou. Ao corrigir um bug de componente, adicione um teste de regressão que reproduza o problema. Atualize a documentação quando as APIs públicas ou seu uso mudarem. Mantenha as alterações focadas e evite reformatações não relacionadas em todo o repositório.

Siga as configurações estritas de TypeScript e o estilo de código existentes. React 19 continua sendo uma dependência par, os estilos usam um ponto de entrada separado e XLSX permanece fora do ponto de entrada principal. As contribuições são fornecidas sob a licença MIT deste repositório.

## Traduções da documentação

Os documentos em inglês usam seus nomes de arquivo padrão. As traduções são agrupadas por localidade sob `docs/i18n/<locale>/`, por exemplo `docs/i18n/ja/README.md` e `docs/i18n/zh-CN/migration.md`. Mantenha as mesmas seções, exemplos, significado técnico e status de lançamento em todos os idiomas. Preserve os identificadores públicos e os argumentos de comandos. Ao atualizar um documento, atualize suas traduções e mantenha os links de troca de idioma e os links para documentos relacionados consistentes.
