# AutoSearch

[English](../../auto-search.md) | [简体中文](../zh-CN/auto-search.md) | [繁體中文](../zh-TW/auto-search.md) | [日本語](../ja/auto-search.md) | [한국어](../ko/auto-search.md) | [Español](../es/auto-search.md) | [Français](../fr/auto-search.md) | **Deutsch** | [Português (Brasil)](../pt-BR/auto-search.md) | [Русский](../ru/auto-search.md)

Suchformular. Es zeichnet ein `AutoForm` und gibt einen `QueryNode` plus die Werte aus. Wirft ein Feld-Callback, gelten die Regeln von [AutoForm](auto-form.md).

`AutoSearchPanel` und `AutoSearchPanelProps` sind veraltete Aliase von `AutoSearch` und `AutoSearchProps`.

## Verhalten und Props

| Prop | Verhalten |
| --- | --- |
| `onSearch(query, values)` | Pflicht. **Werfen oder ablehnen: das innere Formular fängt es, Werte bleiben, `error.message` wird gezeigt. Kein Reset.** |
| `mode` | Standard `"instant"`: sucht bei Änderungen, Absenden und Zurücksetzen. `"manual"` sucht nur beim Absenden oder Zurücksetzen. |
| `columns` | Standard `3`. |
| `more: true` | Versteckt das Feld, bis „Mehr“ geöffnet wird. Versteckte Felder fehlen in der Abfrage. |

| `match` | Wert |
| --- | --- |
| weggelassen | `"eq"`, oder `"in"` wenn der Wert ein Array ist. |
| `"contains"` | Teilstring. `ignoreCase: true` ignoriert Großschreibung. |
| `"between"` | `[from, to]`. Ein Skalar warnt `RAC-FIELD-BETWEEN` und trifft keine Zeile. |
| `"isNull"` | Trifft null oder undefined. Der eingegebene Wert wird ignoriert. |
| leer | `undefined`, `null`, `""` und leere Arrays entfallen, außer `"isNull"`. |

Reset stellt `defaultValue` wieder her und sucht dann. `serializeRsql` wirft `RAC-QUERY-FIELD`, wenn der Name nicht `/^[\w.]+$/` ist.

## Voraussetzungen

`style.css` einmal importieren. `AutoConfigProvider` ist optional.

Importiere einmal im App-Einstieg `import "@zeroman.yang/react-auto-components/style.css"`. Ohne Stylesheet erscheint in der Entwicklung `RAC-CSS-MISSING`.
