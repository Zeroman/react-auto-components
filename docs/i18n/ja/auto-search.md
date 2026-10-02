# AutoSearch

[English](../../auto-search.md) | [简体中文](../zh-CN/auto-search.md) | [繁體中文](../zh-TW/auto-search.md) | **日本語** | [한국어](../ko/auto-search.md) | [Español](../es/auto-search.md) | [Français](../fr/auto-search.md) | [Deutsch](../de/auto-search.md) | [Português (Brasil)](../pt-BR/auto-search.md) | [Русский](../ru/auto-search.md)

検索フォームです。内部の `AutoForm` が `QueryNode` と生の値を出します。フィールドの throw は [AutoForm](auto-form.md) と同じです。

`AutoSearchPanel` と `AutoSearchPanelProps` は `AutoSearch` と `AutoSearchProps` の非推奨エイリアスです。

## 振る舞いとプロパティ

| プロパティ | 振る舞い |
| --- | --- |
| `onSearch(query, values)` | 必須です。**throw または reject：内部フォームが捕捉し、値は残り、`error.message` を出します。リセットはしません。** |
| `mode` | 既定 `"manual"`（検索ボタン）。`"instant"` は変更のたびにも検索します。 |
| `columns` | 既定 `3`。 |
| `more: true` | 「さらに」を開くまで隠します。隠したフィールドはクエリに入りません。 |

## クエリの値

| `match` | 値 |
| --- | --- |
| 省略 | `"eq"`。配列なら `"in"`。 |
| `"contains"` | 部分文字列。`ignoreCase: true` で大文字小文字を畳みます。 |
| `"between"` | `[from, to]`。スカラーは `RAC-FIELD-BETWEEN` を警告し、行に一致しません。 |
| `"isNull"` | null または undefined。入力値は無視します。 |
| 空 | `undefined`、`null`、`""`、空配列は省きます。`"isNull"` は例外です。 |

リセットは `defaultValue` に戻してから検索します。フィールド名が `/^[\w.]+$/` でないと `serializeRsql` は `RAC-QUERY-FIELD` を投げます。

## 前提

`style.css` を一度。`AutoConfigProvider` は任意です。

アプリのエントリーで `import "@zeroman.yang/react-auto-components/style.css"` を一度読み込んでください。スタイルシートがない場合、開発時に `RAC-CSS-MISSING` を警告します。
