# Códigos de erro

[English](../../errors.md) | [简体中文](../zh-CN/errors.md) | [繁體中文](../zh-TW/errors.md) | [日本語](../ja/errors.md) | [한국어](../ko/errors.md) | [Español](../es/errors.md) | [Français](../fr/errors.md) | [Deutsch](../de/errors.md) | **Português (Brasil)** | [Русский](../ru/errors.md)

Falhas de desenvolvimento lançam `RacError` ou chamam `console.warn` em desenvolvimento. O texto é sempre inglês.

```text
[Component] what is wrong.
Fix: what to change.
Code: RAC-…
Docs: https://github.com/Zeroman/react-auto-components/blob/main/docs/errors.md#rac-…
```

O texto da interface continua em `config.t`. `userKey` é a frase-fonte em inglês que o hospedeiro traduz. O console e a exceção ficam em inglês.

## RAC-FIELD-OPTIONS

`type` é `select`, `select-v2`, `radio`, `checkbox` ou `cascader`, e `options` falta ou está vazio.

Correção: Passe `options` como array ou `(values) => Option[]`. `autocomplete` pode omitir.

## RAC-FIELD-RANGE

`daterange` ou `datetimerange` não tem um valor de dois itens.

Correção: Tipifique o campo como `[start, end]`. `dateValue` padrão é `"string"`. `"timestamp"` guarda milissegundos locais. `null` deixa a ponta aberta. Um escalar é erro de TypeScript. Um array no modelo compila; em desenvolvimento há aviso se o comprimento real não for 2.

## RAC-FIELD-BETWEEN

`match: "between"` não é `[from, to]`.

Correção: Guarde um par. Um escalar não casa com nenhuma linha. Em `Field<T>` também é erro de tipo.

## RAC-FIELD-CUSTOM

`type: "custom"` não tem `render` nem `component`.

Correção: Passe `render(context)` ou uma chave `component` de `config.fields`.

## RAC-FIELD-DUPLICATE

Dois campos compartilham `name`. `defaults` lança na montagem.

Correção: Nomes únicos. `title`, `tip`, `append` e `button` não têm nome.

## RAC-CSS-MISSING

Em desenvolvimento `--auto-text` não está em `:root`. Sem a folha de estilo a página quebra e o DOM não explica.

Correção: Uma vez: `import "@zeroman.yang/react-auto-components/style.css"`.

## RAC-TABLE-XLSX

`export("xlsx")` sem `exportXlsx`.

Correção: Importe `{ exportXlsx }` de `@zeroman.yang/react-auto-components/xlsx`. A UI mostra a frase traduzida.

## RAC-XLSX-DEP

`exceljs` não carregou. É uma `optionalDependency`.

Correção: `pnpm add exceljs`. CSV e JSON não precisam.

## RAC-TABLE-EXPORT-PAGE

Uma página remota veio vazia antes da última. Nenhum arquivo parcial é salvo.

Correção: Devolva um `total` estável e as linhas daquele `pageIndex`.

## RAC-TABLE-ROWID

`rowKey` falta ou se repete nas linhas carregadas.

Correção: Cada linha precisa de uma string estável e única.

## RAC-TABLE-ID

`id` está vazio. A chave seria `${namespace}:table:`.

Correção: Passe um id estável por tabela.

## RAC-COLUMN-COMPONENT

Se o `component` de uma coluna não estiver registrado em `config.columns` do `AutoConfigProvider`, o modo de desenvolvimento avisa com `RAC-COLUMN-COMPONENT` e a célula mantém o formato padrão. Registre a chave ou defina `render`, `format` ou `sort` na coluna. As funções da coluna têm prioridade.

## RAC-ROW-ACTION

Se uma ação de linha não tiver `onClick` e seu `action` não for uma chave conhecida de `config.rowActions`, ao selecioná-la a linha de status mostra `RAC-ROW-ACTION`. Forneça `onClick` ou registre a chave de `action`. Se ambos existirem, `onClick` tem prioridade.

## RAC-TABLE-SOURCE

`source` é uma chave de `config.sources` no `AutoConfigProvider`. Uma chave desconhecida mostra `RAC-TABLE-SOURCE` com um botão para tentar novamente. Registre a chave ou use `data` / `dataSource`. Forneça exatamente uma das três opções.

## RAC-TABLE-FILTER

O JSON do filtro não é uma consulta. O texto traduzido aparece e o filtro anterior fica.

Correção: Grupo `{ kind: "group", operator, children }`. Condição `{ kind: "condition", field, operator, value }`. `between` é `[from, to]`.

## RAC-QUERY-FIELD

`serializeRsql` recusou um nome fora de `/^[\\w.]+$/`.

Correção: Só letras, dígitos, sublinhado e pontos.

## RAC-DIALOG-PROVIDER

`useAutoDialog()` fora de `AutoDialogProvider`.

Correção: Envolva a árvore com `<AutoDialogProvider>`. `AutoConfigProvider` não fornece diálogos e é opcional. `<AutoDialog open>` não usa este hook.

## RAC-TABS-ROUTE-VALUE

Não passe `route` e `value` simultaneamente para `AutoTabs`. Se ambos forem fornecidos, `route` tem prioridade e o modo de desenvolvimento exibe `RAC-TABS-ROUTE-VALUE`. Omita `value` quando `AutoNavigation` controlar a seleção.
