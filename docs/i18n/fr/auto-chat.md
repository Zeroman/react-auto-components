# AutoChat

[English](../../auto-chat.md) | [简体中文](../zh-CN/auto-chat.md) | [繁體中文](../zh-TW/auto-chat.md) | [日本語](../ja/auto-chat.md) | [한국어](../ko/auto-chat.md) | [Español](../es/auto-chat.md) | **Français** | [Deutsch](../de/auto-chat.md) | [Português (Brasil)](../pt-BR/auto-chat.md) | [Русский](../ru/auto-chat.md)

Une mise en page de conversation avec composeur optionnel, suivi de flux et chargement de l'historique antérieur. AutoChat n'ajoute aucune dépendance d'exécution et n'effectue aucune requête réseau, ne persiste pas les messages, n'analyse pas le Markdown, n'exécute pas la sortie d'outils et ne rend pas de HTML brut.

## Utilisation

```tsx
import { useState } from "react";
import { AutoChat, type AutoChatMessage } from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

export function Conversation() {
  const [messages, setMessages] = useState<AutoChatMessage[]>([]);
  return (
    <AutoChat
      height={600}
      messages={messages}
      onSend={async (text) => {
        setMessages((current) => [
          ...current,
          { id: crypto.randomUUID(), role: "user", content: text },
        ]);
        // Appelez ici votre service et mettez à jour messages.
      }}
    />
  );
}
```

## Fournissez votre propre rendu

Transmettez des nœuds React via `content`, ou étendez `AutoChatMessage` avec les champs de votre application et fournissez `renderMessage(message, { index })`. Connectez-y un rendu Markdown existant, une visionneuse de code, une carte de pièces jointes ou un composant de résultat d'outil. AutoChat n'interprète jamais ces formats ; une simple chaîne est rendue comme texte. Le rendu hôte contrôle les liens, le HTML et tout contenu interactif.

Chaque message possède un `id` unique et stable et un `role` : `user`, `assistant`, `system`, `tool` ou `error`. Les champs optionnels `author`, `avatar`, `meta` et `streaming` personnalisent son habillage ; `renderActions(message, context)` fournit des actions par message. Conservez le même ID lors de la mise à jour d'une réponse en flux et remplacez le tableau de messages de façon immuable.

## Comportement et props

| Prop | Comportement |
| --- | --- |
| `height` | Hauteur CSS, par défaut `100%`. Donnez au parent une hauteur définie ou passez un nombre tel que `600`. L'historique défile à l'intérieur du composant. |
| `autoFollow` | Par défaut `true`. Suit le nouveau contenu et les redimensionnements en bas ; se met en pause quand le lecteur remonte. **Revenir au plus récent** relance le suivi. |
| `hasMore`, `onLoadOlder`, `loadingOlder` | Affichent un bouton d'historique antérieur. Préfixe les messages avec des IDs stables ; le message visible reste ancré. Les requêtes sont dédupliquées et une requête rejetée peut être relancée. |
| `onSend(text)` | Active le composeur. Reçoit le texte original non vide ; peut renvoyer une promesse. Accepter vide ce brouillon ; rejeter le conserve et affiche une erreur générique. Un brouillon plus récent n'est jamais vidé par un envoi plus ancien. |
| `value`, `defaultValue`, `onValueChange` | Valeur de composeur contrôlée ou locale. Avec une valeur contrôlée, appliquez les changements dans l'hôte. |
| `generating`, `onStop` | Désactive les envois pendant la génération et expose un bouton d'arrêt. L'hôte doit annuler son propre flux/requête et mettre à jour `generating`. |
| `sendOnEnter` | Par défaut `true` ; Shift+Entrée insère un saut de ligne. Les événements de composition et la validation IME ne soumettent jamais. Mettre à `false` pour n'envoyer que par bouton. |
| `disabled`, `composer` | Désactive l'éditeur intégré ou le masque (`composer={false}`) avec un éditeur externe. |
| `conversationKey` | Réinitialise brouillon local, UI en cours et défilement au changement de conversation. Les valeurs contrôlées et l'annulation restent gérées par l'hôte. |
| `header`, `footer`, `empty`, `composerExtra` | Emplacements de contenu React. |
| `size`, `density` | Remplacent les réglages globaux d'`AutoConfigProvider`. |
| `labels` | Remplacent les libellés anglais intégrés. Le provider traduit aussi `chat.send`, `chat.latest` et les autres clés `chat.*`. |
| `onSendError`, `onLoadError` | Reçoivent l'erreur originale pour la journalisation applicative ; les détails d'erreur internes ne sont pas affichés automatiquement. |

Pour les grands historiques, activez `virtual` afin d'utiliser la dépendance TanStack Virtual déjà présente. Seuls les messages visibles et une petite fenêtre d'overscan sont montés ; les hauteurs dynamiques sont mesurées. Ajustez si besoin `estimatedMessageHeight` (par défaut `120`) et `overscan` (par défaut `6`). Conservez des IDs stables en préfixant l'historique. En mode virtuel, gardez dans l'hôte tout état interactif devant survivre au démontage des lignes hors viewport. Les conversations ordinaires utilisent par défaut la mise en page non virtuelle.

La démo **Grand historique** charge 1 000, 10 000 ou 50 000 messages à hauteur variable, indique le nombre réel de messages montés et prend en charge l'ajout de 100 messages, le flux, le chargement d'historique antérieur et le saut vers l'une ou l'autre extrémité.

Le ref `AutoChatHandle` expose `scrollToBottom()`, `scrollToMessage(id)` (renvoie l'existence de l'ID), `focusComposer()` et `getScrollElement()`. L'historique utilise un journal focalisable au clavier ; une région de statut séparée annonce l'état d'envoi/génération sans annoncer chaque token du flux.

Voir [la démo exécutable](../../../test-project/src/examples/ChatDemo.tsx) pour une simulation locale de flux, l'annulation, une carte d'outil personnalisée, la pagination, les échecs d'envoi et une interface en dix langues.

## Rendu riche dans la démo

Le `test-project` privé installe [react-markdown](https://github.com/remarkjs/react-markdown) et [remark-gfm](https://github.com/remarkjs/remark-gfm). Ces dépendances ne font pas partie de la bibliothèque de composants. Son sélecteur de formats insère du Markdown (titres, emphase, listes de tâches et tableaux GFM), du code, du JSON, des tableaux de données, une image locale ou une carte React interactive d'évaluation.

`ChatRenderers.tsx` choisit des composants React à partir de données de message structurées. `ChatTaskCard.tsx` illustre un état interactif local. Markdown utilise `skipHtml` et la gestion des URLs par défaut de la bibliothèque ; il ne compile pas de JSX ni n'exécute de blocs de code. Le même rendu Markdown affiche les réponses en flux. Les composants personnalisés sont fournis par l'application, jamais instanciés depuis du texte de message exécutable.

```tsx
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

<AutoChat
  messages={messages}
  renderMessage={(message) => (
    <Markdown remarkPlugins={[remarkGfm]} skipHtml>
      {String(message.content ?? "")}
    </Markdown>
  )}
/>
```
