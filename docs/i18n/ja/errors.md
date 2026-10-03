# エラーコード

[English](../../errors.md) | [简体中文](../zh-CN/errors.md) | [繁體中文](../zh-TW/errors.md) | **日本語** | [한국어](../ko/errors.md) | [Español](../es/errors.md) | [Français](../fr/errors.md) | [Deutsch](../de/errors.md) | [Português (Brasil)](../pt-BR/errors.md) | [Русский](../ru/errors.md)

開発者向けの失敗は `RacError` を投げるか、開発モードで `console.warn` します。本文は常に英語です。

```text
[Component] 何が違うか。
Fix: どう直すか。
Code: RAC-…
Docs: https://github.com/Zeroman/react-auto-components/blob/main/docs/errors.md#rac-…
```

画面の文言は `config.t` のままです。`userKey` は英語のソース文で、ホストが翻訳します。コンソールと例外は英語のままです。

## RAC-FIELD-OPTIONS

`type` が `select`、`select-v2`、`radio`、`checkbox`、`cascader` なのに `options` が無い、または空配列です。

修正: `options` に配列か `(values) => Option[]` を渡します。`autocomplete` は省略できます。テキスト欄に任意の候補を出すだけです。

## RAC-FIELD-RANGE

`type` が `daterange` または `datetimerange` で、モデルまたは現在値が長さ 2 の配列ではありません。

修正: フィールドを `[start, end]` にします。`dateValue` の既定は `"string"`（`YYYY-MM-DD`）です。`"timestamp"` はローカル時刻のエポックミリ秒です。`null` はその端を開きにします。スカラーは TypeScript エラーです。配列型のモデルはコンパイルできますが、長さが 2 でなければ開発モードが警告します。

## RAC-FIELD-BETWEEN

`match: "between"` の値が `[from, to]` ではありません。

修正: 二分タプルを保存します。スカラーは行に一致しません。`Field<T>` でも型エラーです。

## RAC-FIELD-CUSTOM

`type: "custom"` に `render` も `component` もありません。

修正: `render(context)` を渡すか、`component` を `config.fields` のキーにします。

## RAC-FIELD-DUPLICATE

同じ `name` が二つあります。マウント中に `defaults` が投げます。

修正: 名前を一意にします。`title`、`tip`、`append`、`button` は名前が無く、検査しません。

## RAC-CSS-MISSING

開発モードで `:root` の `--auto-text` が空です。スタイルシートがこの変数を定義します。未読込だとページは崩れ、DOM からは原因が分かりません。

修正: エントリで一度 `import "@zeroman.yang/react-auto-components/style.css"`。

## RAC-TABLE-XLSX

`export("xlsx")` で `exportXlsx` がありません。

修正: `import { exportXlsx } from "@zeroman.yang/react-auto-components/xlsx"` して `exportXlsx={exportXlsx}`。画面には翻訳された "Configure the XLSX export adapter" が出ます。

## RAC-XLSX-DEP

`exceljs` を読めません。`optionalDependency` なので通常のインストールでは省略され得ます。

修正: `pnpm add exceljs`。CSV と JSON には不要です。

## RAC-TABLE-EXPORT-PAGE

リモート書き出しで、最終ページより前に空ページが返り、ファイルは保存しません。

修正: 安定した `total` と、その `pageIndex` の行を返します。画面は翻訳された "Export data is incomplete. Try again." です。

## RAC-TABLE-ROWID

読み込んだ行で `rowKey` が欠けるか重複しています。開発時の警告です。

修正: 行ごとに安定した一意の文字列。選択、展開、`scrollToRow` が使います。

## RAC-TABLE-ID

`id` が空で、設定キーが `${namespace}:table:` になります。

修正: テーブルごとに安定した id を渡します。

## RAC-COLUMN-COMPONENT

列の `component` が `AutoConfigProvider` の `config.columns` に未登録の場合、開発時に `RAC-COLUMN-COMPONENT` を警告し、セルは既定の書式を使います。キーを登録するか、列に `render`、`format`、`sort` を指定してください。列に直接指定した関数が優先されます。

## RAC-ROW-ACTION

行アクションに `onClick` がなく、`action` が `config.rowActions` の登録済みキーでもない場合、選択時にステータス行へ `RAC-ROW-ACTION` を表示します。`onClick` を指定するか `action` のキーを登録してください。両方ある場合は `onClick` が優先されます。

## RAC-TABLE-SOURCE

`source` は `AutoConfigProvider` の `config.sources` のキーです。未知のキーでは `RAC-TABLE-SOURCE` と再試行ボタンを表示します。キーを登録するか `data` / `dataSource` を使ってください。三つのうち一つだけ指定します。

## RAC-TABLE-FILTER

設定のフィルタ JSON がクエリではありません。翻訳された "Invalid filter" を表示し、前のフィルタを残します。

修正: グループは `{ kind: "group", operator: "and" | "or", children }`。条件は `{ kind: "condition", field, operator, value }`。`field` は列キー。`between` は `[from, to]`。`in` は配列です。

## RAC-QUERY-FIELD

`serializeRsql` が `/^[\w.]+$/` でないフィールド名を拒否しました。

修正: 英数字、アンダースコア、ドットだけ。直列化の前に列名をマップします。

## RAC-DIALOG-PROVIDER

`AutoDialogProvider` の外で `useAutoDialog()` を呼びました。

修正: その木を `<AutoDialogProvider>` で包みます。`AutoConfigProvider` はダイアログを提供せず、任意です。宣言的な `<AutoDialog open>` はこのフックを使いません。

## RAC-TABS-ROUTE-VALUE

`AutoTabs` に `route` と `value` を同時に渡さないでください。両方を指定すると `route` が優先され、開発モードで `RAC-TABS-ROUTE-VALUE` が表示されます。`AutoNavigation` が選択を管理する場合は `value` を省略してください。
