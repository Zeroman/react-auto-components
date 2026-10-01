# Projet consommateur et de test autonome

[English](../../../test-project/README.md) | [简体中文](../zh-CN/test-project.md) | [繁體中文](../zh-TW/test-project.md) | [日本語](../ja/test-project.md) | [한국어](../ko/test-project.md) | [Español](../es/test-project.md) | **Français** | [Deutsch](../de/test-project.md) | [Português (Brasil)](../pt-BR/test-project.md) | [Русский](../ru/test-project.md)

Ce projet installe la bibliothèque de composants depuis une archive tarball locale, avec des dépendances et des builds indépendants. Il n’utilise pas d’alias vers les sources.

La démo détecte automatiquement la langue du navigateur, avec l'anglais comme solution de repli. Choisissez une langue dans l'en-tête ou dans les paramètres globaux ; votre sélection est conservée après rechargement. Sélectionnez Auto pour suivre à nouveau la langue du navigateur. Dix langues sont prises en charge. Les pages remplissent la fenêtre (viewport), les tableaux et les longs panneaux défilant à l'intérieur de leurs propres zones.

Chaque page d'exemple inclut un bouton **Voir le code** qui ouvre son véritable fichier source dans une boîte de dialogue, avec onglets de fichiers, copie en un clic et lien GitHub.

Depuis la racine du dépôt, exécutez `pnpm install --frozen-lockfile` et `pnpm prepare:test-project`, puis `pnpm --dir test-project dev`.

- `pnpm --dir test-project build` : vérifie les types publics et crée un build de production.
- `pnpm exec playwright install chromium` : installe le navigateur lors de la première utilisation.
- `pnpm --dir test-project test` : exécute les tests d’interaction Chromium (démarre automatiquement un serveur séparé sur le port 4174).
- Après avoir modifié la bibliothèque, relancez `pnpm prepare:test-project` pour mettre à jour la dépendance vers l’archive tarball dont le nom contient une empreinte du contenu.

Les tests dans le navigateur de `tests/components.spec.ts` couvrent les opérations CRUD, la validation des champs et les nouvelles tentatives après un échec d’envoi, la persistance des paramètres, les brouillons et le focus, les fenêtres contextuelles, les onglets imbriqués, le défilement sur 10 000 lignes, la pagination côté serveur, les mesures des zones dépliées, les largeurs de colonne, les téléchargements et les dispositions mobiles. Les captures d’écran sont enregistrées dans `test-results/`.

La démonstration de hauteur restante se trouve dans l’onglet **AutoTable → Hauteur restante**. L’ancienne URL `http://127.0.0.1:4173/?demo=auto-height` ouvre la même page et sélectionne cet onglet. L’exemple permet de basculer entre Flex/Grid, d’ajouter ou de supprimer du contenu au-dessus du tableau, d’afficher ou de masquer le tableau, et de modifier la pagination et le nombre de lignes. `tests/auto-height.spec.ts` mesure les limites dans le navigateur et la hauteur de la zone de défilement pour vérifier la disposition dans l’espace restant, le redimensionnement dynamique, la reprise de la virtualisation et la compatibilité avec une hauteur fixe.

Les tests dans le navigateur démarrent un nouveau serveur Vite sur le port 4174 au lieu de réutiliser la démonstration de développement sur le port 4173. Le script de recréation du paquet informe les serveurs de démonstration existants afin qu’ils résolvent le paquet nouvellement installé, ce qui évite les composants obsolètes.

Les paramètres globaux sont séparés du contenu des exemples et implémentés dans `src/GlobalSettings.tsx`. Ouvrez le panneau depuis la barre latérale ou le contrôle en haut à droite. L’exemple courant reste monté pendant les modifications de disposition, de densité, de largeur des libellés ou de thème.
