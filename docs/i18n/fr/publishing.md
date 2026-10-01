# Publier sur GitHub et npm

[English](../../publishing.md) | [简体中文](../zh-CN/publishing.md) | [繁體中文](../zh-TW/publishing.md) | [日本語](../ja/publishing.md) | [한국어](../ko/publishing.md) | [Español](../es/publishing.md) | **Français** | [Deutsch](../de/publishing.md) | [Português (Brasil)](../pt-BR/publishing.md) | [Русский](../ru/publishing.md)

## Comptes et nom du paquet

Le dépôt GitHub est `Zeroman/react-auto-components`. Le compte npm est `zeroman.yang`. Le scope `@zeroman` appartient à un autre utilisateur npm, donc le nom du paquet est `@zeroman.yang/react-auto-components`.

1. Ouvrez la [page d’inscription npm](https://www.npmjs.com/signup), saisissez un nom d’utilisateur, une adresse e-mail et un mot de passe, puis examinez et acceptez personnellement les conditions.
2. Vérifiez l’adresse e-mail d’inscription. npm exige une adresse vérifiée avant toute publication ; les adresses e-mail des personnes qui publient figurent dans les métadonnées du paquet, choisissez donc une adresse adaptée à la maintenance publique.
3. Activez l’authentification à deux facteurs dans les paramètres du compte et conservez les informations de récupération. Ne placez jamais de mots de passe, de codes de vérification, de codes de récupération ni de jetons dans le dépôt ou dans la conversation.
4. Exécutez `npm login --registry=https://registry.npmjs.org/` et suivez les instructions du navigateur. Confirmez le compte avec `npm whoami --registry=https://registry.npmjs.org/`.
5. Un scope personnel tel que `@<npm-username>/react-auto-components` est recommandé. Pour un scope d’organisation, vérifiez d’abord l’appartenance à l’organisation et les autorisations de publication.

Une fois le nom définitif choisi, mettez à jour le nom dans le package.json racine, les imports dans toutes les traductions du README, les dépendances du consommateur et les imports des sources/tests. Exécutez ensuite `pnpm prepare:test-project` pour actualiser le fichier de verrouillage du consommateur. Le script de création de paquet déduit les noms des archives tarball du package.json racine.

Documentation officielle : [création de compte](https://docs.npmjs.com/creating-a-new-npm-user-account/), [paquets publics avec scope](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) et [authentification à deux facteurs](https://docs.npmjs.com/about-two-factor-authentication/).

## Vérification avant publication

Exécutez depuis la racine du dépôt :

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

`prepack` compile automatiquement JavaScript, CSS et les déclarations ; `prepublishOnly` exécute les vérifications de types et les tests unitaires. Le paquet npm contient uniquement dist, les traductions du README et du guide de migration, LICENSE et package.json. Vérifiez que les identifiants secrets, les journaux locaux et les sorties des tests en sont exclus. Les autres documents du dépôt sont accessibles par des liens vers GitHub.

`test-project` valide les véritables points d’entrée publics via une archive tarball dont le nom contient une empreinte du contenu. Dans un clone neuf, exécutez `pnpm prepare:test-project` depuis la racine avant d’installer dans ce répertoire. La commande de préparation met à jour la dépendance locale et le fichier de verrouillage du consommateur.

## Première publication

Une fois la configuration du compte, le nom définitif du paquet, la licence et les vérifications ci-dessus terminés :

```sh
npm whoami --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```

Effectuez toute vérification demandée par npm. Après la publication, exécutez `npm view <package-name> version` avec le nom définitif, puis installez et vérifiez le paquet dans un nouveau projet consommateur. Supprimez l’avis de préparation de la première publication dans toutes les traductions du README et ajoutez les instructions d’installation une fois la première publication réussie.

Mettez à jour la version et toutes les traductions du CHANGELOG avant chaque publication. N’essayez pas d’écraser une version déjà publiée. L’intégration continue actuelle du dépôt vérifie uniquement les modifications ; elle ne publie pas automatiquement sur npm.

## Futures publications automatisées

Après la première publication, configurez [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) pour lier le paquet au dépôt GitHub et à un fichier de workflow précis. Utilisez un exécuteur hébergé par GitHub et OIDC `id-token: write`, sans jeton npm de longue durée. Les prérequis documentés sont Node >=22.14.0 et npm CLI >=11.5.1. Avant de l’activer, implémentez et vérifiez le workflow de publication et assurez-vous que le tag, la version de package.json et le commit testé correspondent.

L’intégration continue de GitHub Actions installe les dépendances depuis le fichier de verrouillage, vérifie les types, exécute les tests unitaires, construit le consommateur de la véritable archive tarball et exécute les tests Chromium. La protection des branches peut exiger la réussite de l’intégration continue avant la fusion ; configurez-la à mesure que les besoins de maintenance évoluent avec les contributions externes.
