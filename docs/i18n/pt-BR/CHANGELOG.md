# Histórico de alterações

[English](../../CHANGELOG.md) | [简体中文](../zh-CN/CHANGELOG.md) | [繁體中文](../zh-TW/CHANGELOG.md) | [日本語](../ja/CHANGELOG.md) | [한국어](../ko/CHANGELOG.md) | [Español](../es/CHANGELOG.md) | [Français](../fr/CHANGELOG.md) | [Deutsch](../de/CHANGELOG.md) | **Português (Brasil)** | [Русский](../ru/CHANGELOG.md)

## Unreleased

## 0.3.0 - 2026-10-06

- This locale is paused. See docs/CHANGELOG.md (English) for the unreleased notes.

## 0.2.0 - 2026-10-04

- This locale is paused. See docs/CHANGELOG.md (English) for the 0.2.0 notes.

## 0.1.4 - 2026-10-03

- `AutoNavigation` foi adicionado. Componentes montados se registram em uma árvore de caminhos. `goto` aceita caminhos relativos, verificações de acesso e um sinal de cancelamento. Só locais confirmados sincronizam com o histórico hash, do navegador ou em memória. `AutoMenu` e `AutoTabs` aceitam `route` e seguem o filho ativo.
- `AutoTip` e `DefaultTip` foram adicionados. Dicas de campos, colunas, menus e abas flutuam. Os tipos de exibição `tip` e `append` continuam em linha. Vale o componente do item, depois o do componente dono, depois `config.form`, `config.table`, `config.tabs` ou `config.menu`, e por fim `config.tipComponent`.
- `mode` de `AutoSearch` passa a ser `"instant"` por padrão. Campos ocultos e os que falham em `canAccess` permanecem nos valores e saem da consulta. As opções de busca ficam em `search`; as props `match` de nível superior continuam funcionando.
- `toolbarActions` de `AutoTable` mostra ou oculta Atualizar, Ajustes, Exportar e JSON. `handle.refresh()` e `handle.export()` continuam disponíveis. As etiquetas de ordenação aparecem quando duas ou mais colunas estão ordenadas.
- Formulários aceitam slots `classNames` e `styles`, um item `divider` e `virtual-select`.

## 0.1.3 - 2026-10-02

- O texto de interface embutido passa a ser inglês por padrão, e essa string é a chave de `config.t`. Passe `t` para outros idiomas. Chaves chinesas anteriores, como `提交` e `刷新`, não são mais o padrão.
- O formulário de busca é `AutoSearch` (`AutoSearchProps`). `AutoSearchPanel` e `AutoSearchPanelProps` permanecem como aliases obsoletos.
- `Field<T>` é uma união discriminada. `select` sem `options`, um escalar em `daterange` ou `datetimerange`, e `match: "between"` em um escalar são erros de TypeScript. `AnyField` e `unsafeField()` continuam como saída.
- Erros de desenvolvimento são `RacError` em inglês, com componente, correção e código. Veja [errors.md](errors.md). O modo de desenvolvimento avisa sobre folha de estilo ausente, id de tabela vazio, `rowKey` duplicados, campos de escolha sem options e valores de intervalo que não são um par.
- `AutoConfigProvider` aceita registros JSON: `config.fields`, `config.columns`, `config.rowActions` e `config.sources`. Uma chave resolve `Field.component`, `render` / `format` / `sort` / `exportFormat` da coluna, `RowAction.action` e `source` de `AutoTable`. A função no campo, na coluna ou na ação vence. Providers aninhados se fundem, e a chave posterior vence. Passe exatamente um de `data`, `dataSource` ou `source`. Uma source desconhecida mostra `RAC-TABLE-SOURCE` e nova tentativa.
- `data-testid="rac-*"` estáveis para campos, tabelas, busca, formulários e diálogos. Não seguem o rótulo traduzido.
- `useAutoTabsWorkspace` abre, troca e fecha abas dinâmicas, com abas fixadas e armazenamento de sessão opcional. Uma aba pode ser `closable`, `lazy`, `disabled` ou `loading`.
- Contratos: [AutoForm](auto-form.md), [AutoSearch](auto-search.md), [AutoTable](auto-table.md), [AutoDialog](auto-dialog.md), [AutoTabs](auto-tabs.md), [AutoMenu](auto-menu.md). `llms.txt` na raiz do pacote é a entrada para agentes.
- Uma tag `v*` publica no npm pelo trusted publishing do GitHub Actions. `./run.sh release` sobe o patch em um `main` limpo.

## 0.1.2 - 2026-10-01

- Publicação como `@zeroman.yang/react-auto-components`. O escopo npm `@zeroman` pertence a outra conta.

- Adiciona o AutoChat com renderização de mensagens controlada pelo chamador, acompanhamento de streaming, ancoragem de histórico, compositor opcional e demonstração em dez idiomas; sem novas dependências de runtime.
- A demonstração online agora mostra o código-fonte real de cada exemplo em um diálogo "Ver código", com abas de arquivos, cópia em um clique e links para o GitHub.
- Componentes React 19 orientados por esquemas: AutoForm, AutoSearchPanel, AutoTable, AutoDialog, AutoTabs e AutoMenu.
- Tamanho e densidade globais, layouts de rótulos de formulários, configurações persistentes de tabelas e exportação XLSX opcional.
- Um projeto consumidor que usa um arquivo tarball real, testes unitários, verificações de tipos e testes de interação do Chromium.
- Licença MIT, guia de contribuição, integração contínua do GitHub, modelos de issues e instruções de cadastro de conta npm e publicação.
- Documentação em inglês por padrão, com traduções completas e links para trocar de idioma.
