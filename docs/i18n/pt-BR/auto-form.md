# AutoForm

[English](../../auto-form.md) | [简体中文](../zh-CN/auto-form.md) | [繁體中文](../zh-TW/auto-form.md) | [日本語](../ja/auto-form.md) | [한국어](../ko/auto-form.md) | [Español](../es/auto-form.md) | [Français](../fr/auto-form.md) | [Deutsch](../de/auto-form.md) | **Português (Brasil)** | [Русский](../ru/auto-form.md)

Formulário por esquema. `AutoSearch` e `AutoDialog` desenham um `AutoForm`, então estas regras de callback valem para eles.

`Field<T>` é uma união discriminada por `type`. `select` sem `options`, um escalar em `daterange` e `match: "between"` num escalar são erros de TypeScript. `AnyField` e `unsafeField()` são a saída; o modo de desenvolvimento ainda avisa. Códigos em [errors.md](errors.md).

## Comportamento e props

| Prop | Comportamento |
| --- | --- |
| `fields` | `readonly Field<T>[]`. Sem `type` é um texto. `name` duplicado lança `RAC-FIELD-DUPLICATE` na montagem. |
| `value` | Valor controlado. Se diferir do estado interno, o formulário copia e limpa erros. Se o pai ignorar `onChange`, o input volta. |
| `onSubmit(value)` | Só depois da validação. **Rejeitar ou lançar: os valores ficam, `error.message` aparece e não há reset.** |
| `columns` | Padrão `2`. `actions` padrão `true`. |
| Rótulos | `labelPosition` padrão `"top"`. `labelWidth` padrão `"auto"` (medido, teto de 45% do campo). |

## Se um callback lançar

| Callback | Resultado |
| --- | --- |
| `onSubmit` | Capturado. O rascunho fica. A mensagem aparece. Sem reset. |
| `rules` do campo | A mensagem lançada vira o erro daquele campo. As regras seguintes não rodam. |
| `onChange` do campo | Não capturado. O valor anterior fica. |
| `upload` | A rejeição aparece sob o input e nada é gravado. `reset()` aborta o sinal e descarta um resultado tardio. |
| Envio com upload em andamento | `validate()` devolve `false` e não chama `onSubmit`. |
| `hidden`, `disabled` ou sem acesso | Esse campo não é validado, mesmo se `required`. |
| `required` vazio | `undefined`, `null`, `""` ou um array vazio bloqueiam o envio. |

`handle.validate()` resolve `true` ou `false`. Não lança.

## Pré-condições

Importe `style.css` uma vez. Em desenvolvimento, a falta de `--auto-text` avisa `RAC-CSS-MISSING`. `AutoConfigProvider` é opcional e não monta diálogos.
