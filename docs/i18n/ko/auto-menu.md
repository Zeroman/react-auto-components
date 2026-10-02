# AutoMenu

[English](../../auto-menu.md) | [简体中文](../zh-CN/auto-menu.md) | [繁體中文](../zh-TW/auto-menu.md) | [日本語](../ja/auto-menu.md) | **한국어** | [Español](../es/auto-menu.md) | [Français](../fr/auto-menu.md) | [Deutsch](../de/auto-menu.md) | [Português (Brasil)](../pt-BR/auto-menu.md) | [Русский](../ru/auto-menu.md)

옆 막대입니다. 패널은 [AutoTabs](auto-tabs.md)를 씁니다.

## 동작과 속성

| 속성 | 동작 |
| --- | --- |
| `items` | `id`는 트리 안에서 유일합니다. `hidden`과 실패한 `canAccess`는 버립니다. 조상을 가리키는 `children`은 가지째 버려 재귀가 스택을 넘지 않게 합니다. |
| `value` | 선택된 잎 id. 생략하면 내부 상태입니다. |
| `onChange(id, item, path)` | **잡지 않습니다.** `path`는 뿌리부터 잎까지의 id입니다. 자식이 있는 부모는 펼치기만 하고 선택하지 않습니다. |
| `collapsible` | 기본 `false`. `collapsed`를 제어한다면 `onCollapsedChange`에서 직접 갱신하지 않으면 레일이 움직이지 않습니다. **`onCollapsedChange`는 잡지 않습니다.** |
| `disabled` | 그 항목과 자손을 비활성화합니다. 선택은 건너뜁니다. |

잎을 골라도 스스로 이동하지 않습니다. 신호는 `onChange`뿐입니다.

## 전제

`style.css`를 한 번. `AutoConfigProvider`는 선택입니다. 권한은 `config.canAccess`입니다.

앱 진입점에서 `import "@zeroman.yang/react-auto-components/style.css"`를 한 번 가져오세요. 스타일시트가 없으면 개발 모드에서 `RAC-CSS-MISSING`을 경고합니다.
