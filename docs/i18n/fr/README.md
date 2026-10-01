# React Auto Components

[English](../../../README.md) | [简体中文](../zh-CN/README.md) | [繁體中文](../zh-TW/README.md) | [日本語](../ja/README.md) | [한국어](../ko/README.md) | [Español](../es/README.md) | **Français** | [Deutsch](../de/README.md) | [Português (Brasil)](../pt-BR/README.md) | [Русский](../ru/README.md)

Une bibliothèque de composants autonome et pilotée par schéma pour React 19. Construite avec TypeScript, TanStack Table 9 / Form / Virtual, Radix et Floating UI, sans Ant Design, Element Plus ni MUI. Les builds de la bibliothèque utilisent React Compiler.

[![Auto Studio Démo](../../assets/demo.png)](https://zeroman.github.io/react-auto-components/)

<p align="center">
  <a href="https://zeroman.github.io/react-auto-components/"><strong>🚀 Démo en direct (GitHub Pages)</strong></a> · <a href="#exécuter-le-projet-de-test-autonome">Exécution locale</a> · <a href="#composants">Composants</a>
</p>

## État du projet

La version actuelle est 0.1.0 et les API peuvent encore évoluer. React 19 est requis. Le paquet fournit ESM et des déclarations TypeScript. Les textes d'interface intégrés sont en chinois par défaut et peuvent être traduits via AutoConfigProvider.config.t.

La première publication sur npm est en préparation. `@zeroman/react-auto-components` est le nom actuel du paquet de développement ; le scope définitif sera choisi après la création du compte npm. Jusqu’à la première publication, utilisez les sources et la procédure de création de paquet local ci-dessous. Ne supposez pas que le paquet est déjà disponible sur npm.

- [Démo en direct (GitHub Pages)](https://zeroman.github.io/react-auto-components/)
- [Contribuer](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/fr/CONTRIBUTING.md)
- [Journal des modifications](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/fr/CHANGELOG.md)
- [Configuration du compte et publication](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/fr/publishing.md)
- [Licence MIT](../../../LICENSE)

## Exécuter le projet de test autonome

Nécessite Node.js >= 22.12 et pnpm 12.5.

```sh
pnpm install --frozen-lockfile
pnpm prepare:test-project
pnpm --dir test-project dev
```

Ouvrez http://127.0.0.1:4173. Le projet de test comprend des pages pour les sept composants, des tableaux locaux/côté serveur/de 10 000 lignes/arborescents, les opérations CRUD, les nouvelles tentatives après un échec d’envoi, les brouillons, les fenêtres contextuelles, les onglets imbriqués et les hauteurs de ligne dynamiques.

La démo détecte automatiquement la langue du navigateur, avec l'anglais comme solution de repli. Choisissez une langue dans l'en-tête ou dans les paramètres globaux ; votre sélection est conservée après rechargement. Sélectionnez Auto pour suivre à nouveau la langue du navigateur. Dix langues sont prises en charge. Les pages remplissent la fenêtre (viewport), les tableaux et les longs panneaux défilant à l'intérieur de leurs propres zones.

`test-project` possède ses propres fichiers package.json et de verrouillage. Il installe la sortie réelle de `pnpm pack`, sans alias vers les sources. Exécutez de nouveau `pnpm prepare:test-project` après avoir modifié la bibliothèque ; le script utilise des noms de fichiers contenant une empreinte du contenu pour éviter les caches d’archives tarball obsolètes.

## Utilisation

```tsx
import { useState } from 'react';
import {
  AutoConfigProvider, AutoDialogProvider, AutoTable,
  type AutoColumn, type Field,
} from '@zeroman/react-auto-components';
import '@zeroman/react-auto-components/style.css';

type Person = { id: number; name: string; enabled: boolean };
const columns: AutoColumn<Person>[] = [
  { key: 'name', label: 'Nom', sortable: true },
  { key: 'enabled', label: 'Activé', options: [
    { label: 'Oui', value: true }, { label: 'Non', value: false },
  ] },
];
const fields: Field<Person>[] = [
  { name: 'name', label: 'Nom', required: true },
  { name: 'enabled', label: 'Activé', type: 'switch', defaultValue: true },
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

Les champs, les colonnes et les références utilisent des génériques : les noms de champ ou les valeurs par défaut non valides provoquent des erreurs à la compilation. Le fournisseur prend en charge les espaces de noms, les autorisations, la traduction des libellés de champ, les champs personnalisés, les notifications et les adaptateurs de persistance. Les libellés intégrés, les messages de validation et les textes d'accessibilité utilisent AutoConfigProvider.config.t ; les libellés explicites des composants ont la priorité.

Le callback t reçoit une clé de message et un texte de repli. Conservez les espaces réservés numérotés tels que {0} et {1} dans les messages intégrés traduits ; les composants y substituent leurs valeurs après la traduction.

## Composants

| Composant | Fonctionnalités |
| --- | --- |
| AutoForm | Types de champ natifs, options virtualisées, sélection en cascade, adaptateurs de téléversement, rendu personnalisé, champs dépendants, visibilité conditionnelle, validation asynchrone, état contrôlé et conservation des saisies après un échec |
| AutoSearchPanel | Conditions simples/avancées, recherche manuelle/instantanée, réinitialisation, étiquettes de tri, AST de requête partagé et sérialisation RSQL |
| AutoTable | Données locales/distantes, tri multicolonne, filtres de colonne, pagination, sélection stable, virtualisation, dépliage d’arbres/de détails, synthèses, cellules fusionnées, CRUD, menus contextuels et copie |
| AutoDialog | API déclaratives/impératives, fournisseurs isolés, brouillons, protection contre la fermeture, gestion du focus, déplacement par glisser, plein écran et envoi asynchrone |
| AutoPopover | Déclenchement au clic/au survol, positionnement automatique, prévention des collisions, fermeture avec Échap ou par clic à l’extérieur et fenêtres contextuelles impératives |
| AutoScroll | Virtualisation avec hauteur de ligne fixe/dynamique, défilement jusqu’aux éléments et lecture/restauration de la position de défilement |
| AutoTabs | Dispositions horizontales/verticales/en menu, imbrication, autorisations, onglets désactivés, conservation de l’état des panneaux et actualisation |

La disposition du tableau, le tri, le filtrage et l’exportation prennent chacun en charge des préréglages nommés et des versions indépendantes. La persistance utilise localStorage par défaut ; des adaptateurs distants peuvent être injectés. L’exportation JSON/CSV est intégrée. XLSX utilise un adaptateur facultatif séparé :

```tsx
import { exportXlsx } from '@zeroman/react-auto-components/xlsx';
// <AutoTable ... exportXlsx={exportXlsx} />
```

ExcelJS est chargé dynamiquement à la première utilisation de l’adaptateur et n’est pas inclus dans le point d’entrée principal de la bibliothèque. Les applications qui utilisent uniquement CSV/JSON peuvent omettre les dépendances facultatives lors de l’installation.

## Vérification

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium  # Première exécution uniquement
pnpm test:e2e
```

Les tests unitaires couvrent les champs, la validation asynchrone, les requêtes, les boîtes de dialogue, la virtualisation, les tableaux, les migrations de configuration et les exportations. Les tests Playwright vérifient les interactions via les points d’entrée publics du paquet. Les captures d’écran pour ordinateur et mobile sont enregistrées dans `test-project/test-results`.

## Comportement et conventions

- Il s’agit d’une API native de React, et non d’une couche de compatibilité avec Vue propriété par propriété ou méthode par méthode. Consultez le [guide de migration](migration.md).
- Le code de l’application est responsable des données. Les fonctions de rappel CRUD enregistrent les modifications ; lever une exception en cas d’échec préserve les éditions. Après un succès, le composant actualise les données distantes. Les données locales doivent être mises à jour par l’appelant.
- L’`id` d’un tableau doit être unique dans son espace de noms, et `rowKey` doit être unique sur l’ensemble des pages et des nœuds de l’arbre. En mode serveur, fournissez explicitement `columns` ; la source de données renvoie le nombre total.
- Lorsque `query` / `value` sont contrôlés, le parent doit gérer les fonctions de rappel et mettre à jour leur valeur. Ces propriétés peuvent être omises pour une utilisation non contrôlée.
- Les cellules fusionnées utilisent un tableau sémantique non virtualisé, adapté aux données paginées, pour éviter les décalages de rowSpan entre les fenêtres virtuelles.
- Les synthèses côté serveur de toutes les lignes filtrées sont fournies via `summaryValues`. Les synthèses manquantes affichent `—` au lieu de présenter le total de la page courante comme un total général. Définissez `summaryScope="page"` pour calculer explicitement la page courante.
- L’envoi est suspendu pendant les téléversements. Réinitialiser ou remplacer les valeurs des champs, ou démonter le composant, annule les anciens téléversements ; les résultats tardifs ne peuvent pas écraser des valeurs plus récentes.
- Les exportations distantes de tous les résultats filtrés demandent les données une page à la fois. Les grandes applications peuvent implémenter leur propre exportation côté serveur.
- Importez explicitement les styles du navigateur depuis `style.css`. Les modules JavaScript peuvent être importés dans Node sans `window`.

## Remplir la hauteur restante avec AutoTable

`height={440}` continue de définir une hauteur fixe pour la zone de défilement des données. Avec `height="auto"`, le tableau entier remplit la hauteur attribuée par la disposition du parent. La recherche, la barre d’outils et la pagination conservent leur hauteur naturelle ; la zone de données occupe l’espace restant et défile indépendamment :

```tsx
<div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', gap: 12 }}>
  <header>Titre et description de la page</header>
  <AutoTable<Person> id="people" rowKey="id" data={rows}
    columns={columns} height="auto" />
  <footer>Pied de page</footer>
</div>
```

Le parent doit avoir une hauteur définie. Utilisez `flex: 1; min-height: 0` dans les conteneurs flex imbriqués pour transmettre l’espace restant, ou `grid-template-rows: auto minmax(0, 1fr) auto` pour les dispositions en grille. Il n’est pas nécessaire de calculer en JavaScript la hauteur de la fenêtre moins celle de la barre d’outils : la mise en page gère l’ajout et la suppression de champs de recherche, les barres d’outils sur plusieurs lignes et le redimensionnement du parent ; la liste virtuelle suit les dimensions réelles de la zone de défilement.

Cela ne dimensionne pas le tableau selon le nombre de lignes. Les jeux de données vides ou de petite taille remplissent toujours l’espace disponible. Le parent doit au minimum pouvoir contenir la zone de recherche, la barre d’outils et la pagination.

Le projet de test illustre ce fonctionnement dans l’onglet **AutoTable → Hauteur restante**, tout en conservant la barre latérale et l’en-tête de page. L’ancienne URL `http://127.0.0.1:4173/?demo=auto-height` sélectionne directement cet onglet. Tests dans le navigateur : `test-project/tests/auto-height.spec.ts`.

## Disposition globale des formulaires

Utilisez `AutoConfigProvider.config.form` pour configurer de manière cohérente les formulaires ordinaires, les panneaux de recherche, les zones de recherche des tableaux et les formulaires des boîtes de dialogue. Les libellés peuvent apparaître au-dessus ou à gauche des contrôles, avec un alignement du texte à gauche/à droite indépendant. Par défaut, les libellés sont au-dessus et l’espacement est confortable.

```tsx
<AutoConfigProvider config={{
  form: {
    labelPosition: 'left', // 'top' : au-dessus ; 'left' : à gauche du contrôle
    labelAlign: 'right',   // Texte aligné à droite ; le libellé reste à gauche du contrôle
    labelWidth: 80,
    density: 'compact',   // 'comfortable' : espacement plus généreux
  },
}}>
  <App />
</AutoConfigProvider>
```

Les fournisseurs imbriqués fusionnent les paramètres de disposition propriété par propriété. Les propriétés explicites d’un composant ont priorité sur le fournisseur qui l’englobe. Par exemple, conservez les libellés au-dessus dans un formulaire tout en utilisant globalement des libellés sur la même ligne :

```tsx
<AutoForm fields={fields} labelPosition="top" density="comfortable" />
<AutoTable id="people" rowKey="id" data={rows} columns={columns}
  searchFields={searchFields}
  searchLayout={{ labelWidth: 100, columns: 3 }} />
```

`labelWidth` vaut `"auto"` par défaut et accepte aussi un nombre de pixels ou une largeur CSS telle que `"6em"`. En mode automatique, chaque libellé de recherche s’ajuste à son texte ; les formulaires ordinaires et les formulaires des boîtes de dialogue partagent une largeur fondée sur les libellés visibles afin d’aligner les contrôles. Les libellés longs occupent au plus 45 % de la largeur du champ et passent à la ligne au-delà, pour conserver de l’espace pour les contrôles. Les largeurs fixes explicites ne sont pas soumises à cette limite automatique. Les zones de recherche compactes placent les boutons d’action sur la même ligne si l’espace le permet et passent à la ligne sur les écrans étroits. Les associations entre libellés et contrôles restent intactes, les erreurs et les descriptions s’alignent avec les contrôles, et les libellés longs peuvent passer à la ligne.

Dans la démonstration, ouvrez **Paramètres globaux** depuis la barre latérale ou la roue dentée en haut à droite pour modifier la disposition, la densité, la largeur des libellés et le thème. Les modifications prennent effet immédiatement sans effacer les saisies en cours. La page des formulaires permet de **Suivre les paramètres globaux** ou de les remplacer localement. La démonstration active explicitement une disposition compacte sur une même ligne via son fournisseur.

## Taille et densité globales

`AutoConfigProvider` prend en charge `size: "small" | "medium" | "large"` et `density: "compact" | "comfortable"`. Les propriétés explicites des composants ont priorité sur les paramètres de leur catégorie, qui ont eux-mêmes priorité sur les valeurs globales :

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

La densité du tableau accepte également `normal`. Par défaut, le panneau de paramètres du tableau suit les paramètres globaux. Choisir un espacement compact, normal ou confortable remplace la densité globale et est enregistré avec le préréglage de disposition ; la propriété `density` du composant a la priorité la plus élevée. Les tailles locales des composants imbriqués s’appliquent indépendamment.

Les formulaires prennent en charge `resetLabel`, `extraActions` et `onReset` ; les panneaux de recherche prennent en charge `searchLabel`, `resetLabel` et `extraActions` ; les boîtes de dialogue prennent en charge `cancelLabel` et `extraActions`. Les éléments d’`AutoTabs` peuvent définir un `badge`, et `AutoTable.empty` personnalise le contenu de l’état vide.
