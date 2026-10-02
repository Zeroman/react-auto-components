# AutoTable

[English](../../auto-table.md) | [简体中文](../zh-CN/auto-table.md) | [繁體中文](../zh-TW/auto-table.md) | [日本語](../ja/auto-table.md) | [한국어](../ko/auto-table.md) | [Español](../es/auto-table.md) | [Français](../fr/auto-table.md) | [Deutsch](../de/auto-table.md) | **Português (Brasil)** | [Русский](../ru/auto-table.md)

Tabela local ou remota. Passe exatamente um de `data`, `dataSource` ou `source`; combinar vários é um erro de tipo. A busca segue [AutoSearch](auto-search.md). Inclusão e edição seguem [AutoDialog](auto-dialog.md) e [AutoForm](auto-form.md).

`exportXlsx` vem de `@zeroman.yang/react-auto-components/xlsx`. `exceljs` é opcional (`RAC-XLSX-DEP` se faltar).

## Comportamento e props

| Prop | Comportamento |
| --- | --- |
| `id` | Obrigatório. A chave é `${namespace}:table:${id}`. Vazio avisa `RAC-TABLE-ID`. |
| `rowKey` | Único nas linhas carregadas. Ausente ou duplicado: `RAC-TABLE-ROWID`. Seleção, expansão e `scrollToRow` usam isso. |
| `dataSource` | **Rejeitar: mostra a mensagem e um botão de tentar de novo. O abort é ignorado.** `total` é a contagem filtrada inteira, não o tamanho da página. |
| `pageSize` | Padrão `10`. `pagination` padrão `true`. `height` padrão `440`. `"auto"` preenche um pai que já tem altura. |
| `onAdd`, `onEdit`, `onDelete` | **Rejeitar ou lançar: o diálogo continua aberto e mostra `error.message`.** As linhas só mudam se o seu handler já as tiver mudado. |
| `rowActions` | A rejeição de `onClick` é capturada e exibida na linha de status por cerca de 2,5 segundos. A linha permanece. Se uma ação de linha não tiver `onClick` e seu `action` não for uma chave conhecida de `config.rowActions`, ao selecioná-la a linha de status mostra `RAC-ROW-ACTION`. Forneça `onClick` ou registre a chave de `action`. Se ambos existirem, `onClick` tem prioridade. |
| `component` | Se o `component` de uma coluna não estiver registrado em `config.columns` do `AutoConfigProvider`, o modo de desenvolvimento avisa com `RAC-COLUMN-COMPONENT` e a célula mantém o formato padrão. Registre a chave ou defina `render`, `format` ou `sort` na coluna. As funções da coluna têm prioridade. |
| `source` | `source` é uma chave de `config.sources` no `AutoConfigProvider`. Uma chave desconhecida mostra `RAC-TABLE-SOURCE` com um botão para tentar novamente. Registre a chave ou use `data` / `dataSource`. Forneça exatamente uma das três opções. |
| `exportXlsx` | Só é necessário para xlsx. Se faltar, `RAC-TABLE-XLSX`. CSV e JSON são internos. |

`handle.export` resolve mesmo se o status mostrar um erro; não relança. `"filtered"` remoto percorre todas as páginas. Uma página vazia antes da última lança `RAC-TABLE-EXPORT-PAGE` e não baixa um arquivo parcial.

JSON de filtro inválido mostra o texto traduzido, avisa `RAC-TABLE-FILTER` e mantém o filtro anterior. `between` tem comprimento 2. `in` é um array.

`handle.reset()` limpa ordenação, filtro e seleção e devolve o layout às colunas. `scrollToRow` não faz nada se o id não estiver carregado.

## Pré-condições

Importe `style.css` uma vez. Separe `namespace` se vários apps na mesma origem persistem tabelas; o padrão é `"auto"`. Os diálogos internos de inclusão e edição não precisam de `AutoDialogProvider`. Só `useAutoDialog()` precisa.
