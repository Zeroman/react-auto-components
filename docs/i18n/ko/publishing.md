# GitHub 및 npm에 게시

[English](../../publishing.md) | [简体中文](../zh-CN/publishing.md) | [繁體中文](../zh-TW/publishing.md) | [日本語](../ja/publishing.md) | **한국어** | [Español](../es/publishing.md) | [Français](../fr/publishing.md) | [Deutsch](../de/publishing.md) | [Português (Brasil)](../pt-BR/publishing.md) | [Русский](../ru/publishing.md)

## 계정 및 패키지 이름

GitHub 저장소는 `Zeroman/react-auto-components`입니다. npm 계정은 `zeroman.yang`입니다. `@zeroman` 스코프는 다른 npm 사용자가 소유하므로 패키지 이름은 `@zeroman.yang/react-auto-components`입니다.

1. [npm 가입 페이지](https://www.npmjs.com/signup)를 열고 사용자 이름, 이메일, 비밀번호를 입력한 뒤 직접 약관을 검토하고 동의합니다.
2. 등록 이메일을 인증합니다. npm은 게시 전에 인증된 이메일을 요구합니다. 게시자의 이메일 주소는 패키지 메타데이터에 표시되므로 공개 유지 관리에 적합한 주소를 선택하세요.
3. 계정 설정에서 2단계 인증을 활성화하고 복구 정보를 저장합니다. 비밀번호, 인증 코드, 복구 코드, 토큰을 저장소나 채팅에 넣지 마세요.
4. `npm login --registry=https://registry.npmjs.org/`를 실행하고 브라우저 안내를 따릅니다. `npm whoami --registry=https://registry.npmjs.org/`로 계정을 확인합니다.
5. `@<npm-username>/react-auto-components` 같은 개인 스코프를 권장합니다. 조직 스코프의 경우 먼저 멤버 자격과 게시 권한을 확인하세요.

이름이 확정되면 루트 package.json의 name, 모든 README 번역의 import, 사용 프로젝트 종속성, 소스/테스트 import를 업데이트합니다. 그런 다음 `pnpm prepare:test-project`를 실행하여 사용 프로젝트의 잠금 파일을 갱신합니다. 패키징 스크립트는 루트 package.json에서 tarball 이름을 결정합니다.

공식 문서: [계정 등록](https://docs.npmjs.com/creating-a-new-npm-user-account/), [공개 스코프 패키지](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/), [2단계 인증](https://docs.npmjs.com/about-two-factor-authentication/).

## 릴리스 전 검증

저장소 루트에서 실행합니다.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium
pnpm test:e2e
npm pack --dry-run
```

`prepack`은 JavaScript, CSS, 선언을 자동 빌드하며, `prepublishOnly`는 타입 검사와 단위 테스트를 실행합니다. npm 패키지에는 dist, README 및 마이그레이션 가이드 번역, LICENSE, package.json만 포함됩니다. 자격 증명, 로컬 로그, 테스트 결과가 제외되어 있는지 확인하세요. 그 밖의 저장소 문서는 GitHub 링크로 연결합니다.

`test-project`는 콘텐츠 해시가 포함된 tarball을 통해 실제 공개 진입점을 검증합니다. 새로 복제한 저장소에서는 해당 디렉터리에서 설치하기 전에 루트에서 `pnpm prepare:test-project`를 실행하세요. 준비 명령은 사용 프로젝트의 로컬 종속성과 잠금 파일을 업데이트합니다.

## 첫 릴리스

계정 설정, 최종 패키지 이름, 라이선스, 위 검사를 모두 완료한 후 실행합니다.

```sh
npm whoami --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```

npm이 요청하는 인증을 완료합니다. 게시 후 최종 이름으로 `npm view <package-name> version`을 실행한 다음, 새로운 사용 프로젝트에 설치하여 검증합니다. 첫 릴리스가 성공하면 모든 README 번역에서 첫 릴리스 준비 안내를 제거하고 설치 안내를 추가하세요.

릴리스할 때마다 버전과 모든 CHANGELOG 번역을 업데이트하세요. 게시된 버전을 덮어쓰려고 하지 마세요. `package.json` 버전과 같은 `v*` 태그를 푸시하세요. 버전이 `0.2.0`이면 `v0.2.0`입니다. 그러면 `.github/workflows/publish.yml`이 실행되어 npm에 게시합니다.

## 자동 릴리스

[npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)은 `@zeroman.yang/react-auto-components`를 GitHub 저장소 `Zeroman/react-auto-components`와 워크플로 파일 `publish.yml`에 연결합니다. 이 워크플로는 장기 npm 토큰 없이 GitHub 호스팅 러너와 OIDC `id-token: write`를 사용합니다. Node >=22.14.0 및 npm CLI >=11.5.1이 필요합니다. 태그, `package.json` 버전, 테스트한 커밋이 일치해야 합니다.

GitHub Actions CI는 잠금 파일로 설치하고, 타입 검사, 단위 테스트, 실제 tarball 사용 프로젝트 빌드, Chromium 테스트를 수행합니다. 브랜치 보호에서 병합 전 CI 통과를 요구할 수 있습니다. 외부 기여에 따라 유지 관리 요구가 달라지면 이를 설정하세요.
