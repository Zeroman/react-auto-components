# Leitfaden zur Komponentenintegration

[English](../../migration.md) | [简体中文](../zh-CN/migration.md) | [繁體中文](../zh-TW/migration.md) | [日本語](../ja/migration.md) | [한국어](../ko/migration.md) | [Español](../es/migration.md) | [Français](../fr/migration.md) | **Deutsch** | [Português (Brasil)](../pt-BR/migration.md) | [Русский](../ru/migration.md)

Konfigurieren Sie Komponenten über React-Generics, Callbacks und Provider. Die folgende Tabelle ordnet häufige Anwendungsanforderungen den öffentlichen APIs und lauffähigen Beispielen zu.

| Ursprünglicher Anwendungsfall | React-API | Ausführbares Beispiel / Test |
| --- | --- | --- |
| Formularfelder und v-model | `fields: Field<T>[]`, `value/onChange` oder `defaultValue` | Formularseite in `test-project/src/App.tsx`; `tests/form*.test.tsx` |
| Slots und angehängte Inhalte | Feld-`render`, Spalten-`render/header`, ReactNode | Formular-/Tabellenseiten |
| Operationen der Formularinstanz | `ref.validate/reset/getValues/setValue/focus` | `tests/form.test.tsx` |
| Suche, verknüpfte Bedingungen, RSQL | `buildQuery`, `matchesQuery`, `serializeRsql` | Suchseite; `tests/query.test.ts` |
| Lokale/entfernte Tabellendaten | Entweder `data` oder `dataSource(query,{signal})` | Tabellenseite; `tests/table.test.tsx` |
| Layout-/Filter-/Sortier-/Exportvoreinstellungen | Unabhängige Voreinstellungen im Einstellungsdialog, separat durch `versions` ungültig gemacht | Tabellenseite; `tests/table-settings.test.ts` |
| Bäume, Details, Zusammenfassungen, verbundene Zellen | `getChildren/renderExpanded`, Spalten-`summary/merge` | Baum- und Aufklappbeispiele; `tests/table-advanced.test.tsx` |
| Hinzufügen, Bearbeiten, Löschen | `formFields` und `onAdd/onEdit/onDelete` | CRUD-Browsertests |
| Imperative Dialoge | `AutoDialogProvider` + `useAutoDialog().open()` | Dialogseite; `tests/dialog.test.tsx` |
| Popover-Dienst | `AutoPopoverProvider` + `useAutoPopover()` | Popover-Seite; `tests/popover.test.tsx` |
| Virtuelles Scrollen | `AutoScroll` und Ref-Methoden | Scrollseite; Browsertest mit 10.000 Zeilen |
| Tabs und verschachtelte Tabs | `AutoTabs`-Einträge, value/onChange, keepMounted | Tab-Seite; `tests/tabs.test.tsx` |

## Feldtypen

`input/email/textarea/integer/float/percentage/progress/switch/select/select-v2/radio/checkbox/cascader/autocomplete/date/datetime/daterange/datetimerange/upload/text/title/tip/button/append/custom`.

`select-v2` virtualisiert Optionen. Datumsbereiche verwenden zwei native Eingabefelder mit getrennten Beschriftungen; `dateValue` wählt Zeichenfolgen oder Zeitstempel. Numerische Eingaben erlauben Zwischenzustände während der Bearbeitung; verwenden Sie Feldregeln, um fachliche Einschränkungen beim Absenden zu validieren. `rules` unterstützt asynchrone Validierung; ausgeblendete Felder überspringen die Validierung. Optionen behalten numerische/boolesche Werte bei, statt sie in Zeichenfolgen umzuwandeln.

```tsx
const fields: Field<User>[] = [
  { name: 'name', label: 'Name', required: true },
  { name: 'note', label: 'Notiz', hidden: values => !values.enabled,
    render: ({ value, onChange, disabled }) =>
      <textarea disabled={disabled} value={String(value ?? '')}
        onChange={event => onChange(event.target.value)} /> },
];
```

Die vollständige API finden Sie in den exportierten TypeScript-Typen. `Field<T>` bindet an tatsächliche Schlüssel von T; Strukturelemente wie Titel und Hinweise benötigen keine Dateneigenschaft.

## Serverseitige Datenquellen

```tsx
const dataSource: DataSource<User> = async (query, { signal }) => {
  const response = await fetch('/api/users/search', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  if (!response.ok) throw new Error('Laden fehlgeschlagen');
  return response.json(); // { rows: User[], total: number }
};
```

Seitenindizes beginnen bei 0. `sort` ist ein geordnetes Array von Feldern; `filter` ist ein strukturierter Abfragebaum. Komponenten brechen alte Anfragen ab und verhindern, dass verspätete Antworten neuere Abfragen überschreiben. Rufen Sie `ref.refresh()` der Tabelle auf, wenn sich fachliche Bedingungen außerhalb der Closure der Datenquelle ändern. Halten Sie die Datenquellenfunktion stabil, um unnötige Anfragen zu vermeiden. Die RSQL-Serialisierung ist lediglich ein Adapter für Backends, die sie benötigen; sie führt keine Abfragezeichenfolgen aus.

## Uploads und Persistenz der Anwendung

`upload(files, signal)` eines Feldes gibt den Feldwert zurück, nachdem die Anwendung die Dateien gespeichert hat. Die Komponente zeigt Upload-Fehler an; Aufrufer stellen Upload-URLs, Authentifizierung und Richtlinien für Objektspeicher bereit.

```tsx
<AutoConfigProvider config={{
  namespace: 'tenant-admin',
  canAccess: access => !access.permissions?.length || access.permissions.every(p => myPermissions.includes(p)),
  settings: {
    load: key => api.loadTableSettings(key),
    save: (key, settings) => api.saveTableSettings(key, settings),
  },
  notify: (message, level) => showToast(message, level),
}}>{children}</AutoConfigProvider>
```

Lokale Änderungen werden sofort angewendet; entfernte Speicherungen laufen nacheinander ab, mit einer Wiederholungsoption nach Fehlern. Verwenden Sie beim Ändern gespeicherter Einstellungsformate eine neue Tabellen-ID oder Version, um das Laden inkompatibler Einstellungen zu vermeiden.
