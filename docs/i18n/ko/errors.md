# 오류 코드

[English](../../errors.md) | [简体中文](../zh-CN/errors.md) | [繁體中文](../zh-TW/errors.md) | [日本語](../ja/errors.md) | **한국어** | [Español](../es/errors.md) | [Français](../fr/errors.md) | [Deutsch](../de/errors.md) | [Português (Brasil)](../pt-BR/errors.md) | [Русский](../ru/errors.md)

개발자 실패는 `RacError`를 던지거나, 개발 모드에서 `console.warn` 합니다. 본문은 항상 영어입니다.

```text
[Component] 무엇이 잘못됐는지.
Fix: 어떻게 고치는지.
Code: RAC-…
Docs: https://github.com/Zeroman/react-auto-components/blob/main/docs/errors.md#rac-…
```

화면 문구는 `config.t`에 남습니다. `userKey`는 영어 원문이고, 호스트가 번역합니다. 콘솔과 예외는 영어입니다.

## RAC-FIELD-OPTIONS

`type`이 `select`, `select-v2`, `radio`, `checkbox`, `cascader`인데 `options`가 없거나 빈 배열입니다.

수정: `options`에 배열이나 `(values) => Option[]`를 넘깁니다. `autocomplete`는 생략할 수 있습니다. 선택적 제안이 있는 텍스트 칸입니다.

## RAC-FIELD-RANGE

`type`이 `daterange` 또는 `datetimerange`인데 모델이나 현재 값이 길이 2인 배열이 아닙니다.

수정: 필드를 `[start, end]`로 둡니다. `dateValue` 기본값은 `"string"`(`YYYY-MM-DD`)입니다. `"timestamp"`는 로컬 시간의 epoch 밀리초입니다. `null`은 그 끝을 열어 둡니다. 스칼라는 TypeScript 오류입니다. 배열 타입 모델은 컴파일되고, 실제 값의 길이가 2가 아니면 개발 모드가 경고합니다.

## RAC-FIELD-BETWEEN

`match: "between"` 값이 `[from, to]`가 아닙니다.

수정: 두 항목 튜플을 저장합니다. 스칼라는 어떤 행과도 맞지 않습니다. `Field<T>`에서도 타입 오류입니다.

## RAC-FIELD-CUSTOM

`type: "custom"`에 `render`도 `component`도 없습니다.

수정: `render(context)`를 넘기거나 `component`를 `config.fields`의 키로 둡니다.

## RAC-FIELD-DUPLICATE

`name`이 두 번입니다. 마운트 중 `defaults`가 던집니다.

수정: 이름을 유일하게 합니다. `title`, `tip`, `append`, `button`은 이름이 없어 검사하지 않습니다.

## RAC-CSS-MISSING

개발 모드에서 `:root`의 `--auto-text`가 비어 있습니다. 스타일시트가 이 변수를 둡니다. 없으면 페이지가 깨지고 DOM만으로는 원인을 알 수 없습니다.

수정: 진입점에서 한 번 `import "@zeroman.yang/react-auto-components/style.css"`.

## RAC-TABLE-XLSX

`export("xlsx")`에 `exportXlsx`가 없습니다.

수정: `import { exportXlsx } from "@zeroman.yang/react-auto-components/xlsx"` 후 `exportXlsx={exportXlsx}`. 화면에는 번역된 "Configure the XLSX export adapter"가 나옵니다.

## RAC-XLSX-DEP

`exceljs`를 읽지 못했습니다. `optionalDependency`라 일반 설치에서 빠질 수 있습니다.

수정: `pnpm add exceljs`. CSV와 JSON에는 필요 없습니다.

## RAC-TABLE-EXPORT-PAGE

원격 내보내기에서 마지막 페이지 전에 빈 페이지가 와 파일을 저장하지 않았습니다.

수정: 안정적인 `total`과 그 `pageIndex`의 행을 반환합니다. 화면은 번역된 "Export data is incomplete. Try again."입니다.

## RAC-TABLE-ROWID

불러온 행의 `rowKey`가 없거나 중복입니다. 개발 경고입니다.

수정: 행마다 안정적이고 유일한 문자열. 선택, 확장, `scrollToRow`가 사용합니다.

## RAC-TABLE-ID

`id`가 비어 설정 키가 `${namespace}:table:`가 됩니다.

수정: 표마다 안정적인 id를 넘깁니다.

## RAC-COLUMN-COMPONENT

열의 `component`가 `AutoConfigProvider`의 `config.columns`에 등록되지 않으면 개발 모드에서 `RAC-COLUMN-COMPONENT`를 경고하고 셀은 기본 형식을 사용합니다. 키를 등록하거나 열에 `render`, `format`, `sort`를 지정하세요. 열에 직접 지정한 함수가 우선합니다.

## RAC-ROW-ACTION

행 동작에 `onClick`이 없고 `action`도 `config.rowActions`의 등록된 키가 아니면, 선택 시 상태 줄에 `RAC-ROW-ACTION`이 표시됩니다. `onClick`을 제공하거나 `action` 키를 등록하세요. 둘 다 있으면 `onClick`이 우선합니다.

## RAC-TABLE-SOURCE

`source`는 `AutoConfigProvider`의 `config.sources` 키입니다. 알 수 없는 키이면 `RAC-TABLE-SOURCE`와 재시도 버튼을 표시합니다. 키를 등록하거나 `data` / `dataSource`를 사용하세요. 세 가지 중 하나만 제공해야 합니다.

## RAC-TABLE-FILTER

설정의 필터 JSON이 쿼리가 아닙니다. 번역된 "Invalid filter"를 보여주고 이전 필터를 유지합니다.

수정: 그룹은 `{ kind: "group", operator: "and" | "or", children }`. 조건은 `{ kind: "condition", field, operator, value }`. `field`는 열 키입니다. `between`은 `[from, to]`, `in`은 배열입니다.

## RAC-QUERY-FIELD

`serializeRsql`이 `/^[\w.]+$/`가 아닌 필드 이름을 거부했습니다.

수정: 영문, 숫자, 밑줄, 점만 사용합니다. 직렬화 전에 열 이름을 바꿉니다.

## RAC-DIALOG-PROVIDER

`AutoDialogProvider` 밖에서 `useAutoDialog()`를 호출했습니다.

수정: 그 트리를 `<AutoDialogProvider>`로 감쌉니다. `AutoConfigProvider`는 대화 상자를 제공하지 않으며 선택입니다. 선언적 `<AutoDialog open>`은 이 훅을 쓰지 않습니다.

## RAC-TABS-ROUTE-VALUE

`AutoTabs`에 `route`와 `value`를 동시에 전달하지 마세요. 둘 다 지정하면 `route`가 우선하며 개발 모드에서 `RAC-TABS-ROUTE-VALUE` 경고가 표시됩니다. `AutoNavigation`이 선택을 관리할 때는 `value`를 생략하세요.
