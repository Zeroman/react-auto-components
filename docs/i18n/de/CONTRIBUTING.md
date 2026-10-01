# Mitwirken

[English](../../../.github/CONTRIBUTING.md) | [简体中文](../zh-CN/CONTRIBUTING.md) | [繁體中文](../zh-TW/CONTRIBUTING.md) | [日本語](../ja/CONTRIBUTING.md) | [한국어](../ko/CONTRIBUTING.md) | [Español](../es/CONTRIBUTING.md) | [Français](../fr/CONTRIBUTING.md) | **Deutsch** | [Português (Brasil)](../pt-BR/CONTRIBUTING.md) | [Русский](../ru/CONTRIBUTING.md)

Verwenden Sie Issues, um reproduzierbare Probleme zu melden oder Funktionen vorzuschlagen, und Pull Requests, um Verbesserungen beizutragen.

## Lokale Entwicklung

Erfordert Node.js >=22.12.0 und pnpm 12.5.1. Die Paketmanagerversion ist im Feld packageManager der package.json festgelegt.

```sh
pnpm install --frozen-lockfile
pnpm prepare:test-project
pnpm --dir test-project dev
```

Das Verbraucherprojekt installiert die Bibliothek aus einem echten Tarball. Führen Sie nach Änderungen an der Bibliothek erneut `pnpm prepare:test-project` aus. Behalten Sie diesen paketbasierten Ablauf bei, statt Quellcode-Aliase einzuführen. Committen Sie keine Artefakte, node_modules oder Laufzeitprotokolle.

## Überprüfung

```sh
pnpm typecheck
pnpm test
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium
pnpm test:e2e
```

CI führt diese Prüfungen unter Linux aus. Browsertests verwenden automatisch Port 4174; die Entwicklungsdemo verwendet Port 4173.

## Verzeichnisse

- `src/components`: die sieben Komponenten und ihre öffentlichen Typen.
- `src/core`: Konfiguration, Provider, Abfragen und gemeinsame Typen.
- `src/adapters`: der optionale XLSX-Adapter.
- `src/styles`: ausdrücklich importierte Komponentenstile.
- `tests`: Unit-Tests und negative Typtests.
- `test-project`: das eigenständige Verbraucherprojekt und Chromium-Interaktionstests.
- `scripts`: Skripte für Paketerstellung und Einrichtung des Verbraucherprojekts.

## Pull Requests

Beschreiben Sie das Problem, das resultierende Verhalten und die tatsächlich ausgeführten Prüfungen. Fügen Sie bei der Behebung eines Komponentenfehlers einen Regressionstest hinzu, der das Problem reproduziert. Aktualisieren Sie die Dokumentation, wenn sich öffentliche APIs oder die Verwendung ändern. Beschränken Sie Änderungen auf ihren Zweck und vermeiden Sie sachfremde Formatierungen im gesamten Repository.

Befolgen Sie die vorhandenen strikten TypeScript-Einstellungen und den Codestil. React 19 bleibt eine Peer-Abhängigkeit, Stile verwenden einen separaten Einstiegspunkt und XLSX bleibt außerhalb des Haupteinstiegspunkts. Beiträge werden unter der MIT-Lizenz dieses Repositorys bereitgestellt.

## Übersetzungen der Dokumentation

Englische Dokumente verwenden ihre Standard-Dateinamen. Übersetzungen werden nach Locale unter `docs/i18n/<locale>/` gruppiert, zum Beispiel `docs/i18n/ja/README.md` und `docs/i18n/zh-CN/migration.md`. Halten Sie dieselben Abschnitte, Beispiele, die technische Bedeutung und den Release-Status über alle Sprachen hinweg bei. Öffentliche Bezeichner und Befehlsargumente bleiben unverändert. Wenn Sie ein Dokument aktualisieren, aktualisieren Sie auch seine Übersetzungen und halten Sie Sprachwechsel-Links sowie Links zu verwandten Dokumenten konsistent.
