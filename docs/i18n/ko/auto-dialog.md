# AutoDialog

[English](../../auto-dialog.md) | [简体中文](../zh-CN/auto-dialog.md) | [繁體中文](../zh-TW/auto-dialog.md) | [日本語](../ja/auto-dialog.md) | **한국어** | [Español](../es/auto-dialog.md) | [Français](../fr/auto-dialog.md) | [Deutsch](../de/auto-dialog.md) | [Português (Brasil)](../pt-BR/auto-dialog.md) | [Русский](../ru/auto-dialog.md)

모달입니다. 선언적(`<AutoDialog open>`)이거나 명령적(`useAutoDialog().open()`)입니다. `fields`는 [AutoForm](auto-form.md)을 그립니다.

`useAutoDialog()`를 프로바이더 밖에서 부르면 `RAC-DIALOG-PROVIDER`입니다. 선언적 `<AutoDialog open>`에는 프로바이더가 필요 없습니다.

## 동작과 속성

| 속성 | 동작 |
| --- | --- |
| `onSubmit(values)` | 검증 후. **reject 또는 throw: 열린 채 `error.message`를 보여주고 값은 남습니다.** resolve 후에도 `beforeClose`가 실행됩니다. |
| `beforeClose(reason)` | `"submit"`, `"cancel"`, `"close"`. **`false`면 열린 채. throw도 열린 채 메시지를 보여 줍니다.** |
| `onClose` | 실제로 닫힌 뒤에만 호출됩니다. |
| `draftKey` | `${namespace}:draft:${draftKey}`에 초안을 두고, 제출이 성공하면 지웁니다. 생략하면 저장하지 않습니다. |
| `width` | 기본 `560`. `draggable`은 전체 화면에서는 무시됩니다. |

`open()`의 `close()`는 `beforeClose`가 막으면 `false`로 resolve 합니다. 명령형 대화 상자는 겹칠 수 있습니다.

## 전제

`style.css`를 한 번. `AutoConfigProvider`는 선택이며 `AutoDialogProvider`를 대신하지 않습니다. `namespace`는 `draftKey` 키에 들어갑니다.
