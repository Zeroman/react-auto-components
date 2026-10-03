# AutoSearch

[English](../../auto-search.md) | [简体中文](../zh-CN/auto-search.md) | [繁體中文](../zh-TW/auto-search.md) | [日本語](../ja/auto-search.md) | **한국어** | [Español](../es/auto-search.md) | [Français](../fr/auto-search.md) | [Deutsch](../de/auto-search.md) | [Português (Brasil)](../pt-BR/auto-search.md) | [Русский](../ru/auto-search.md)

검색 폼입니다. 내부 `AutoForm`이 `QueryNode`와 원값을 냅니다. 필드 throw는 [AutoForm](auto-form.md)과 같습니다.

`AutoSearchPanel`과 `AutoSearchPanelProps`는 `AutoSearch`와 `AutoSearchProps`의 더 이상 쓰지 않는 별칭입니다.

## 동작과 속성

| 속성 | 동작 |
| --- | --- |
| `onSearch(query, values)` | 필수입니다. **throw 또는 reject: 내부 폼이 잡고, 값은 남으며, `error.message`를 보여 줍니다. 초기화하지 않습니다.** |
| `mode` | 기본값은 `"instant"`로 변경, 제출, 초기화 시 검색합니다. `"manual"`은 제출 또는 초기화 시에만 검색합니다. |
| `columns` | 기본 `3`. |
| `more: true` | "더 보기"를 열기 전까지 숨깁니다. 숨긴 필드는 쿼리에 넣지 않습니다. |

| `match` | 값 |
| --- | --- |
| 생략 | `"eq"`. 배열이면 `"in"`. |
| `"contains"` | 부분 문자열. `ignoreCase: true`는 대소를 접습니다. |
| `"between"` | `[from, to]`. 스칼라는 `RAC-FIELD-BETWEEN`을 경고하고 어떤 행과도 맞지 않습니다. |
| `"isNull"` | null 또는 undefined. 입력값은 무시합니다. |
| 빈 값 | `undefined`, `null`, `""`, 빈 배열은 생략합니다. `"isNull"`은 예외입니다. |

초기화는 `defaultValue`로 되돌린 뒤 검색합니다. 필드 이름이 `/^[\w.]+$/`가 아니면 `serializeRsql`이 `RAC-QUERY-FIELD`를 던집니다.

## 전제

`style.css`를 한 번. `AutoConfigProvider`는 선택입니다.

앱 진입점에서 `import "@zeroman.yang/react-auto-components/style.css"`를 한 번 가져오세요. 스타일시트가 없으면 개발 모드에서 `RAC-CSS-MISSING`을 경고합니다.
