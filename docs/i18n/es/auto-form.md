# AutoForm

[English](../../auto-form.md) | [简体中文](../zh-CN/auto-form.md) | [繁體中文](../zh-TW/auto-form.md) | [日本語](../ja/auto-form.md) | [한국어](../ko/auto-form.md) | **Español** | [Français](../fr/auto-form.md) | [Deutsch](../de/auto-form.md) | [Português (Brasil)](../pt-BR/auto-form.md) | [Русский](../ru/auto-form.md)

Formulario por esquema. `AutoSearch` y `AutoDialog` dibujan un `AutoForm`, así que estas reglas de callbacks también valen para ellos.

`Field<T>` es una unión discriminada por `type`. Un `select` sin `options`, un escalar en `daterange` y `match: "between"` sobre un escalar son errores de TypeScript. `AnyField` y `unsafeField()` son la salida; el modo desarrollo sigue avisando. Códigos en [errors.md](errors.md).

## Comportamiento y props

| Prop | Comportamiento |
| --- | --- |
| `fields` | `readonly Field<T>[]`. Sin `type` es un texto. Un `name` duplicado lanza `RAC-FIELD-DUPLICATE` al montar. |
| `value` | Valor controlado. Si difiere del estado interno, el formulario lo copia y limpia errores. Si el padre ignora `onChange`, el input vuelve atrás. |
| `onSubmit(value)` | Solo tras validar. **Rechazar o lanzar: los valores se quedan, se muestra `error.message` y no hay reset.** |
| `columns` | Por defecto `2`. `actions` por defecto `true`. |
| Etiquetas | `labelPosition` por defecto `"top"`. `labelWidth` por defecto `"auto"` (medido, tope 45% del campo). |

## Si un callback lanza

| Callback | Resultado |
| --- | --- |
| `onSubmit` | Se captura. El borrador se queda. Se muestra el mensaje. No hay reset. |
| `rules` del campo | El mensaje lanzado pasa a ser el error de ese campo. Las reglas siguientes no corren. |
| `onChange` del campo | No se captura. Queda el valor anterior. |
| `upload` | El rechazo se ve bajo el input y no se guarda valor. `reset()` aborta la señal y tira un resultado tardío. |
| Envío con una subida en curso | `validate()` devuelve `false` y no llama a `onSubmit`. |
| `hidden`, `disabled` o sin acceso | Ese campo no se valida, aunque sea `required`. |
| `required` vacío | `undefined`, `null`, `""` o un array vacío bloquean el envío. |

`handle.validate()` resuelve `true` o `false`. No lanza.

## Precondiciones

Importa `style.css` una vez. En desarrollo, si falta `--auto-text`, avisa `RAC-CSS-MISSING`. `AutoConfigProvider` es opcional y no monta diálogos.
