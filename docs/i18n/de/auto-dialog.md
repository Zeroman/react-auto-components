# AutoDialog

[English](../../auto-dialog.md) | [简体中文](../zh-CN/auto-dialog.md) | [繁體中文](../zh-TW/auto-dialog.md) | [日本語](../ja/auto-dialog.md) | [한국어](../ko/auto-dialog.md) | [Español](../es/auto-dialog.md) | [Français](../fr/auto-dialog.md) | **Deutsch** | [Português (Brasil)](../pt-BR/auto-dialog.md) | [Русский](../ru/auto-dialog.md)

Modaldialog, deklarativ (`<AutoDialog open>`) oder imperativ (`useAutoDialog().open()`). `fields` zeichnet ein [AutoForm](auto-form.md).

`useAutoDialog()` außerhalb des Providers wirft `RAC-DIALOG-PROVIDER`. `<AutoDialog open>` braucht den Provider nicht.

## Verhalten und Props

| Prop | Verhalten |
| --- | --- |
| `onSubmit(values)` | Nach der Prüfung. **Ablehnen oder werfen: der Dialog bleibt offen, zeigt `error.message`, Werte bleiben.** Nach resolve läuft `beforeClose` noch. |
| `beforeClose(reason)` | `"submit"`, `"cancel"` oder `"close"`. **`false` lässt ihn offen. Werfen lässt ihn ebenfalls offen und zeigt die Meldung.** |
| `onClose` | Nur nachdem wirklich geschlossen wurde. |
| `draftKey` | Speichert den Entwurf unter `${namespace}:draft:${draftKey}`, bis das Absenden gelingt. Weggelassen wird nichts gespeichert. |
| `width` | Standard `560`. `draggable` wird im Vollbild ignoriert. |

`close()` von `open()` resolved `false`, wenn `beforeClose` das Schließen blockiert. Imperative Dialoge stapeln sich.

## Voraussetzungen

`style.css` einmal importieren. `AutoConfigProvider` ist optional und ersetzt `AutoDialogProvider` nicht. `namespace` gehört zum Entwurfsschlüssel.
