# AutoForm

[English](../../auto-form.md) | [简体中文](../zh-CN/auto-form.md) | [繁體中文](../zh-TW/auto-form.md) | **日本語** | [한국어](../ko/auto-form.md) | [Español](../es/auto-form.md) | [Français](../fr/auto-form.md) | [Deutsch](../de/auto-form.md) | [Português (Brasil)](../pt-BR/auto-form.md) | [Русский](../ru/auto-form.md)

スキーマフォームです。`AutoSearch` と `AutoDialog` も内部で `AutoForm` を描くので、コールバックの規則は同じです。

`Field<T>` は `type` の判別共用体です。`options` のない `select`、スカラーの `daterange`、スカラー項目の `match: "between"` は TypeScript エラーです。`AnyField` と `unsafeField()` は逃げ道で、開発モードはなお警告します。コードは [errors.md](errors.md) です。

## 振る舞いとプロパティ

| プロパティ | 振る舞い |
| --- | --- |
| `fields` | `readonly Field<T>[]`。`type` を省くとテキスト入力です。`name` の重複はマウント時に `RAC-FIELD-DUPLICATE` を投げます。 |
| `value` | 制御値です。内部状態と違えばコピーしてエラーを消します。親が `onChange` を無視すると入力は戻ります。 |
| `defaultValue` | 非制御の初期値であり、リセット先です。フィールド側の `defaultValue` が欠けたキーを埋めます。 |
| `onSubmit(value)` | 検証のあとだけ呼ばれます。**reject または throw：値は残り、`error.message` を表示し、リセットしません。** |
| `columns` | 既定 `2`。`actions` の既定は `true` です。 |
| ラベル | `labelPosition` 既定 `"top"`。`labelWidth` 既定 `"auto"`（測定し、フィールド幅の 45% まで）。 |

## コールバックが throw したとき

| コールバック | 結果 |
| --- | --- |
| `onSubmit` | 捕捉します。下書きは残し、メッセージを出し、リセットしません。 |
| フィールド `rules` | そのフィールドのエラー文になります。後続の規則は走りません。 |
| フィールド `onChange` | 捕捉しません。直前の値が残ります。 |
| `upload` | 拒否は入力の下に出て、値は保存しません。`reset()` は `AbortSignal` を中止し、遅れた結果を捨てます。 |
| アップロード中の送信 | `validate()` は `false` を返し、`onSubmit` は呼びません。 |
| `hidden`、`disabled`、権限なし | そのフィールドは `required` でも検証しません。 |
| `required` が空 | `undefined`、`null`、`""`、空配列は送信を止めます。 |

`handle.validate()` は `true` か `false` を resolve し、投げません。

## 前提

`style.css` を一度読み込みます。開発モードで `--auto-text` が無いと `RAC-CSS-MISSING` です。`AutoConfigProvider` は任意で、ダイアログは提供しません。
