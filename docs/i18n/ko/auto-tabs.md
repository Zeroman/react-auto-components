# AutoTabs

[English](../../auto-tabs.md) | [简体中文](../zh-CN/auto-tabs.md) | [繁體中文](../zh-TW/auto-tabs.md) | [日本語](../ja/auto-tabs.md) | **한국어** | [Español](../es/auto-tabs.md) | [Français](../fr/auto-tabs.md) | [Deutsch](../de/auto-tabs.md) | [Português (Brasil)](../pt-BR/auto-tabs.md) | [Русский](../ru/auto-tabs.md)

탭입니다. 중첩은 `children`으로 넣은 또 다른 `AutoTabs`입니다. 옆 막대는 [AutoMenu](auto-menu.md)입니다.

## 동작과 속성

| 속성 | 동작 |
| --- | --- |
| `items` | 안정적인 `id`. `hidden`과 실패한 `canAccess`는 탭을 뺍니다. |
| `value` | 뿌리부터의 id 경로. 중첩은 `["parent", "child"]`입니다. |
| `onChange(path, item)` | **잡지 않습니다.** throw하면 React가 보고합니다. 제어 중이라면 아직 확정하지 않은 경로는 이전 값입니다. |
| `mode` | 기본 `"horizontal"`. `"vertical"`은 탭을 세로로 둡니다. |
| `keepMounted` | 기본 `true`. 선택하지 않은 패널도 마운트된 채입니다. `false`는 언마운트합니다. |
| `onRefresh` | 있으면 그 탭에 새로 고침 단추. **잡지 않습니다.** |
| `disabled` | 보이지만 선택할 수 없습니다. 기본 선택은 비활성 탭을 건너뜁니다. |

## 전제

`style.css`를 한 번(개발 시 `RAC-CSS-MISSING`). `AutoConfigProvider`는 선택입니다.

## 동적 탭

`useAutoTabsWorkspace`는 라우터 없이 페이지를 열고 닫습니다. `tabsProps`를 `AutoTabs`에 넘깁니다. 같은 id를 다시 `open`하면 초안을 유지한 채 그 탭을 선택합니다. 고정된 탭은 닫을 수 없습니다. `ready`가 된 뒤에 `open`하세요. 선택, `params`, `state`는 마운트 후 `sessionStorage`에서 복원됩니다. `beforeClose`가 `false`를 반환하거나 throw 하면 닫히지 않습니다. 예제는 [DynamicTabsDemo.tsx](../../../test-project/src/examples/DynamicTabsDemo.tsx)입니다.
