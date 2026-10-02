# AutoForm

[English](../../auto-form.md) | [简体中文](../zh-CN/auto-form.md) | [繁體中文](../zh-TW/auto-form.md) | [日本語](../ja/auto-form.md) | [한국어](../ko/auto-form.md) | [Español](../es/auto-form.md) | **Français** | [Deutsch](../de/auto-form.md) | [Português (Brasil)](../pt-BR/auto-form.md) | [Русский](../ru/auto-form.md)

Formulaire piloté par un schéma. `AutoSearch` et `AutoDialog` dessinent un `AutoForm`, donc ces règles s'appliquent aussi à eux.

`Field<T>` est une union discriminée par `type`. Un `select` sans `options`, un scalaire sur `daterange` et `match: "between"` sur un scalaire sont des erreurs TypeScript. `AnyField` et `unsafeField()` sont la sortie de secours ; le mode développement avertit encore. Codes dans [errors.md](errors.md).

## Comportement et props

| Prop | Comportement |
| --- | --- |
| `fields` | `readonly Field<T>[]`. Sans `type`, c'est un texte. Un `name` en double lance `RAC-FIELD-DUPLICATE` au montage. |
| `value` | Valeur contrôlée. Si elle diffère de l'état interne, le formulaire la copie et efface les erreurs. Si le parent ignore `onChange`, la saisie revient en arrière. |
| `onSubmit(value)` | Uniquement après validation. **Rejeter ou lancer : les valeurs restent, `error.message` s'affiche, pas de reset.** |
| `columns` | Défaut `2`. `actions` défaut `true`. |
| Étiquettes | `labelPosition` défaut `"top"`. `labelWidth` défaut `"auto"` (mesuré, plafond 45 % du champ). |

## Si un rappel lance

| Rappel | Résultat |
| --- | --- |
| `onSubmit` | Capturé. Le brouillon reste. Le message s'affiche. Pas de reset. |
| `rules` du champ | Le message lancé devient l'erreur de ce champ. Les règles suivantes ne courent pas. |
| `onChange` du champ | Non capturé. La valeur précédente reste. |
| `upload` | Le rejet s'affiche sous le champ et aucune valeur n'est stockée. `reset()` annule le signal et ignore un résultat tardif. |
| Envoi pendant un téléversement | `validate()` renvoie `false` et n'appelle pas `onSubmit`. |
| `hidden`, `disabled` ou accès refusé | Ce champ n'est pas validé, même s'il est `required`. |
| `required` vide | `undefined`, `null`, `""` ou un tableau vide bloquent l'envoi. |

`handle.validate()` résout `true` ou `false`. Il ne lance pas.

## Préconditions

Importez `style.css` une fois. En développement, l'absence de `--auto-text` avertit `RAC-CSS-MISSING`. `AutoConfigProvider` est optionnel et ne fournit pas les boîtes de dialogue.
