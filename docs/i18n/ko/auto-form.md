# AutoForm

[English](../../auto-form.md) | [简体中文](../zh-CN/auto-form.md) | [繁體中文](../zh-TW/auto-form.md) | [日本語](../ja/auto-form.md) | **한국어** | [Español](../es/auto-form.md) | [Français](../fr/auto-form.md) | [Deutsch](../de/auto-form.md) | [Português (Brasil)](../pt-BR/auto-form.md) | [Русский](../ru/auto-form.md)

스키마 폼입니다. `AutoSearch`과 `AutoDialog`도 안에서 `AutoForm`을 그리므로 콜백 규칙은 같습니다.

`Field<T>`는 `type`으로 구분됩니다. `options` 없는 `select`, 스칼라 `daterange`, 스칼라 필드의 `match: "between"`은 TypeScript 오류입니다. `AnyField`와 `unsafeField()`는 탈출구이며 개발 모드는 여전히 경고합니다. 코드는 [errors.md](errors.md)입니다.

## 동작과 속성

| 속성 | 동작 |
| --- | --- |
| `fields` | `readonly Field<T>[]`. `type`을 생략하면 텍스트 입력입니다. `name`이 중복이면 마운트 때 `RAC-FIELD-DUPLICATE`를 던집니다. |
| `value` | 제어 값입니다. 내부 상태와 다르면 복사하고 오류를 지웁니다. 부모가 `onChange`를 무시하면 입력이 되돌아갑니다. |
| `onSubmit(value)` | 검증 후에만 호출됩니다. **reject 또는 throw: 값은 남고, `error.message`를 보여 주며, 초기화하지 않습니다.** |
| `columns` | 기본값 `2`. `actions` 기본값은 `true`입니다. |
| 라벨 | `labelPosition` 기본 `"top"`. `labelWidth` 기본 `"auto"`(측정 후 필드 너비의 45%까지). |

## 콜백이 throw 하면

| 콜백 | 결과 |
| --- | --- |
| `onSubmit` | 잡습니다. 초안은 남고 메시지를 보이며 초기화하지 않습니다. |
| 필드 `rules` | 그 필드의 오류 문구가 됩니다. 이후 규칙은 실행하지 않습니다. |
| 필드 `onChange` | 잡지 않습니다. 이전 값이 남습니다. |
| `upload` | 거절은 입력 아래에 나오고 값은 저장하지 않습니다. `reset()`은 `AbortSignal`을 중단하고 늦은 결과를 버립니다. |
| 업로드 중 제출 | `validate()`는 `false`를 반환하고 `onSubmit`을 호출하지 않습니다. |
| `hidden`, `disabled`, 권한 실패 | `required`여도 검증하지 않습니다. |
| `required`가 비어 있음 | `undefined`, `null`, `""`, 빈 배열은 제출을 막습니다. |

`handle.validate()`는 `true` 또는 `false`로 resolve 하고 던지지 않습니다.

## 전제

`style.css`를 한 번 가져옵니다. 개발 모드에서 `--auto-text`가 없으면 `RAC-CSS-MISSING`입니다. `AutoConfigProvider`는 선택이며 대화 상자를 제공하지 않습니다.
