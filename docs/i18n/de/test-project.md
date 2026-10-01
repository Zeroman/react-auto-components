# Eigenständiges Verbraucher- und Testprojekt

[English](../../../test-project/README.md) | [简体中文](../zh-CN/test-project.md) | [繁體中文](../zh-TW/test-project.md) | [日本語](../ja/test-project.md) | [한국어](../ko/test-project.md) | [Español](../es/test-project.md) | [Français](../fr/test-project.md) | **Deutsch** | [Português (Brasil)](../pt-BR/test-project.md) | [Русский](../ru/test-project.md)

Dieses Projekt installiert die Komponentenbibliothek aus einem lokalen Tarball und hat unabhängige Abhängigkeiten und Builds. Es verwendet keine Quellcode-Aliase.

Die Demo erkennt die Browsersprache automatisch, mit Englisch als Rückfallebene. Wählen Sie eine Sprache über den Kopfbereich oder die globalen Einstellungen; die Auswahl bleibt über Neuladen hinweg erhalten. Wählen Sie „Auto“, um erneut der Browsersprache zu folgen. Zehn Sprachen werden unterstützt. Die Seiten füllen den Viewport aus; Tabellen und lange Panels scrollen innerhalb ihrer eigenen Bereiche.

Führen Sie im Stammverzeichnis des Repositorys `pnpm install --frozen-lockfile` und `pnpm prepare:test-project` aus, anschließend `pnpm --dir test-project dev`.

- `pnpm --dir test-project build`: öffentliche Typen prüfen und einen Produktions-Build erstellen.
- `pnpm exec playwright install chromium`: den Browser bei der ersten Verwendung installieren.
- `pnpm --dir test-project test`: Chromium-Interaktionstests ausführen (startet automatisch einen separaten Server auf Port 4174).
- Führen Sie nach Änderungen an der Bibliothek erneut `pnpm prepare:test-project` aus, um die Tarball-Abhängigkeit mit Inhalts-Hash zu aktualisieren.

Die Browsertests in `tests/components.spec.ts` decken CRUD, Feldvalidierung und erneute Versuche nach fehlgeschlagenem Absenden, Einstellungspersistenz, Entwürfe und Fokus, Popover, verschachtelte Tabs, Scrollen mit 10.000 Zeilen, serverseitige Paginierung, Messungen aufgeklappter Bereiche, Spaltenbreiten, Downloads und mobile Layouts ab. Screenshots werden in `test-results/` gespeichert.

Die Demo für die verbleibende Höhe befindet sich im Tab **AutoTable → Verbleibende Höhe**. Die ältere URL `http://127.0.0.1:4173/?demo=auto-height` öffnet dieselbe Seite und wählt diesen Tab aus. Das Beispiel kann zwischen Flex/Grid wechseln, Inhalte über der Tabelle hinzufügen/entfernen, die Tabelle ein-/ausblenden sowie Paginierung und Zeilenanzahl ändern. `tests/auto-height.spec.ts` misst Begrenzungen im Browser und die Höhe des Scrollbereichs, um das Layout im verbleibenden Platz, dynamische Größenänderungen, die Wiederherstellung der Virtualisierung und die Kompatibilität mit festen Höhen zu überprüfen.

Browsertests starten einen neuen Vite-Server auf Port 4174, statt die Entwicklungsdemo auf Port 4173 wiederzuverwenden. Das Skript zur erneuten Paketerstellung benachrichtigt vorhandene Demoserver, das neu installierte Paket aufzulösen, wodurch veraltete Komponenten vermieden werden.

Globale Einstellungen sind vom Beispielinhalt getrennt und in `src/GlobalSettings.tsx` implementiert. Öffnen Sie das Panel über die Seitenleiste oder das Bedienelement oben rechts. Das aktuelle Beispiel bleibt beim Ändern von Layout, Dichte, Beschriftungsbreite oder Design gemountet.
