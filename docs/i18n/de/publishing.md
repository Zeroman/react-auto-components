# Veröffentlichung auf GitHub und npm

[English](../../publishing.md) | [简体中文](../zh-CN/publishing.md) | [繁體中文](../zh-TW/publishing.md) | [日本語](../ja/publishing.md) | [한국어](../ko/publishing.md) | [Español](../es/publishing.md) | [Français](../fr/publishing.md) | **Deutsch** | [Português (Brasil)](../pt-BR/publishing.md) | [Русский](../ru/publishing.md)

## Konten und Paketname

Das GitHub-Repository ist `Zeroman/react-auto-components`. Das npm-Konto ist `zeroman.yang`. Der Scope `@zeroman` gehört einem anderen npm-Benutzer, daher lautet der Paketname `@zeroman.yang/react-auto-components`.

1. Öffnen Sie die [npm-Registrierungsseite](https://www.npmjs.com/signup), geben Sie Benutzernamen, E-Mail und Passwort ein und prüfen und akzeptieren Sie die Bedingungen persönlich.
2. Bestätigen Sie die Registrierungs-E-Mail. npm erfordert vor der Veröffentlichung eine bestätigte E-Mail-Adresse; die E-Mail-Adressen der Veröffentlichenden erscheinen in den Paketmetadaten. Wählen Sie daher eine für die öffentliche Betreuung geeignete Adresse.
3. Aktivieren Sie die Zwei-Faktor-Authentifizierung in den Kontoeinstellungen und sichern Sie die Wiederherstellungsinformationen. Speichern Sie niemals Passwörter, Bestätigungscodes, Wiederherstellungscodes oder Tokens im Repository oder Chat.
4. Führen Sie `npm login --registry=https://registry.npmjs.org/` aus und folgen Sie den Anweisungen im Browser. Prüfen Sie das Konto mit `npm whoami --registry=https://registry.npmjs.org/`.
5. Ein persönlicher Scope wie `@<npm-username>/react-auto-components` wird empfohlen. Prüfen Sie bei einem Organisations-Scope zuerst Mitgliedschaft und Veröffentlichungsberechtigungen.

Sobald der Name feststeht, aktualisieren Sie den Namen in der package.json im Stammverzeichnis, die Imports in jeder README-Übersetzung, die Abhängigkeiten des Verbraucherprojekts und die Imports in Quellcode und Tests. Führen Sie anschließend `pnpm prepare:test-project` aus, um die Lockdatei des Verbraucherprojekts zu aktualisieren. Das Verpackungsskript leitet die Tarball-Namen aus der package.json im Stammverzeichnis ab.

Offizielle Dokumentation: [Kontoregistrierung](https://docs.npmjs.com/creating-a-new-npm-user-account/), [öffentliche Pakete mit Scope](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) und [Zwei-Faktor-Authentifizierung](https://docs.npmjs.com/about-two-factor-authentication/).

## Überprüfung vor der Veröffentlichung

Führen Sie im Stammverzeichnis des Repositorys Folgendes aus:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium
pnpm test:e2e
npm pack --dry-run
```

`prepack` erstellt JavaScript, CSS und Deklarationen automatisch; `prepublishOnly` führt Typprüfungen und Unit-Tests aus. Das npm-Paket enthält nur dist, README und die Übersetzungen von README und Migrationsanleitung, LICENSE sowie package.json. Prüfen Sie, dass Zugangsdaten, lokale Protokolle und Testausgaben ausgeschlossen sind. Weitere Repository-Dokumentation ist auf GitHub verlinkt.

`test-project` überprüft die tatsächlichen öffentlichen Einstiegspunkte über einen Tarball mit Inhalts-Hash. Führen Sie nach einem frischen Klonen `pnpm prepare:test-project` im Stammverzeichnis aus, bevor Sie in diesem Verzeichnis installieren. Der Vorbereitungsbefehl aktualisiert die lokale Abhängigkeit und die Lockdatei des Verbraucherprojekts.

## Erste Veröffentlichung

Nachdem Kontoeinrichtung, endgültiger Paketname, Lizenz und die obigen Prüfungen abgeschlossen sind:

```sh
npm whoami --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```

Schließen Sie alle von npm angeforderten Verifizierungen ab. Führen Sie nach der Veröffentlichung `npm view <package-name> version` mit dem endgültigen Namen aus und installieren und überprüfen Sie das Paket anschließend in einem neuen Verbraucherprojekt. Entfernen Sie nach erfolgreicher erster Veröffentlichung den Hinweis zur Vorbereitung der Erstveröffentlichung aus jeder README-Übersetzung und ergänzen Sie Installationsanweisungen.

Aktualisieren Sie vor jeder Veröffentlichung die Version und jede CHANGELOG-Übersetzung. Versuchen Sie nicht, eine veröffentlichte Version zu überschreiben. Schieben Sie einen `v*`-Tag, der zur Version in `package.json` passt, zum Beispiel `v0.2.0` bei Version `0.2.0`. Dadurch läuft `.github/workflows/publish.yml` und veröffentlicht auf npm.

## Automatisierte Veröffentlichungen

[npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) bindet `@zeroman.yang/react-auto-components` an das GitHub-Repository `Zeroman/react-auto-components` und die Workflow-Datei `publish.yml`. Der Workflow nutzt einen von GitHub gehosteten Runner und OIDC `id-token: write`, ohne langlebiges npm-Token. Erfordert werden Node >=22.14.0 und npm CLI >=11.5.1. Tag, `package.json`-Version und getesteter Commit müssen übereinstimmen.

GitHub Actions CI installiert anhand der Lockdatei, prüft Typen, führt Unit-Tests aus, baut das Verbraucherprojekt mit echtem Tarball und führt Chromium-Tests aus. Branch-Schutz kann CI vor dem Zusammenführen voraussetzen; konfigurieren Sie ihn entsprechend dem Betreuungsbedarf, wenn externe Beiträge hinzukommen.
