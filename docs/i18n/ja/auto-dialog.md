# AutoDialog

[English](../../auto-dialog.md) | [简体中文](../zh-CN/auto-dialog.md) | [繁體中文](../zh-TW/auto-dialog.md) | **日本語** | [한국어](../ko/auto-dialog.md) | [Español](../es/auto-dialog.md) | [Français](../fr/auto-dialog.md) | [Deutsch](../de/auto-dialog.md) | [Português (Brasil)](../pt-BR/auto-dialog.md) | [Русский](../ru/auto-dialog.md)

モーダルです。宣言的（`<AutoDialog open>`）か命令的（`useAutoDialog().open()`）です。`fields` は [AutoForm](auto-form.md) を描きます。

`useAutoDialog()` をプロバイダの外で呼ぶと `RAC-DIALOG-PROVIDER` です。宣言的な `<AutoDialog open>` にプロバイダは不要です。

## 振る舞いとプロパティ

| プロパティ | 振る舞い |
| --- | --- |
| `onSubmit(values)` | 検証のあと。**reject または throw：開いたまま `error.message` を出し、値は残ります。** resolve したあとも `beforeClose` が走ります。 |
| `beforeClose(reason)` | `"submit"`、`"cancel"`、`"close"`。**`false` で開いたまま。throw でも開いたまま、メッセージを出します。** |
| `onClose` | 実際に閉じたあとだけです。 |
| `draftKey` | `${namespace}:draft:${draftKey}` に下書きを置き、送信成功で消します。省略すると保存しません。 |
| `width` | 既定 `560`。`draggable` は全画面中は無視します。 |

`open()` の `close()` は、`beforeClose` が止めたとき `false` を resolve します。命令的ダイアログは重ねられます。

## 前提

`style.css` を一度。`AutoConfigProvider` は任意で、`AutoDialogProvider` の代わりにはなりません。`namespace` は `draftKey` のキーに入ります。
