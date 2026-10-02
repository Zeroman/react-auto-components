# AutoDialog

[English](../../auto-dialog.md) | [简体中文](../zh-CN/auto-dialog.md) | [繁體中文](../zh-TW/auto-dialog.md) | [日本語](../ja/auto-dialog.md) | [한국어](../ko/auto-dialog.md) | [Español](../es/auto-dialog.md) | **Français** | [Deutsch](../de/auto-dialog.md) | [Português (Brasil)](../pt-BR/auto-dialog.md) | [Русский](../ru/auto-dialog.md)

Boîte modale, déclarative (`<AutoDialog open>`) ou impérative (`useAutoDialog().open()`). `fields` dessine un [AutoForm](auto-form.md).

`useAutoDialog()` hors du fournisseur lance `RAC-DIALOG-PROVIDER`. `<AutoDialog open>` n'a pas besoin du fournisseur.

## Comportement et props

| Prop | Comportement |
| --- | --- |
| `onSubmit(values)` | Après validation. **Rejeter ou lancer : la boîte reste ouverte, montre `error.message`, les valeurs restent.** Après résolution, `beforeClose` court encore. |
| `beforeClose(reason)` | `"submit"`, `"cancel"` ou `"close"`. **`false` laisse ouvert. Lancer laisse aussi ouvert et montre le message.** |
| `onClose` | Seulement après une vraie fermeture. |
| `draftKey` | Persiste le brouillon dans `${namespace}:draft:${draftKey}` jusqu'à un envoi réussi. Omis : rien n'est stocké. |
| `width` | Défaut `560`. `draggable` est ignoré en plein écran. |

`close()` de `open()` résout `false` si `beforeClose` bloque. Les boîtes impératives s'empilent.

## Préconditions

Importez `style.css` une fois. `AutoConfigProvider` est optionnel et ne remplace pas `AutoDialogProvider`. `namespace` entre dans la clé du brouillon.
