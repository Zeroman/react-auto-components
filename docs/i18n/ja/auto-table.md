# AutoTable

[English](../../auto-table.md) | [简体中文](../zh-CN/auto-table.md) | [繁體中文](../zh-TW/auto-table.md) | **日本語** | [한국어](../ko/auto-table.md) | [Español](../es/auto-table.md) | [Français](../fr/auto-table.md) | [Deutsch](../de/auto-table.md) | [Português (Brasil)](../pt-BR/auto-table.md) | [Русский](../ru/auto-table.md)

ローカルまたはリモートの表です。`data`、`dataSource`、`source` の一つだけを指定します。複数を同時に渡すと型エラーです。検索は [AutoSearch](auto-search.md)、追加と編集は [AutoDialog](auto-dialog.md) と [AutoForm](auto-form.md) に従います。

`exportXlsx` は `@zeroman.yang/react-auto-components/xlsx` から読みます。`exceljs` は任意依存です（無ければ `RAC-XLSX-DEP`）。

## 振る舞いとプロパティ

| プロパティ | 振る舞い |
| --- | --- |
| `id` | 必須。設定キーは `${namespace}:table:${id}`。空なら `RAC-TABLE-ID`。 |
| `rowKey` | 読み込んだ行で一意。欠落や重複は `RAC-TABLE-ROWID`。選択、展開、`scrollToRow` が使います。 |
| `dataSource` | **reject：メッセージと再試行ボタン。abort は無視します。** `{ rows, total }` の `total` は絞り込み後の全件数です。 |
| `pageSize` | 既定 `10`。`pagination` 既定 `true`。`height` 既定 `440`。`"auto"` は高さが決まった親を埋めます。 |
| `onAdd`、`onEdit`、`onDelete` | **reject または throw：ダイアログは開いたまま `error.message` を出します。** ハンドラがデータを変えていなければ行は変わりません。 |
| `rowActions` | `onClick` の拒否は捕捉され、約 2.5 秒間ステータス行に表示されます。行は削除されません。 行アクションに `onClick` がなく、`action` が `config.rowActions` の登録済みキーでもない場合、選択時にステータス行へ `RAC-ROW-ACTION` を表示します。`onClick` を指定するか `action` のキーを登録してください。両方ある場合は `onClick` が優先されます。 |
| `component` | 列の `component` が `AutoConfigProvider` の `config.columns` に未登録の場合、開発時に `RAC-COLUMN-COMPONENT` を警告し、セルは既定の書式を使います。キーを登録するか、列に `render`、`format`、`sort` を指定してください。列に直接指定した関数が優先されます。 |
| `source` | `source` は `AutoConfigProvider` の `config.sources` のキーです。未知のキーでは `RAC-TABLE-SOURCE` と再試行ボタンを表示します。キーを登録するか `data` / `dataSource` を使ってください。三つのうち一つだけ指定します。 |
| `exportXlsx` | xlsx だけ必要です。無いと `RAC-TABLE-XLSX`。CSV と JSON は組み込みです。 |
| `toolbarActions` | 更新、設定、エクスポート、JSON。既定では全部表示。`false` で4つとも隠します。オブジェクトは `false` のボタンだけ隠します。`handle.refresh()` と `handle.export()` は使えます。JSON のラベルは翻訳キー `"JSON"` です。 |

`handle.export` はステータスにエラーが出ても resolve し、投げ直しません。リモートの `"filtered"` は全ページを歩きます。最後より前の空ページは `RAC-TABLE-EXPORT-PAGE` で、部分ファイルは保存しません。

設定の不正なフィルタ JSON は翻訳された "Invalid filter" を出し、`RAC-TABLE-FILTER` を警告し、前のフィルタを残します。`between` は長さ 2、`in` は配列です。

`handle.reset()` は並べ替え、フィルタ、選択を消し、レイアウトを列の既定に戻します。`scrollToRow` は未読み込みの id では何もしません。

## 前提

`style.css` を一度。同じオリジンの複数アプリは `namespace` を分けます。既定は `"auto"` です。組み込みの追加・編集ダイアログに `AutoDialogProvider` は不要です。`useAutoDialog()` だけが必要です。
