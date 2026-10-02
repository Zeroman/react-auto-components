# AutoDialog

[English](../../auto-dialog.md) | [简体中文](../zh-CN/auto-dialog.md) | [繁體中文](../zh-TW/auto-dialog.md) | [日本語](../ja/auto-dialog.md) | [한국어](../ko/auto-dialog.md) | [Español](../es/auto-dialog.md) | [Français](../fr/auto-dialog.md) | [Deutsch](../de/auto-dialog.md) | [Português (Brasil)](../pt-BR/auto-dialog.md) | **Русский**

Модальный диалог, декларативный (`<AutoDialog open>`) или императивный (`useAutoDialog().open()`). `fields` рисует [AutoForm](auto-form.md).

`useAutoDialog()` вне провайдера бросает `RAC-DIALOG-PROVIDER`. `<AutoDialog open>` провайдер не нужен.

## Поведение и свойства

| Свойство | Поведение |
| --- | --- |
| `onSubmit(values)` | После проверки. **Reject или throw: диалог остается открытым, показывает `error.message`, значения остаются.** После resolve все еще выполняется `beforeClose`. |
| `beforeClose(reason)` | `"submit"`, `"cancel"` или `"close"`. **`false` оставляет открытым. Throw тоже оставляет открытым и показывает сообщение.** |
| `onClose` | Только после настоящего закрытия. |
| `draftKey` | Хранит черновик в `${namespace}:draft:${draftKey}` до успешной отправки. Если опустить, ничего не сохраняется. |
| `width` | По умолчанию `560`. `draggable` в полноэкранном режиме игнорируется. |

`close()` у `open()` резолвится в `false`, если `beforeClose` блокирует закрытие. Императивные диалоги складываются в стопку.

## Предусловия

Импортируйте `style.css` один раз. `AutoConfigProvider` необязателен и не заменяет `AutoDialogProvider`. `namespace` входит в ключ черновика.
