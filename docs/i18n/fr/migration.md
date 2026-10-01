# Guide d'intégration des composants

[English](../../migration.md) | [简体中文](../zh-CN/migration.md) | [繁體中文](../zh-TW/migration.md) | [日本語](../ja/migration.md) | [한국어](../ko/migration.md) | [Español](../es/migration.md) | **Français** | [Deutsch](../de/migration.md) | [Português (Brasil)](../pt-BR/migration.md) | [Русский](../ru/migration.md)

Configurez les composants via les génériques React, les callbacks et les providers. Le tableau suivant associe les besoins applicatifs courants aux API publiques et aux exemples exécutables.

| Cas d’utilisation d’origine | API React | Exemple exécutable / test |
| --- | --- | --- |
| Champs de formulaire et v-model | `fields: Field<T>[]`, `value/onChange` ou `defaultValue` | Page des formulaires dans `test-project/src/App.tsx` ; `tests/form*.test.tsx` |
| Slots et contenu ajouté | `render` du champ, `render/header` de la colonne, ReactNode | Pages des formulaires/tableaux |
| Opérations sur l’instance du formulaire | `ref.validate/reset/getValues/setValue/focus` | `tests/form.test.tsx` |
| Recherche, conditions liées, RSQL | `buildQuery`, `matchesQuery`, `serializeRsql` | Page de recherche ; `tests/query.test.ts` |
| Données de tableau locales/distantes | Soit `data`, soit `dataSource(query,{signal})` | Page des tableaux ; `tests/table.test.tsx` |
| Préréglages de disposition/filtrage/tri/exportation | Préréglages indépendants dans la boîte de dialogue des paramètres, invalidés séparément par `versions` | Page des tableaux ; `tests/table-settings.test.ts` |
| Arbres, détails, synthèses, cellules fusionnées | `getChildren/renderExpanded`, `summary/merge` de la colonne | Exemples d’arbres et de dépliage ; `tests/table-advanced.test.tsx` |
| Ajout, modification, suppression | `formFields` et `onAdd/onEdit/onDelete` | Tests CRUD dans le navigateur |
| Boîtes de dialogue impératives | `AutoDialogProvider` + `useAutoDialog().open()` | Page des boîtes de dialogue ; `tests/dialog.test.tsx` |
| Service de fenêtres contextuelles | `AutoPopoverProvider` + `useAutoPopover()` | Page des fenêtres contextuelles ; `tests/popover.test.tsx` |
| Défilement virtuel | `AutoScroll` et méthodes de la référence | Page de défilement ; test dans le navigateur avec 10 000 lignes |
| Onglets et onglets imbriqués | Éléments d’`AutoTabs`, value/onChange, keepMounted | Page des onglets ; `tests/tabs.test.tsx` |

## Types de champ

`input/email/textarea/integer/float/percentage/progress/switch/select/select-v2/radio/checkbox/cascader/autocomplete/date/datetime/daterange/datetimerange/upload/text/title/tip/button/append/custom`.

`select-v2` virtualise les options. Les plages de dates utilisent deux champs natifs avec des libellés distincts ; `dateValue` choisit entre chaînes de caractères et horodatages. Les champs numériques autorisent les états intermédiaires de saisie ; utilisez les règles des champs pour valider les contraintes métier lors de l’envoi. `rules` prend en charge la validation asynchrone, tandis que les champs masqués ne sont pas validés. Les options conservent les valeurs numériques/booléennes au lieu de les convertir en chaînes.

```tsx
const fields: Field<User>[] = [
  { name: 'name', label: 'Nom', required: true },
  { name: 'note', label: 'Remarque', hidden: values => !values.enabled,
    render: ({ value, onChange, disabled }) =>
      <textarea disabled={disabled} value={String(value ?? '')}
        onChange={event => onChange(event.target.value)} /> },
];
```

Consultez les types TypeScript exportés pour connaître l’API complète. `Field<T>` est lié aux clés réelles de T ; les éléments structurels comme les titres et les conseils n’ont pas besoin de propriété de données.

## Sources de données côté serveur

```tsx
const dataSource: DataSource<User> = async (query, { signal }) => {
  const response = await fetch('/api/users/search', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  if (!response.ok) throw new Error('Échec du chargement');
  return response.json(); // { rows: User[], total: number }
};
```

Les indices de page commencent à 0. `sort` est un tableau ordonné de champs ; `filter` est un arbre de requête structuré. Les composants annulent les anciennes requêtes et empêchent les réponses tardives d’écraser des requêtes plus récentes. Appelez `ref.refresh()` sur le tableau lorsque des conditions métier extérieures à la fermeture de la source de données changent. Gardez la fonction de source de données stable pour éviter des requêtes inutiles. La sérialisation RSQL est uniquement un adaptateur pour les serveurs qui l’exigent ; elle n’exécute pas de chaînes de requête.

## Téléversements et persistance de l’application

La méthode `upload(files, signal)` d’un champ renvoie la valeur du champ après l’enregistrement des fichiers par l’application. Le composant affiche les échecs de téléversement ; les appelants fournissent les URL de téléversement, l’authentification et les politiques de stockage d’objets.

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

Les modifications locales s'appliquent immédiatement ; les sauvegardes distantes s'exécutent en série, avec une option de réessai après un échec. Lors d'un changement de format des paramètres persistés, utilisez un nouvel id de table ou une nouvelle version pour éviter de charger des paramètres incompatibles.
