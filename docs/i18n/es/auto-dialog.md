# AutoDialog

[English](../../auto-dialog.md) | [简体中文](../zh-CN/auto-dialog.md) | [繁體中文](../zh-TW/auto-dialog.md) | [日本語](../ja/auto-dialog.md) | [한국어](../ko/auto-dialog.md) | **Español** | [Français](../fr/auto-dialog.md) | [Deutsch](../de/auto-dialog.md) | [Português (Brasil)](../pt-BR/auto-dialog.md) | [Русский](../ru/auto-dialog.md)

Diálogo modal, declarativo (`<AutoDialog open>`) o imperativo (`useAutoDialog().open()`). `fields` dibuja un [AutoForm](auto-form.md).

`useAutoDialog()` fuera del proveedor lanza `RAC-DIALOG-PROVIDER`. `<AutoDialog open>` no necesita el proveedor.

## Comportamiento y props

| Prop | Comportamiento |
| --- | --- |
| `onSubmit(values)` | Tras validar. **Rechazar o lanzar: el diálogo sigue abierto, muestra `error.message` y los valores se quedan.** Después de resolver sigue corriendo `beforeClose`. |
| `beforeClose(reason)` | `"submit"`, `"cancel"` o `"close"`. **`false` lo deja abierto. Lanzar también lo deja abierto y muestra el mensaje.** |
| `onClose` | Solo después de cerrar de verdad. |
| `draftKey` | Guarda el borrador en `${namespace}:draft:${draftKey}` hasta un envío correcto. Si se omite, no se guarda nada. |
| `width` | Por defecto `560`. `draggable` se ignora a pantalla completa. |

`close()` de `open()` resuelve `false` si `beforeClose` bloquea el cierre. Los diálogos imperativos se apilan.

## Precondiciones

Importa `style.css` una vez. `AutoConfigProvider` es opcional y no sustituye a `AutoDialogProvider`. `namespace` forma parte de la clave del borrador.
