# 컴포넌트 통합 가이드

[English](../../migration.md) | [简体中文](../zh-CN/migration.md) | [繁體中文](../zh-TW/migration.md) | [日本語](../ja/migration.md) | **한국어** | [Español](../es/migration.md) | [Français](../fr/migration.md) | [Deutsch](../de/migration.md) | [Português (Brasil)](../pt-BR/migration.md) | [Русский](../ru/migration.md)

React 제네릭, 콜백, 프로바이더를 통해 컴포넌트를 구성합니다. 다음 표는 일반적인 애플리케이션 요구 사항을 공개 API와 실행 가능한 예제에 매핑합니다.

| 기존 사용 사례 | React API | 실행 가능한 예제 / 테스트 |
| --- | --- | --- |
| 폼 필드 및 v-model | `fields: Field<T>[]`, `value/onChange` 또는 `defaultValue` | `test-project/src/examples/FormDemo.tsx`의 폼 페이지; `tests/form*.test.tsx` |
| 슬롯 및 추가 콘텐츠 | 필드 `render`, 열 `render/header`, ReactNode | 폼/테이블 페이지 |
| 폼 인스턴스 작업 | `ref.validate/reset/getValues/setValue/focus` | `tests/form.test.tsx` |
| 검색, 연관 조건, RSQL | `buildQuery`, `matchesQuery`, `serializeRsql` | 검색 페이지; `tests/query.test.ts` |
| 로컬/원격 테이블 데이터 | `data` 또는 `dataSource(query,{signal})` | 테이블 페이지; `tests/table.test.tsx` |
| 레이아웃/필터/정렬/내보내기 프리셋 | 설정 대화 상자의 독립적인 프리셋, `versions`로 각각 무효화 | 테이블 페이지; `tests/table-settings.test.ts` |
| 트리, 상세, 집계, 셀 병합 | `getChildren/renderExpanded`, 열 `summary/merge` | 트리 및 펼치기 예제; `tests/table-advanced.test.tsx` |
| 추가, 편집, 삭제 | `formFields` 및 `onAdd/onEdit/onDelete` | 브라우저 CRUD 테스트 |
| 명령형 대화 상자 | `AutoDialogProvider` + `useAutoDialog().open()` | 대화 상자 페이지; `tests/dialog.test.tsx` |
| 탭 및 중첩 탭 | `AutoTabs` items, value/onChange, keepMounted | 탭 페이지; `tests/tabs.test.tsx` |
| 채팅 메시지 목록과 대화 UI | `AutoChat`, `messages`, `onSend`, `renderMessage` | `test-project/src/examples/Chat*.tsx` 채팅 페이지; `tests/chat.test.tsx` |

## 필드 유형

`input/email/textarea/integer/float/percentage/progress/switch/select/select-v2/radio/checkbox/cascader/autocomplete/date/datetime/daterange/datetimerange/upload/text/title/tip/button/append/custom`.

`select-v2`는 옵션을 가상화합니다. 날짜 범위는 각각 레이블이 있는 네이티브 입력 2개를 사용하며, `dateValue`로 문자열 또는 타임스탬프를 선택합니다. 숫자 입력은 편집 중간 상태를 허용합니다. 제출 시 비즈니스 제약 조건을 검증하려면 필드 규칙을 사용하세요. `rules`는 비동기 유효성 검사를 지원하며 숨겨진 필드는 검사를 건너뜁니다. 옵션은 숫자/불리언 값을 문자열로 강제 변환하지 않고 유지합니다.

```tsx
const fields: Field<User>[] = [
  { name: 'name', label: '이름', required: true },
  { name: 'note', label: '메모', hidden: values => !values.enabled,
    render: ({ value, onChange, disabled }) =>
      <textarea disabled={disabled} value={String(value ?? '')}
        onChange={event => onChange(event.target.value)} /> },
];
```

전체 API는 내보낸 TypeScript 타입을 참고하세요. `Field<T>`는 T의 실제 키에 연결되며, 제목과 도움말 같은 구조적 항목에는 데이터 속성이 필요하지 않습니다.

## 서버 측 데이터 소스

```tsx
const dataSource: DataSource<User> = async (query, { signal }) => {
  const response = await fetch('/api/users/search', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  if (!response.ok) throw new Error('로드 실패');
  return response.json(); // { rows: User[], total: number }
};
```

페이지 인덱스는 0부터 시작합니다. `sort`는 순서가 있는 필드 배열이며, `filter`는 구조화된 쿼리 트리입니다. 컴포넌트는 이전 요청을 취소하고 늦게 도착한 응답이 새 쿼리를 덮어쓰지 못하도록 합니다. 데이터 소스 클로저 외부의 비즈니스 조건이 변경되면 테이블의 `ref.refresh()`를 호출하세요. 불필요한 요청을 피하려면 데이터 소스 함수의 참조를 안정적으로 유지하세요. RSQL 직렬화는 이를 필요로 하는 백엔드용 어댑터일 뿐이며 쿼리 문자열을 실행하지 않습니다.

## 애플리케이션 업로드 및 영속화

필드의 `upload(files, signal)`은 애플리케이션이 파일을 저장한 후 필드 값을 반환합니다. 컴포넌트는 업로드 실패를 표시하며, 호출자는 업로드 URL, 인증, 객체 스토리지 정책을 제공합니다.

```tsx
<AutoConfigProvider config={{
  namespace: 'tenant-admin',
  canAccess: access => !access.permissions?.length || access.permissions.every(p => myPermissions.includes(p)),
  settings: {
    load: key => api.loadTableSettings(key),
    save: (key, settings) => api.saveTableSettings(key, settings),
  },
  notify: (message, level) => showToast(message, level),
}}>{children}</AutoConfigProvider>
```

로컬 변경 사항은 즉시 적용되며, 원격 저장은 순차적으로 실행되고 실패 시 재시도 옵션이 제공됩니다. 저장된 설정 형식을 변경할 때는 호환되지 않는 설정이 로드되는 것을 피하기 위해 새로운 table id 또는 version을 사용하세요.
