# AutoTable

[English](../../auto-table.md) | [简体中文](../zh-CN/auto-table.md) | [繁體中文](../zh-TW/auto-table.md) | [日本語](../ja/auto-table.md) | [한국어](../ko/auto-table.md) | [Español](../es/auto-table.md) | [Français](../fr/auto-table.md) | **Deutsch** | [Português (Brasil)](../pt-BR/auto-table.md) | [Русский](../ru/auto-table.md)

Lokale oder entfernte Tabelle. Übergib genau eine Variante: `data`, `dataSource` oder `source`. Mehrere zugleich sind ein Typfehler. Suche folgt [AutoSearch](auto-search.md). Anlegen und Bearbeiten folgen [AutoDialog](auto-dialog.md) und [AutoForm](auto-form.md).

`exportXlsx` kommt aus `@zeroman.yang/react-auto-components/xlsx`. `exceljs` ist optional (`RAC-XLSX-DEP`, wenn es fehlt).

## Verhalten und Props

| Prop | Verhalten |
| --- | --- |
| `id` | Pflicht. Schlüssel ist `${namespace}:table:${id}`. Leer warnt `RAC-TABLE-ID`. |
| `rowKey` | Eindeutig in den geladenen Zeilen. Fehlend oder doppelt: `RAC-TABLE-ROWID`. Auswahl, Aufklappen und `scrollToRow` nutzen ihn. |
| `dataSource` | **Ablehnen: Meldung und Wiederholen-Schaltfläche. Abbruch wird ignoriert.** `total` ist die gesamte gefilterte Anzahl, nicht die Seitenlänge. |
| `pageSize` | Standard `10`. `pagination` Standard `true`. `height` Standard `440`. `"auto"` füllt einen Elternteil, der schon eine Höhe hat. |
| `onAdd`, `onEdit`, `onDelete` | **Ablehnen oder werfen: der Dialog bleibt offen und zeigt `error.message`.** Zeilen ändern sich nur, wenn dein Handler sie schon geändert hat. |
| `rowActions` | Eine Ablehnung von `onClick` wird abgefangen und etwa 2,5 Sekunden in der Statuszeile angezeigt. Die Zeile bleibt erhalten. Fehlt einer Zeilenaktion `onClick` und ist `action` kein bekannter Schlüssel in `config.rowActions`, zeigt die Statuszeile beim Auswählen `RAC-ROW-ACTION`. Übergib `onClick` oder registriere den Schlüssel für `action`. Sind beide gesetzt, hat `onClick` Vorrang. |
| `component` | Ist der Spaltenwert `component` nicht in `AutoConfigProvider` unter `config.columns` registriert, erscheint in der Entwicklung `RAC-COLUMN-COMPONENT`; die Zelle verwendet das Standardformat. Registriere den Schlüssel oder setze `render`, `format` oder `sort` auf der Spalte. Funktionen auf der Spalte haben Vorrang. |
| `source` | `source` bezeichnet einen Schlüssel in `AutoConfigProvider` unter `config.sources`. Ein unbekannter Schlüssel zeigt `RAC-TABLE-SOURCE` mit einer Schaltfläche zum Wiederholen. Registriere ihn oder verwende `data` / `dataSource`. Übergib genau eine der drei Varianten. |
| `exportXlsx` | Nur für xlsx nötig. Fehlt er, `RAC-TABLE-XLSX`. CSV und JSON sind eingebaut. |
| `toolbarActions` | Aktualisieren, Einstellungen, Export und JSON. Standard alle sichtbar. `false` blendet die vier Schaltflächen aus. Ein Objekt blendet nur Schaltflächen aus, die `false` sind. `handle.refresh()` und `handle.export()` bleiben verfügbar. Die JSON-Beschriftung ist der übersetzte Text `"JSON"`. |

`handle.export` resolved auch wenn der Status einen Fehler zeigt; er wirft nicht erneut. Entferntes `"filtered"` geht alle Seiten durch. Eine leere Seite vor der letzten wirft `RAC-TABLE-EXPORT-PAGE` und lädt keine halbe Datei herunter.

Ungültiges Filter-JSON zeigt den übersetzten Text, warnt `RAC-TABLE-FILTER` und behält den vorigen Filter. `between` hat die Länge 2. `in` ist ein Array.

`handle.reset()` löscht Sortierung, Filter und Auswahl und setzt das Layout auf die Spalten zurück. `scrollToRow` tut nichts, wenn die id nicht geladen ist.

## Voraussetzungen

`style.css` einmal importieren. Trenne `namespace`, wenn mehrere Apps derselben Origin Tabellen speichern; Standard ist `"auto"`. Die eingebauten Dialoge zum Anlegen und Bearbeiten brauchen kein `AutoDialogProvider`. Nur `useAutoDialog()` braucht es.
