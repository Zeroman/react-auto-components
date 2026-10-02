# AutoTable

[English](../../auto-table.md) | [简体中文](../zh-CN/auto-table.md) | [繁體中文](../zh-TW/auto-table.md) | [日本語](../ja/auto-table.md) | **한국어** | [Español](../es/auto-table.md) | [Français](../fr/auto-table.md) | [Deutsch](../de/auto-table.md) | [Português (Brasil)](../pt-BR/auto-table.md) | [Русский](../ru/auto-table.md)

로컬 또는 원격 표입니다. `data`, `dataSource`, `source` 중 하나만 제공합니다. 동시에 여러 개를 제공하면 타입 오류입니다. 검색은 [AutoSearch](auto-search.md), 추가와 편집은 [AutoDialog](auto-dialog.md)와 [AutoForm](auto-form.md)을 따릅니다.

`exportXlsx`는 `@zeroman.yang/react-auto-components/xlsx`에서 가져옵니다. `exceljs`는 선택 의존성이며 없으면 `RAC-XLSX-DEP`입니다.

## 동작과 속성

| 속성 | 동작 |
| --- | --- |
| `id` | 필수. 설정 키는 `${namespace}:table:${id}`. 비어 있으면 `RAC-TABLE-ID`. |
| `rowKey` | 불러온 행에서 유일해야 합니다. 없거나 중복이면 `RAC-TABLE-ROWID`. 선택, 확장, `scrollToRow`가 사용합니다. |
| `dataSource` | **reject: 메시지와 다시 시도 버튼. abort는 무시합니다.** `{ rows, total }`의 `total`은 걸러진 전체 개수입니다. |
| `pageSize` | 기본 `10`. `pagination` 기본 `true`. `height` 기본 `440`. `"auto"`는 높이가 있는 부모를 채웁니다. |
| `onAdd`, `onEdit`, `onDelete` | **reject 또는 throw: 대화 상자는 열린 채 `error.message`를 보여 줍니다.** 핸들러가 데이터를 바꾸지 않았다면 행은 그대로입니다. |
| `rowActions` | `onClick` 거부는 처리되어 약 2.5초 동안 상태 줄에 표시됩니다. 행은 유지됩니다. 행 동작에 `onClick`이 없고 `action`도 `config.rowActions`의 등록된 키가 아니면, 선택 시 상태 줄에 `RAC-ROW-ACTION`이 표시됩니다. `onClick`을 제공하거나 `action` 키를 등록하세요. 둘 다 있으면 `onClick`이 우선합니다. |
| `component` | 열의 `component`가 `AutoConfigProvider`의 `config.columns`에 등록되지 않으면 개발 모드에서 `RAC-COLUMN-COMPONENT`를 경고하고 셀은 기본 형식을 사용합니다. 키를 등록하거나 열에 `render`, `format`, `sort`를 지정하세요. 열에 직접 지정한 함수가 우선합니다. |
| `source` | `source`는 `AutoConfigProvider`의 `config.sources` 키입니다. 알 수 없는 키이면 `RAC-TABLE-SOURCE`와 재시도 버튼을 표시합니다. 키를 등록하거나 `data` / `dataSource`를 사용하세요. 세 가지 중 하나만 제공해야 합니다. |
| `exportXlsx` | xlsx에만 필요합니다. 없으면 `RAC-TABLE-XLSX`. CSV와 JSON은 내장입니다. |

`handle.export`는 상태 줄에 오류가 나와도 resolve 하고 다시 던지지 않습니다. 원격 `"filtered"`는 모든 페이지를 걷습니다. 마지막 전의 빈 페이지는 `RAC-TABLE-EXPORT-PAGE`이며 부분 파일은 저장하지 않습니다.

잘못된 필터 JSON은 번역된 "Invalid filter"를 보여주고 `RAC-TABLE-FILTER`를 경고하며 이전 필터를 유지합니다.

`handle.reset()`은 정렬, 필터, 선택을 지우고 레이아웃을 열 기본값으로 되돌립니다. `scrollToRow`는 아직 없는 id에서는 아무 일도 하지 않습니다.

## 전제

`style.css`를 한 번. 같은 출처의 여러 앱은 `namespace`를 나눕니다. 기본값은 `"auto"`입니다. 내장 추가/편집 대화 상자에는 `AutoDialogProvider`가 필요 없습니다. `useAutoDialog()`만 필요합니다.
