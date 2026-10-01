# 독립형 사용 및 테스트 프로젝트

[English](../../../test-project/README.md) | [简体中文](../zh-CN/test-project.md) | [繁體中文](../zh-TW/test-project.md) | [日本語](../ja/test-project.md) | **한국어** | [Español](../es/test-project.md) | [Français](../fr/test-project.md) | [Deutsch](../de/test-project.md) | [Português (Brasil)](../pt-BR/test-project.md) | [Русский](../ru/test-project.md)

이 프로젝트는 로컬 tarball에서 컴포넌트 라이브러리를 설치하며, 독립적인 종속성과 빌드를 사용합니다. 소스 별칭은 사용하지 않습니다.

데모는 브라우저 언어를 자동으로 감지하며, 기본값으로 영어를 사용합니다. 헤더 또는 전역 설정(Global settings)에서 언어를 선택할 수 있으며, 선택한 언어는 새로고침 후에도 유지됩니다. Auto를 선택하면 다시 브라우저 언어를 따릅니다. 10개 언어가 지원됩니다. 페이지는 뷰포트를 채우며, 표와 긴 패널은 각자의 영역 내부에서 스크롤됩니다.

모든 예제 페이지에는 **코드 보기** 버튼이 있으며, 대화상자에서 실제 소스 파일을 엽니다. 파일 전환, 원클릭 복사, GitHub 링크를 지원합니다.

저장소 루트에서 `pnpm install --frozen-lockfile`과 `pnpm prepare:test-project`를 실행한 뒤 `pnpm --dir test-project dev`를 실행하세요.

- `pnpm --dir test-project build`: 공개 타입을 검사하고 프로덕션 빌드를 만듭니다.
- `pnpm exec playwright install chromium`: 처음 사용할 때 브라우저를 설치합니다.
- `pnpm --dir test-project test`: Chromium 상호작용 테스트를 실행합니다(포트 4174에서 별도 서버를 자동으로 시작합니다).
- 라이브러리를 변경한 후에는 `pnpm prepare:test-project`를 다시 실행하여 콘텐츠 해시가 포함된 tarball 종속성을 업데이트하세요.

`tests/components.spec.ts`의 브라우저 테스트는 CRUD, 필드 유효성 검사 및 제출 실패 후 재시도, 설정 영속화, 초안 및 포커스, 팝오버, 중첩 탭, 10,000행 스크롤, 서버 측 페이지 나누기, 펼치기 측정, 열 너비, 다운로드, 모바일 레이아웃을 다룹니다. 스크린샷은 `test-results/`에 저장됩니다.

남은 높이 데모는 **AutoTable → 남은 높이** 탭에 있습니다. 기존 URL `http://127.0.0.1:4173/?demo=auto-height`은 같은 페이지를 열고 해당 탭을 선택합니다. 예제에서는 Flex/Grid 전환, 테이블 위 콘텐츠 추가/제거, 테이블 표시/숨기기, 페이지 나누기 및 행 수 변경이 가능합니다. `tests/auto-height.spec.ts`는 브라우저 내 경계와 스크롤 영역 높이를 측정하여 남은 공간 레이아웃, 동적 크기 변경, 가상화 복구, 고정 높이 호환성을 검증합니다.

브라우저 테스트는 포트 4173의 개발 데모를 재사용하지 않고 포트 4174에서 새로운 Vite 서버를 시작합니다. 재패키징 스크립트는 기존 데모 서버에 새로 설치한 패키지를 확인하도록 알려 오래된 컴포넌트 사용을 방지합니다.

전역 설정은 예제 콘텐츠와 분리되어 `src/GlobalSettings.tsx`에 구현되어 있습니다. 사이드바 또는 오른쪽 위 컨트롤에서 패널을 여세요. 레이아웃, 밀도, 레이블 너비, 테마를 변경하는 동안 현재 예제는 마운트된 상태를 유지합니다.
