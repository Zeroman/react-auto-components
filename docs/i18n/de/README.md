# React Auto Components

[English](../../../README.md) | [简体中文](../zh-CN/README.md) | [繁體中文](../zh-TW/README.md) | [日本語](../ja/README.md) | [한국어](../ko/README.md) | [Español](../es/README.md) | [Français](../fr/README.md) | **Deutsch** | [Português (Brasil)](../pt-BR/README.md) | [Русский](../ru/README.md)

Eine eigenständige, schema-getriebene Komponentenbibliothek für React 19 – mit Formularen, Tabellen und Chat. Gebaut mit TypeScript, TanStack Table 9 / Form / Virtual, Radix und Floating UI, ohne Ant Design, Element Plus oder MUI. Die Library-Builds verwenden den React Compiler.

[![Auto Studio Demo-Vorschau](../../assets/demo.png)](https://zeroman.github.io/react-auto-components/)

<p align="center">
  <a href="https://zeroman.github.io/react-auto-components/"><strong>🚀 Live-Demo (GitHub Pages)</strong></a> · <a href="#eigenständiges-testprojekt-starten">Lokal ausführen</a> · <a href="#komponenten">Komponenten</a>
</p>

## Projektstatus

Die aktuelle Version ist 0.1.2, und die APIs können sich noch ändern. React 19 wird vorausgesetzt. Das Paket stellt ESM- und TypeScript-Deklarationen bereit. Der eingebaute Oberflächentext ist standardmäßig Englisch und kann über AutoConfigProvider.config.t übersetzt werden.

Installation mit `pnpm add @zeroman.yang/react-auto-components` (npm und yarn funktionieren ebenso). Peer Dependencies sind React 19 und react-dom 19. Importieren Sie das Stylesheet einmal: `import "@zeroman.yang/react-auto-components/style.css"`.

Importiere einmal im App-Einstieg `import "@zeroman.yang/react-auto-components/style.css"`. Ohne Stylesheet erscheint in der Entwicklung `RAC-CSS-MISSING`.

Beim XLSX-Export bedeutet `RAC-TABLE-XLSX`, dass der Adapter `exportXlsx` fehlt; `RAC-XLSX-DEP` bedeutet, dass die optionale Abhängigkeit `exceljs` nicht geladen werden konnte. Importiere und übergib den Adapter aus `@zeroman.yang/react-auto-components/xlsx`; installiere bei Bedarf mit `pnpm add exceljs`. CSV und JSON benötigen ihn nicht.

- [Live-Demo (GitHub Pages)](https://zeroman.github.io/react-auto-components/)
- [Mitwirken](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/de/CONTRIBUTING.md)
- [Änderungsprotokoll](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/de/CHANGELOG.md)
- [Kontoeinrichtung und Veröffentlichung](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/de/publishing.md)
- [MIT-Lizenz](../../../LICENSE)

## Eigenständiges Testprojekt starten

Erfordert Node.js >= 22.12 und pnpm 12.5.

```sh
pnpm install --frozen-lockfile
pnpm prepare:test-project
pnpm --dir test-project dev
```

Öffnen Sie http://127.0.0.1:4173. Das Testprojekt enthält Seiten für alle sieben Komponenten, lokale/serverseitige Tabellen, Tabellen mit 10.000 Zeilen und Baumtabellen, CRUD, erneute Versuche nach fehlgeschlagenem Absenden, Entwürfe, verschachtelte Tabs und dynamische Zeilenhöhen.

Die Demo erkennt die Browsersprache automatisch, mit Englisch als Rückfallebene. Wählen Sie eine Sprache über den Kopfbereich oder die globalen Einstellungen; die Auswahl bleibt über Neuladen hinweg erhalten. Wählen Sie „Auto“, um erneut der Browsersprache zu folgen. Zehn Sprachen werden unterstützt. Die Seiten füllen den Viewport aus; Tabellen und lange Panels scrollen innerhalb ihrer eigenen Bereiche.

Jede Beispielseite enthält eine Schaltfläche **Code anzeigen**, die die echte Quelldatei in einem Dialog öffnet – mit Datei-Tabs, Ein-Klick-Kopieren und GitHub-Link.

`test-project` hat eine eigene package.json und Lockdatei. Es installiert die tatsächliche Ausgabe von `pnpm pack`, ohne Quellcode-Aliase. Führen Sie nach Änderungen an der Bibliothek erneut `pnpm prepare:test-project` aus; das Skript verwendet Dateinamen mit Inhalts-Hash, um veraltete Tarball-Caches zu vermeiden.

## Verwendung

```tsx
import { useState } from 'react';
import {
  AutoConfigProvider, AutoDialogProvider, AutoTable,
  type AutoColumn, type Field,
} from '@zeroman.yang/react-auto-components';
import '@zeroman.yang/react-auto-components/style.css';

type Person = { id: number; name: string; enabled: boolean };
const columns: AutoColumn<Person>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'enabled', label: 'Aktiviert', options: [
    { label: 'Ja', value: true }, { label: 'Nein', value: false },
  ] },
];
const fields: Field<Person>[] = [
  { name: 'name', label: 'Name', required: true },
  { name: 'enabled', label: 'Aktiviert', type: 'switch', defaultValue: true },
];
export function App() {
  const [rows, setRows] = useState<Person[]>([]);
  return <AutoConfigProvider config={{ namespace: 'my-app' }}>
    <AutoDialogProvider>
      <AutoTable<Person> id="people" rowKey="id" data={rows}
        columns={columns} formFields={fields} searchFields={fields}
        onAdd={value => setRows(old => [...old, { ...value, id: Date.now() }])}
        onEdit={(row, value) => setRows(old => old.map(item => item.id === row.id ? { ...row, ...value } : item))}
        onDelete={selected => setRows(old => old.filter(item => !selected.some(row => row.id === item.id)))}
      />
    </AutoDialogProvider>
  </AutoConfigProvider>;
}
```

Felder, Spalten und Refs verwenden Generics: Ungültige Feldnamen oder Standardwerte führen zu Fehlern zur Kompilierzeit. Der Provider unterstützt Namensräume, Berechtigungen, die Übersetzung von Feldbeschriftungen, benutzerdefinierte Felder, Benachrichtigungen und Persistenzadapter. Eingebaute Beschriftungen, Validierungsmeldungen und Texte für Barrierefreiheit verwenden AutoConfigProvider.config.t; explizit angegebene Komponentenbeschriftungen haben Vorrang.

Der t-Callback erhält einen Nachrichtenschlüssel und einen Fallback-Text. Nummerierte Platzhalter wie {0} und {1} müssen in übersetzten eingebauten Meldungen erhalten bleiben; die Komponenten setzen ihre Werte erst nach der Übersetzung ein.

## Komponenten

| Komponente | Funktionen |
| --- | --- |
| AutoForm | Native Feldtypen, virtualisierte Optionen, kaskadierende Auswahl, Upload-Adapter, benutzerdefinierte Darstellung, abhängige Felder, bedingte Sichtbarkeit, asynchrone Validierung, kontrollierter Zustand, Erhalt von Eingaben nach Fehlern |
| AutoSearch | Einfache/erweiterte Bedingungen, manuelle/sofortige Suche, Zurücksetzen, Sortier-Tags, gemeinsamer Abfrage-AST und RSQL-Serialisierung |
| AutoTable | Lokale/entfernte Daten, Mehrspaltensortierung, Spaltenfilter, Paginierung, stabile Auswahl, Virtualisierung, Aufklappen von Bäumen/Details, Zusammenfassungen, verbundene Zellen, CRUD, Kontextmenüs und Kopieren |
| AutoDialog | Deklarative/imperative APIs, isolierte Provider, Entwürfe, Schließschutz, Fokusverwaltung, Ziehen, Vollbild und asynchrones Absenden |
| AutoTabs | Horizontale/vertikale Layouts, Verschachtelung, Berechtigungen, deaktivierte Tabs, Erhalt des Panelzustands und Aktualisierung |
| AutoMenu | Seitennavigation mit Icons, Beschreibungen, Badges, verschachtelten Gruppen, Berechtigungen und einklappbarer Icon-Leiste |
| AutoChat | Vom Aufrufer kontrolliertes Nachrichten-Rendering, optionale Virtualisierung, Streaming-Follow, verankertes Nachladen des Verlaufs, Sende/Stopp-Composer und benutzerdefinierte Aktionen |

Tabellenlayout, Sortierung, Filterung und Export unterstützen jeweils benannte Voreinstellungen und unabhängige Versionen. Standardmäßig wird localStorage für die Persistenz verwendet; entfernte Adapter können eingebunden werden. JSON/CSV-Export ist integriert. XLSX verwendet einen optionalen, separaten Adapter:

```tsx
import { exportXlsx } from '@zeroman.yang/react-auto-components/xlsx';
// <AutoTable ... exportXlsx={exportXlsx} />
```

ExcelJS wird beim ersten Einsatz des Adapters dynamisch geladen und ist nicht im Haupteinstiegspunkt der Bibliothek enthalten. Anwendungen, die nur CSV/JSON verwenden, können optionale Abhängigkeiten bei der Installation auslassen.

## Überprüfung

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium  # Nur beim ersten Ausführen
pnpm test:e2e
```

Unit-Tests decken Felder, asynchrone Validierung, Abfragen, Dialoge, Virtualisierung, Tabellen, Konfigurationsmigrationen und Exporte ab. Playwright testet Interaktionen über die öffentlichen Einstiegspunkte des Pakets. Desktop-/Mobil-Screenshots werden in `test-project/test-results` gespeichert.

## Verhalten und Konventionen

- Dies ist eine für React entwickelte API, keine Kompatibilitätsschicht, die Vue Eigenschaft für Eigenschaft oder Methode für Methode nachbildet. Siehe [Migrationsanleitung](migration.md).
- Der Anwendungscode verwaltet die Daten. CRUD-Callbacks speichern Änderungen; das Auslösen eines Fehlers bei einem Fehlschlag erhält die Bearbeitungen. Nach Erfolg aktualisiert die Komponente entfernte Daten. Lokale Daten muss der Aufrufer aktualisieren.
- Die `id` einer Tabelle muss innerhalb ihres Namensraums eindeutig sein; `rowKey` muss über alle Seiten und Baumknoten hinweg eindeutig sein. Geben Sie im serverseitigen Modus `columns` explizit an; die Datenquelle liefert die Gesamtanzahl zurück.
- Wenn `query` / `value` kontrolliert wird, muss die übergeordnete Komponente die Callbacks verarbeiten und den Wert aktualisieren. Für unkontrollierte Verwendung können diese Props entfallen.
- Verbundene Zellen verwenden eine nicht virtualisierte semantische Tabelle, die sich für paginierte Daten eignet, um rowSpan-Versatz zwischen virtuellen Ausschnitten zu vermeiden.
- Serverseitige Zusammenfassungen aller gefilterten Zeilen werden über `summaryValues` bereitgestellt. Fehlende Zusammenfassungen zeigen `—`, statt die Summe der aktuellen Seite als Gesamtsumme auszugeben. Setzen Sie `summaryScope="page"`, um ausdrücklich die aktuelle Seite zu berechnen.
- Während Uploads läuft kein Absenden. Zurücksetzen, Ersetzen von Feldwerten oder Unmounten bricht alte Uploads ab; verspätete Ergebnisse können neuere Werte nicht überschreiben.
- Entfernte Exporte aller gefilterten Ergebnisse rufen die Daten seitenweise ab. Große Anwendungen können einen eigenen serverseitigen Export implementieren.
- Importieren Sie Browser-Stile ausdrücklich aus `style.css`. JavaScript-Module lassen sich in Node ohne `window` importieren.

## Mit AutoTable die verbleibende Höhe ausfüllen

`height={440}` legt weiterhin eine feste Höhe für den Daten-Scrollbereich fest. Mit `height="auto"` füllt die gesamte Tabelle die vom übergeordneten Layout zugewiesene Höhe aus. Suche, Werkzeugleiste und Paginierung nehmen ihre natürliche Höhe ein; der Datenbereich nutzt den übrigen Platz und scrollt unabhängig:

```tsx
<div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', gap: 12 }}>
  <header>Seitentitel und Beschreibung</header>
  <AutoTable<Person> id="people" rowKey="id" data={rows}
    columns={columns} height="auto" />
  <footer>Seitenfußzeile</footer>
</div>
```

Das übergeordnete Element muss eine bestimmte Höhe haben. Verwenden Sie `flex: 1; min-height: 0` in verschachtelten Flex-Containern, um den verbleibenden Platz weiterzugeben, oder `grid-template-rows: auto minmax(0, 1fr) auto` für Grid-Layouts. Eine JavaScript-Berechnung aus Viewport-Höhe minus Werkzeugleistenhöhe ist nicht erforderlich: Das Layout berücksichtigt hinzugefügte/entfernte Suchfelder, umgebrochene Werkzeugleisten und Größenänderungen des übergeordneten Elements; die virtuelle Liste folgt den tatsächlichen Abmessungen des Scrollbereichs.

Dabei wird die Tabellengröße nicht an die Zeilenanzahl angepasst. Leere und kleine Datensätze füllen weiterhin den verfügbaren Platz. Das übergeordnete Element muss mindestens Platz für Suchbereich, Werkzeugleiste und Paginierung selbst bieten.

Das Testprojekt zeigt dies im Tab **AutoTable → Verbleibende Höhe**, wobei Seitenleiste und Seitenkopf erhalten bleiben. Die ältere URL `http://127.0.0.1:4173/?demo=auto-height` wählt diesen Tab direkt aus. Browsertests: `test-project/tests/auto-height.spec.ts`.

## Globales Formularlayout

Verwenden Sie `AutoConfigProvider.config.form`, um reguläre Formulare, Suchpanels, Tabellensuchbereiche und Dialogformulare einheitlich zu konfigurieren. Beschriftungen können über oder links neben Steuerelementen stehen, mit unabhängig davon links- oder rechtsbündigem Text. Standardmäßig stehen Beschriftungen oben und die Abstände sind großzügig.

```tsx
<AutoConfigProvider config={{
  form: {
    labelPosition: 'left', // 'top': oberhalb; 'left': links neben dem Steuerelement
    labelAlign: 'right',   // Rechtsbündiger Text; das Label bleibt links neben dem Steuerelement
    labelWidth: 80,
    density: 'compact',   // 'comfortable': mehr Abstand
  },
}}>
  <App />
</AutoConfigProvider>
```

Verschachtelte Provider führen Layouteinstellungen Eigenschaft für Eigenschaft zusammen. Explizite Komponenten-Props überschreiben den umgebenden Provider. Beispielsweise können Sie in einem Formular Beschriftungen oben beibehalten und global Beschriftungen neben den Steuerelementen verwenden:

```tsx
<AutoForm fields={fields} labelPosition="top" density="comfortable" />
<AutoTable id="people" rowKey="id" data={rows} columns={columns}
  searchFields={searchFields}
  searchLayout={{ labelWidth: 100, columns: 3 }} />
```

`labelWidth` ist standardmäßig `"auto"` und akzeptiert auch eine Pixelzahl oder CSS-Breite wie `"6em"`. Im automatischen Modus passt sich jede Suchbeschriftung ihrem Text an; reguläre Formulare und Dialogformulare verwenden eine gemeinsame, aus sichtbaren Beschriftungen ermittelte Breite, um Steuerelemente auszurichten. Lange Beschriftungen belegen höchstens 45 % der Feldbreite und werden darüber hinaus umgebrochen, damit Platz für Steuerelemente bleibt. Explizite feste Breiten unterliegen dieser automatischen Begrenzung nicht. Kompakte Suchbereiche platzieren Aktionsschaltflächen bei ausreichendem Platz in derselben Zeile und umbrechen sie auf schmalen Bildschirmen. Beschriftungszuordnungen bleiben erhalten, Fehler und Beschreibungen werden an Steuerelementen ausgerichtet und lange Beschriftungen können umbrechen.

Öffnen Sie in der Demo **Globale Einstellungen** über die Seitenleiste oder das Zahnrad oben rechts, um Layout, Dichte, Beschriftungsbreite und Design zu ändern. Änderungen wirken sofort, ohne aktuelle Eingaben zu löschen. Die Formularseite unterstützt **Globalen Einstellungen folgen** oder lokale Überschreibungen. Die Demo aktiviert über ihren Provider ausdrücklich ein kompaktes Layout mit Beschriftungen neben den Steuerelementen.

## Globale Größe und Dichte

`AutoConfigProvider` unterstützt `size: "small" | "medium" | "large"` und `density: "compact" | "comfortable"`. Explizite Komponenten-Props haben Vorrang vor Einstellungen der Komponentenkategorie; diese haben Vorrang vor globalen Werten:

```tsx
<AutoConfigProvider config={{
  size: "medium",
  density: "compact",
  form: { labelPosition: "left", labelAlign: "right" },
  table: { density: "compact" },
  tabs: { density: "compact" },
}}>
  <AutoForm fields={fields} size="small" />
</AutoConfigProvider>
```

Die Tabellendichte unterstützt außerdem `normal`. Das Tabelleneinstellungspanel folgt standardmäßig den globalen Einstellungen. Die Auswahl kompakter, normaler oder großzügiger Abstände überschreibt die globale Dichte und wird mit der Layoutvoreinstellung gespeichert; das `density`-Prop der Komponente hat die höchste Priorität. Lokale Größen verschachtelter Komponenten gelten unabhängig voneinander.

Formulare unterstützen `resetLabel`, `extraActions` und `onReset`; Suchpanels unterstützen `searchLabel`, `resetLabel` und `extraActions`; Dialoge unterstützen `cancelLabel` und `extraActions`. Einträge von `AutoTabs` können ein `badge` definieren; `AutoTable.empty` passt den Inhalt für einen leeren Zustand an.

### AutoChat

AutoChat bietet ein leichtgewichtiges Unterhaltungs-Layout mit Stream-Follow, Verlaufsladen und einem Eingabebereich. Für das Rendern der Nachrichten übergibst du React-Inhalte oder renderMessage; zusätzliche Laufzeit-Abhängigkeiten sind nicht erforderlich.

[AutoChat API](auto-chat.md)

Was die Komponente tut, wenn ein Callback wirft: [AutoForm](auto-form.md), [AutoSearch](auto-search.md), [AutoTable](auto-table.md), [AutoDialog](auto-dialog.md), [AutoTabs](auto-tabs.md), [AutoMenu](auto-menu.md). Fehlercodes für Entwickler: [errors.md](errors.md).
