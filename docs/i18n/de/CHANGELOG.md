# Änderungsprotokoll

[English](../../CHANGELOG.md) | [简体中文](../zh-CN/CHANGELOG.md) | [繁體中文](../zh-TW/CHANGELOG.md) | [日本語](../ja/CHANGELOG.md) | [한국어](../ko/CHANGELOG.md) | [Español](../es/CHANGELOG.md) | [Français](../fr/CHANGELOG.md) | **Deutsch** | [Português (Brasil)](../pt-BR/CHANGELOG.md) | [Русский](../ru/CHANGELOG.md)

## Noch nicht veröffentlicht

- Eingebaute UI-Texte sind standardmäßig Englisch, und diese Zeichenkette ist der `config.t`-Schlüssel. Für andere Sprachen `t` übergeben. Frühere chinesische Schlüssel wie `提交` und `刷新` sind nicht mehr der Standard.
- Das Suchformular heißt `AutoSearch` (`AutoSearchProps`). `AutoSearchPanel` und `AutoSearchPanelProps` bleiben veraltete Aliase.
- `Field<T>` ist eine diskriminierte Union. `select` ohne `options`, ein Skalar auf `daterange` oder `datetimerange` und `match: "between"` auf einem Skalar sind TypeScript-Fehler. `AnyField` und `unsafeField()` bleiben der Ausweg.
- Entwicklerfehler sind englische `RacError`s mit Komponente, Korrektur und Code. Siehe [errors.md](errors.md). Der Entwicklungsmodus warnt bei fehlendem Stylesheet, leerer Tabellen-Id, doppelten `rowKey`s, Auswahlfeldern ohne Options und Bereichswerten, die kein Paar sind.
- `AutoConfigProvider` nimmt JSON-Register an: `config.fields`, `config.columns`, `config.rowActions` und `config.sources`. Ein Schlüssel löst `Field.component`, `render` / `format` / `sort` / `exportFormat` der Spalte, `RowAction.action` und `AutoTable` `source` auf. Eine Funktion am Feld, an der Spalte oder an der Aktion gewinnt. Verschachtelte Provider werden zusammengeführt, spätere Schlüssel gewinnen. Genau eines von `data`, `dataSource` oder `source` übergeben. Eine unbekannte Quelle zeigt `RAC-TABLE-SOURCE` und einen erneuten Versuch.
- Stabile `data-testid="rac-*"` für Felder, Tabellen, Suche, Formulare und Dialoge. Sie folgen nicht der übersetzten Beschriftung.
- `useAutoTabsWorkspace` öffnet, wechselt und schließt dynamische Tabs, mit angehefteten Tabs und optionalem Session-Speicher. Ein Tab kann `closable`, `lazy`, `disabled` oder `loading` sein.
- Verhalten: [AutoForm](auto-form.md), [AutoSearch](auto-search.md), [AutoTable](auto-table.md), [AutoDialog](auto-dialog.md), [AutoTabs](auto-tabs.md), [AutoMenu](auto-menu.md). `llms.txt` im Paketstamm ist der Einstieg für Agenten.
- Ein `v*`-Tag veröffentlicht über GitHub Actions Trusted Publishing auf npm. `./run.sh release` erhöht die Patch-Version auf einem sauberen `main`.

## 0.1.2 - 2026-10-01

- Veröffentlichung als `@zeroman.yang/react-auto-components`. Der npm-Scope `@zeroman` gehört einem anderen Konto.

- AutoChat hinzugefügt: vom Aufrufer kontrolliertes Nachrichten-Rendering, Streaming-Follow, Verlaufs-Anker, optionaler Composer und Demo in zehn Sprachen; keine neuen Laufzeitabhängigkeiten.
- Die Online-Demo zeigt jetzt den echten Quellcode jedes Beispiels in einem Dialog „Code anzeigen“ – mit Datei-Tabs, Ein-Klick-Kopieren und GitHub-Links.
- Schemagesteuerte React-19-Komponenten: AutoForm, AutoSearchPanel, AutoTable, AutoDialog, AutoTabs und AutoMenu.
- Globale Größe und Dichte, Layouts für Formularbeschriftungen, gespeicherte Tabelleneinstellungen und optionaler XLSX-Export.
- Ein Verbraucherprojekt mit echtem Tarball, Unit-Tests, Typprüfungen und Chromium-Interaktionstests.
- MIT-Lizenz, Beitragsleitfaden, GitHub-CI, Issue-Vorlagen sowie Anleitungen zur npm-Kontoeinrichtung und Veröffentlichung.
- Englische Dokumentation als Standard, mit vollständigen Übersetzungen und Sprachwechsel-Links.
