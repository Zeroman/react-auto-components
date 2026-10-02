# Fehlercodes

[English](../../errors.md) | [简体中文](../zh-CN/errors.md) | [繁體中文](../zh-TW/errors.md) | [日本語](../ja/errors.md) | [한국어](../ko/errors.md) | [Español](../es/errors.md) | [Français](../fr/errors.md) | **Deutsch** | [Português (Brasil)](../pt-BR/errors.md) | [Русский](../ru/errors.md)

Entwicklerfehler werfen `RacError` oder rufen in der Entwicklung `console.warn` auf. Der Text ist immer Englisch.

```text
[Component] what is wrong.
Fix: what to change.
Code: RAC-…
Docs: https://github.com/Zeroman/react-auto-components/blob/main/docs/errors.md#rac-…
```

Oberflächentext bleibt bei `config.t`. `userKey` ist der englische Quellsatz, den der Host übersetzt. Konsole und Ausnahme bleiben Englisch.

## RAC-FIELD-OPTIONS

`type` ist `select`, `select-v2`, `radio`, `checkbox` oder `cascader`, und `options` fehlt oder ist leer.

Korrektur: Übergib `options` als Array oder `(values) => Option[]`. `autocomplete` darf sie weglassen.

## RAC-FIELD-RANGE

`daterange` oder `datetimerange` hat keinen Zwei-Element-Wert.

Korrektur: Typisiere das Feld als `[start, end]`. `dateValue` ist standardmäßig `"string"`. `"timestamp"` speichert lokale Millisekunden. `null` lässt das Ende offen. Ein Skalar ist ein TypeScript-Fehler. Ein Array im Modell kompiliert; die Entwicklung warnt, wenn die echte Länge nicht 2 ist.

## RAC-FIELD-BETWEEN

`match: "between"` ist nicht `[from, to]`.

Korrektur: Speichere ein Paar. Ein Skalar trifft keine Zeile. Auf `Field<T>` ist das ebenfalls ein Typfehler.

## RAC-FIELD-CUSTOM

`type: "custom"` hat weder `render` noch `component`.

Korrektur: Übergib `render(context)` oder einen `component`-Schlüssel aus `config.fields`.

## RAC-FIELD-DUPLICATE

Zwei Felder teilen sich `name`. `defaults` wirft beim Einhängen.

Korrektur: Eindeutige Namen. `title`, `tip`, `append` und `button` haben keinen Namen.

## RAC-CSS-MISSING

In der Entwicklung fehlt `--auto-text` auf `:root`. Ohne Stylesheet wirkt die Seite kaputt, und das DOM sagt nicht warum.

Korrektur: Einmal: `import "@zeroman.yang/react-auto-components/style.css"`.

## RAC-TABLE-XLSX

`export("xlsx")` ohne `exportXlsx`.

Korrektur: Importiere `{ exportXlsx }` aus `@zeroman.yang/react-auto-components/xlsx`. Die Oberfläche zeigt den übersetzten Satz.

## RAC-XLSX-DEP

`exceljs` ließ sich nicht laden. Es ist eine `optionalDependency`.

Korrektur: `pnpm add exceljs`. CSV und JSON brauchen es nicht.

## RAC-TABLE-EXPORT-PAGE

Eine entfernte Seite war vor der letzten leer. Es wird keine halbe Datei gespeichert.

Korrektur: Gib ein stabiles `total` und die Zeilen dieser `pageIndex` zurück.

## RAC-TABLE-ROWID

`rowKey` fehlt oder wiederholt sich in den geladenen Zeilen.

Korrektur: Jede Zeile braucht einen stabilen eindeutigen String.

## RAC-TABLE-ID

`id` ist leer. Der Schlüssel wäre `${namespace}:table:`.

Korrektur: Gib pro Tabelle eine stabile id.

## RAC-COLUMN-COMPONENT

Ist der Spaltenwert `component` nicht in `AutoConfigProvider` unter `config.columns` registriert, erscheint in der Entwicklung `RAC-COLUMN-COMPONENT`; die Zelle verwendet das Standardformat. Registriere den Schlüssel oder setze `render`, `format` oder `sort` auf der Spalte. Funktionen auf der Spalte haben Vorrang.

## RAC-ROW-ACTION

Fehlt einer Zeilenaktion `onClick` und ist `action` kein bekannter Schlüssel in `config.rowActions`, zeigt die Statuszeile beim Auswählen `RAC-ROW-ACTION`. Übergib `onClick` oder registriere den Schlüssel für `action`. Sind beide gesetzt, hat `onClick` Vorrang.

## RAC-TABLE-SOURCE

`source` bezeichnet einen Schlüssel in `AutoConfigProvider` unter `config.sources`. Ein unbekannter Schlüssel zeigt `RAC-TABLE-SOURCE` mit einer Schaltfläche zum Wiederholen. Registriere ihn oder verwende `data` / `dataSource`. Übergib genau eine der drei Varianten.

## RAC-TABLE-FILTER

Das Filter-JSON ist keine Abfrage. Der übersetzte Text erscheint, der vorige Filter bleibt.

Korrektur: Gruppe `{ kind: "group", operator, children }`. Bedingung `{ kind: "condition", field, operator, value }`. `between` ist `[from, to]`.

## RAC-QUERY-FIELD

`serializeRsql` lehnt einen Namen außerhalb `/^[\\w.]+$/` ab.

Korrektur: Nur Buchstaben, Ziffern, Unterstrich und Punkte.

## RAC-DIALOG-PROVIDER

`useAutoDialog()` außerhalb von `AutoDialogProvider`.

Korrektur: Umschließe den Baum mit `<AutoDialogProvider>`. `AutoConfigProvider` liefert keine Dialoge und ist optional. `<AutoDialog open>` nutzt diesen Hook nicht.
