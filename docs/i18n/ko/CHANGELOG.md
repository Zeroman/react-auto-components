# 변경 기록

[English](../../CHANGELOG.md) | [简体中文](../zh-CN/CHANGELOG.md) | [繁體中文](../zh-TW/CHANGELOG.md) | [日本語](../ja/CHANGELOG.md) | **한국어** | [Español](../es/CHANGELOG.md) | [Français](../fr/CHANGELOG.md) | [Deutsch](../de/CHANGELOG.md) | [Português (Brasil)](../pt-BR/CHANGELOG.md) | [Русский](../ru/CHANGELOG.md)

## 미출시

## 0.1.3 - 2026-10-02

- 기본 UI 문구는 영어이며, 그 문자열이 `config.t` 키입니다. 다른 언어는 `t`를 넘깁니다. 이전 중국어 키(`提交`, `刷新` 등)는 더 이상 기본값이 아닙니다.
- 검색 폼은 `AutoSearch`(`AutoSearchProps`)입니다. `AutoSearchPanel`과 `AutoSearchPanelProps`는 더 이상 쓰지 않는 별칭으로 남습니다.
- `Field<T>`는 `type`으로 구분되는 합집합입니다. `options`가 없는 `select`, 스칼라 `daterange` 또는 `datetimerange`, 스칼라 필드의 `match: "between"`은 TypeScript 오류입니다. `AnyField`와 `unsafeField()`는 탈출구로 남습니다.
- 개발자 오류는 영어 `RacError`입니다. 컴포넌트, 수정 방법, 코드가 들어 있습니다. [errors.md](errors.md)를 보세요. 개발 모드는 스타일 미로드, 빈 테이블 id, 중복 `rowKey`, options가 없는 선택 필드, 길이가 2가 아닌 범위 값을 경고합니다.
- `AutoConfigProvider`에 JSON 레지스트리를 추가합니다. `config.fields`, `config.columns`, `config.rowActions`, `config.sources`. 문자열 키는 `Field.component`, 열의 `render` / `format` / `sort` / `exportFormat`, `RowAction.action`, `AutoTable` `source`를 찾습니다. 필드, 열, 액션의 함수가 우선합니다. 중첩 provider는 병합되고 나중 키가 이깁니다. `data`, `dataSource`, `source` 중 하나만 넘깁니다. 알 수 없는 source는 `RAC-TABLE-SOURCE`와 재시도를 보여 줍니다.
- 필드, 테이블, 검색, 폼, 대화상자에 안정적인 `data-testid="rac-*"`를 추가합니다. 번역된 라벨을 따르지 않습니다.
- 동적 탭을 열고, 전환하고, 닫는 `useAutoTabsWorkspace`를 추가합니다. 고정 탭과 선택적 session 저장을 지원합니다. 탭은 `closable`, `lazy`, `disabled`, `loading`일 수 있습니다.
- 동작: [AutoForm](auto-form.md), [AutoSearch](auto-search.md), [AutoTable](auto-table.md), [AutoDialog](auto-dialog.md), [AutoTabs](auto-tabs.md), [AutoMenu](auto-menu.md). 패키지 루트의 `llms.txt`가 에이전트 입구입니다.
- `v*` 태그는 GitHub Actions Trusted Publishing으로 npm에 게시됩니다. `./run.sh release`는 깨끗한 `main`에서 패치 버전을 올립니다.

## 0.1.2 - 2026-10-01

- `@zeroman.yang/react-auto-components`로 게시합니다. npm의 `@zeroman` 스코프는 다른 계정이 소유합니다.

- AutoChat 추가: 메시지 렌더링은 호출부가 관리하며 스트리밍 따르기, 이력 앵커 로딩, 선택적 입력창, 10개 언어 데모를 지원합니다. 새 런타임 의존성은 없습니다.
- 온라인 데모에 "코드 보기" 대화상자를 추가했습니다. 각 예제의 실제 소스를 파일 전환·원클릭 복사·GitHub 링크로 확인할 수 있습니다.
- 스키마 기반 React 19 컴포넌트: AutoForm, AutoSearchPanel, AutoTable, AutoDialog, AutoTabs, AutoMenu.
- 전역 크기 및 밀도, 폼 레이블 레이아웃, 테이블 설정 영속화, 선택적 XLSX 내보내기.
- 실제 tarball을 사용하는 프로젝트, 단위 테스트, 타입 검사, Chromium 상호작용 테스트.
- MIT 라이선스, 기여 가이드, GitHub CI, 이슈 템플릿, npm 계정 설정 및 게시 안내.
- 기본 영어 문서, 완전한 번역 및 언어 전환 링크.
