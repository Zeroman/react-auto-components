# AutoMenu

[English](../../auto-menu.md) | [简体中文](../zh-CN/auto-menu.md) | [繁體中文](../zh-TW/auto-menu.md) | [日本語](../ja/auto-menu.md) | [한국어](../ko/auto-menu.md) | [Español](../es/auto-menu.md) | [Français](../fr/auto-menu.md) | **Deutsch** | [Português (Brasil)](../pt-BR/auto-menu.md) | [Русский](../ru/auto-menu.md)

Seitenleiste. Für Panels [AutoTabs](auto-tabs.md).

## Verhalten und Props

| Prop | Verhalten |
| --- | --- |
| `items` | `id` ist im Baum eindeutig. `hidden` und ein gescheitertes `canAccess` verwerfen den Eintrag. Ein `children`, das auf einen Vorfahren zeigt, wird ganz verworfen, damit ein schlechtes Schema nicht rekursiert. |
| `value` | Id des gewählten Blatts. Weggelassen bleibt die Auswahl intern. |
| `onChange(id, item, path)` | **Nicht gefangen.** `path` ist die id-Kette von der Wurzel zum Blatt. Ein Elternteil mit Kindern schaltet nur die Aufklappung um und wird nicht gewählt. |
| `collapsible` | Standard `false`. Ist `collapsed` kontrolliert, musst du es in `onCollapsedChange` selbst setzen, sonst bewegt sich die Leiste nicht. **`onCollapsedChange` wird nicht gefangen.** |
| `disabled` | Deaktiviert den Eintrag und seine Nachkommen. Die Auswahl überspringt sie. |

Ein Blatt zu wählen navigiert nicht von selbst. Das einzige Signal ist `onChange`.

## Voraussetzungen

`style.css` einmal importieren. `AutoConfigProvider` ist optional. Rechte laufen über `config.canAccess`.

Importiere einmal im App-Einstieg `import "@zeroman.yang/react-auto-components/style.css"`. Ohne Stylesheet erscheint in der Entwicklung `RAC-CSS-MISSING`.
