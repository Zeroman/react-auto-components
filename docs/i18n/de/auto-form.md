# AutoForm

[English](../../auto-form.md) | [简体中文](../zh-CN/auto-form.md) | [繁體中文](../zh-TW/auto-form.md) | [日本語](../ja/auto-form.md) | [한국어](../ko/auto-form.md) | [Español](../es/auto-form.md) | [Français](../fr/auto-form.md) | **Deutsch** | [Português (Brasil)](../pt-BR/auto-form.md) | [Русский](../ru/auto-form.md)

Schema-Formular. `AutoSearch` und `AutoDialog` zeichnen ein `AutoForm`, deshalb gelten diese Callback-Regeln auch dort.

`Field<T>` ist eine nach `type` unterschiedene Union. `select` ohne `options`, ein Skalar bei `daterange` und `match: "between"` auf einem Skalar sind TypeScript-Fehler. `AnyField` und `unsafeField()` sind der Ausweg; der Entwicklungsmodus warnt weiter. Codes in [errors.md](errors.md).

## Verhalten und Props

| Prop | Verhalten |
| --- | --- |
| `fields` | `readonly Field<T>[]`. Ohne `type` ist es ein Textfeld. Ein doppelter `name` wirft beim Einhängen `RAC-FIELD-DUPLICATE`. |
| `value` | Kontrollierter Wert. Weicht er vom inneren Zustand ab, kopiert das Formular ihn und löscht Fehler. Ignoriert der Parent `onChange`, springt die Eingabe zurück. |
| `onSubmit(value)` | Nur nach bestandener Prüfung. **Ablehnen oder werfen: Werte bleiben, `error.message` wird gezeigt, kein Reset.** |
| `columns` | Standard `2`. `actions` Standard `true`. |
| Beschriftung | `labelPosition` Standard `"top"`. `labelWidth` Standard `"auto"` (gemessen, höchstens 45 % der Feldbreite). |

## Wenn ein Callback wirft

| Callback | Ergebnis |
| --- | --- |
| `onSubmit` | Gefangen. Entwurf bleibt. Meldung wird gezeigt. Kein Reset. |
| Feld-`rules` | Die geworfene Meldung wird der Feldfehler. Spätere Regeln laufen nicht. |
| Feld-`onChange` | Nicht gefangen. Der vorige Wert bleibt. |
| `upload` | Ablehnung steht unter dem Feld, nichts wird gespeichert. `reset()` bricht das Signal ab und verwirft ein spätes Ergebnis. |
| Absenden während eines Uploads | `validate()` liefert `false` und ruft `onSubmit` nicht auf. |
| `hidden`, `disabled` oder ohne Zugriff | Dieses Feld wird nicht geprüft, auch wenn es `required` ist. |
| Leeres `required` | `undefined`, `null`, `""` oder ein leeres Array blockieren das Absenden. |

`handle.validate()` resolved `true` oder `false`. Es wirft nicht.

## Voraussetzungen

`style.css` einmal importieren. Fehlt `--auto-text`, warnt die Entwicklung mit `RAC-CSS-MISSING`. `AutoConfigProvider` ist optional und mountet keine Dialoge.
