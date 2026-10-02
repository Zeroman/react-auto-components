# AutoDialog

[English](../../auto-dialog.md) | [简体中文](../zh-CN/auto-dialog.md) | [繁體中文](../zh-TW/auto-dialog.md) | [日本語](../ja/auto-dialog.md) | [한국어](../ko/auto-dialog.md) | [Español](../es/auto-dialog.md) | [Français](../fr/auto-dialog.md) | [Deutsch](../de/auto-dialog.md) | **Português (Brasil)** | [Русский](../ru/auto-dialog.md)

Diálogo modal, declarativo (`<AutoDialog open>`) ou imperativo (`useAutoDialog().open()`). `fields` desenha um [AutoForm](auto-form.md).

`useAutoDialog()` fora do provedor lança `RAC-DIALOG-PROVIDER`. `<AutoDialog open>` não precisa do provedor.

## Comportamento e props

| Prop | Comportamento |
| --- | --- |
| `onSubmit(values)` | Depois da validação. **Rejeitar ou lançar: o diálogo continua aberto, mostra `error.message` e os valores ficam.** Depois do resolve, `beforeClose` ainda corre. |
| `beforeClose(reason)` | `"submit"`, `"cancel"` ou `"close"`. **`false` deixa aberto. Lançar também deixa aberto e mostra a mensagem.** |
| `onClose` | Só depois de fechar de verdade. |
| `draftKey` | Guarda o rascunho em `${namespace}:draft:${draftKey}` até um envio bem-sucedido. Omitido, nada é gravado. |
| `width` | Padrão `560`. `draggable` é ignorado em tela cheia. |

`close()` de `open()` resolve `false` se `beforeClose` bloquear. Diálogos imperativos empilham.

## Pré-condições

Importe `style.css` uma vez. `AutoConfigProvider` é opcional e não substitui `AutoDialogProvider`. `namespace` entra na chave do rascunho.
