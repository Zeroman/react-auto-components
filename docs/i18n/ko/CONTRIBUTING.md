# 기여 안내

[English](../../../.github/CONTRIBUTING.md) | [简体中文](../zh-CN/CONTRIBUTING.md) | [繁體中文](../zh-TW/CONTRIBUTING.md) | [日本語](../ja/CONTRIBUTING.md) | **한국어** | [Español](../es/CONTRIBUTING.md) | [Français](../fr/CONTRIBUTING.md) | [Deutsch](../de/CONTRIBUTING.md) | [Português (Brasil)](../pt-BR/CONTRIBUTING.md) | [Русский](../ru/CONTRIBUTING.md)

재현 가능한 문제를 보고하거나 기능을 제안할 때는 Issues를 사용하고, 개선 사항을 기여할 때는 Pull Requests를 사용하세요.

## 로컬 개발

Node.js >=22.12.0과 pnpm 12.5.1이 필요합니다. 패키지 관리자 버전은 package.json의 packageManager 필드에 고정되어 있습니다.

```sh
pnpm install --frozen-lockfile
pnpm prepare:test-project
pnpm --dir test-project dev
```

사용 프로젝트는 실제 tarball에서 라이브러리를 설치합니다. 라이브러리를 변경한 후에는 `pnpm prepare:test-project`를 다시 실행하세요. 소스 별칭을 도입하지 말고 패키지 기반 작업 흐름을 유지하세요. 빌드 산출물, node_modules, 실행 로그를 커밋하지 마세요.

## 검증

```sh
pnpm typecheck
pnpm test
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium
pnpm test:e2e
```

CI는 Linux에서 이 검사들을 실행합니다. 브라우저 테스트는 자동으로 포트 4174를 사용하며 개발 데모는 포트 4173을 사용합니다.

## 디렉터리

- `src/components`: 7개 컴포넌트와 공개 타입.
- `src/core`: 설정, 프로바이더, 쿼리, 공유 타입.
- `src/adapters`: 선택적 XLSX 어댑터.
- `src/styles`: 명시적으로 가져오는 컴포넌트 스타일.
- `tests`: 단위 테스트와 타입 오류를 기대하는 테스트.
- `test-project`: 독립형 사용 프로젝트와 Chromium 상호작용 테스트.
- `scripts`: 패키징 및 사용 프로젝트 설정 스크립트.

## 풀 리퀘스트

문제, 변경 후 동작, 실제로 실행한 검사를 설명하세요. 컴포넌트 버그를 수정할 때는 문제를 재현하는 회귀 테스트를 추가하세요. 공개 API나 사용법이 변경되면 문서를 업데이트하세요. 변경 범위를 집중시키고 관련 없는 저장소 전체의 서식 변경은 피하세요.

기존의 엄격한 TypeScript 설정과 코드 스타일을 따르세요. React 19는 peer dependency로 유지하고, 스타일에는 별도 진입점을 사용하며, XLSX는 기본 진입점에서 제외합니다. 기여 내용은 이 저장소의 MIT 라이선스에 따라 제공됩니다.

## 문서 번역

영어 문서는 기본 파일명을 사용합니다. 번역문은 `docs/i18n/<locale>/` 아래에 로케일별로 그룹화됩니다. 예를 들어 `docs/i18n/ja/README.md` 및 `docs/i18n/zh-CN/migration.md`가 있습니다. 모든 언어에서 동일한 섹션, 예제, 기술적 의미 및 릴리스 상태를 유지하십시오. 공개 식별자와 명령 인자는 그대로 보존하십시오. 문서를 업데이트할 때는 해당 번역문도 함께 업데이트하고, 언어 전환 링크와 관련 문서로의 링크가 일관되게 유지되도록 하십시오.
