# AutoTabs

[English](../../auto-tabs.md) | [简体中文](../zh-CN/auto-tabs.md) | [繁體中文](../zh-TW/auto-tabs.md) | [日本語](../ja/auto-tabs.md) | [한국어](../ko/auto-tabs.md) | [Español](../es/auto-tabs.md) | [Français](../fr/auto-tabs.md) | **Deutsch** | [Português (Brasil)](../pt-BR/auto-tabs.md) | [Русский](../ru/auto-tabs.md)

Reiter. Verschachtelte Reiter sind ein weiteres `AutoTabs` aus `children`. Für eine Seitenleiste [AutoMenu](auto-menu.md).

## Verhalten und Props

| Prop | Verhalten |
| --- | --- |
| `items` | Jeder Reiter braucht eine stabile `id`. `hidden` und ein gescheitertes `canAccess` entfernen ihn. |
| `value` | Kontrollierter id-Pfad von der Wurzel. Verschachtelt ist `["parent", "child"]`. |
| `onChange(path, item)` | **Nicht gefangen.** Wirft er, meldet React den Fehler. Im kontrollierten Modus bleibt der noch nicht übernommene Pfad beim vorigen. |
| `mode` | Standard `"horizontal"`. `"vertical"` stapelt die Liste. |
| `keepMounted` | Standard `true`: inaktive Panels bleiben eingehängt. `false` hängt sie aus. |
| `onRefresh` | Wenn gesetzt, gibt es eine Aktualisieren-Schaltfläche. **Nicht gefangen.** |
| `disabled` | Bleibt sichtbar und ist nicht wählbar. Die Standardauswahl überspringt deaktivierte Reiter. |

## Voraussetzungen

`style.css` einmal importieren (`RAC-CSS-MISSING` in der Entwicklung). `AutoConfigProvider` ist optional.

## Dynamische Tabs

`useAutoTabsWorkspace` öffnet und schließt Seiten ohne Router. Geben Sie `tabsProps` an `AutoTabs` weiter. `open` mit derselben id wählt nur diesen Tab und behält den Entwurf. Ein angehefteter Tab lässt sich nicht schließen. Warten Sie auf `ready`, bevor Sie `open` aufrufen. Auswahl, `params` und `state` kommen nach dem Mount aus `sessionStorage` zurück. Gibt `beforeClose` `false` zurück oder wirft es, bleibt der Tab offen. Das Beispiel steht in [DynamicTabsDemo.tsx](../../../test-project/src/examples/DynamicTabsDemo.tsx).
