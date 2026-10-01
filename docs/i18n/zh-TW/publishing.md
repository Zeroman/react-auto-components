# 發佈至 GitHub 與 npm

[English](../../publishing.md) | [简体中文](../zh-CN/publishing.md) | **繁體中文** | [日本語](../ja/publishing.md) | [한국어](../ko/publishing.md) | [Español](../es/publishing.md) | [Français](../fr/publishing.md) | [Deutsch](../de/publishing.md) | [Português (Brasil)](../pt-BR/publishing.md) | [Русский](../ru/publishing.md)

## 帳號與套件名稱

GitHub 儲存庫為 `Zeroman/react-auto-components`。npm 帳號需另行註冊。預定的套件名稱為 `@zeroman/react-auto-components`;發布前請先確認 `@zeroman` scope 的所有權。該套件尚未發布至 npm。

1. 開啟 [npm 註冊頁面](https://www.npmjs.com/signup)，輸入使用者名稱、電子郵件和密碼，並親自審閱及同意條款。
2. 驗證註冊電子郵件。npm 要求在發佈前完成電子郵件驗證；發佈者的電子郵件地址會顯示於套件中繼資料，因此請選擇適合公開維護使用的地址。
3. 在帳號設定中啟用雙因素驗證，並保存復原資訊。切勿將密碼、驗證碼、復原碼或權杖放入儲存庫或聊天中。
4. 執行 `npm login --registry=https://registry.npmjs.org/`，並依照瀏覽器提示操作。使用 `npm whoami --registry=https://registry.npmjs.org/` 確認帳號。
5. 建議使用個人作用域，例如 `@<npm-username>/react-auto-components`。若使用組織作用域，請先確認成員資格與發佈權限。

名稱確定後，請更新根目錄 package.json 的 name、所有 README 譯文中的匯入、使用端相依套件，以及原始碼／測試中的匯入。接著執行 `pnpm prepare:test-project`，更新使用端鎖定檔。打包指令碼會依根目錄 package.json 推導 tarball 名稱。

官方文件：[帳號註冊](https://docs.npmjs.com/creating-a-new-npm-user-account/)、[公開作用域套件](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)，以及[雙因素驗證](https://docs.npmjs.com/about-two-factor-authentication/)。

## 發佈前驗證

從儲存庫根目錄執行：

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

`prepack` 會自動建置 JavaScript、CSS 和型別宣告；`prepublishOnly` 會執行型別檢查與單元測試。npm 套件僅包含 dist、README 與遷移指南的各語言文件、LICENSE 和 package.json。請確認已排除憑證、本機記錄與測試輸出。其他儲存庫文件會以 GitHub 連結提供。

`test-project` 透過包含內容雜湊的 tarball 驗證真正的公開進入點。剛複製儲存庫時，請先在根目錄執行 `pnpm prepare:test-project`，再於該目錄安裝。準備命令會更新使用端的本機相依套件與鎖定檔。

## 首次發佈

完成帳號設定、最終套件名稱、授權條款與上述檢查後：

```sh
npm whoami --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```

完成 npm 要求的任何驗證。發佈後，請使用最終名稱執行 `npm view <package-name> version`，再於全新的使用端專案中安裝並驗證。首次發佈成功後，請移除所有 README 譯文中的首次發佈準備提示，並加入安裝說明。

每次發佈前，請更新版本與所有 CHANGELOG 譯文。請勿嘗試覆寫已發佈版本。儲存庫目前的 CI 只驗證變更，不會自動發佈至 npm。

## 未來的自動化發佈

首次發佈後，設定 [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)，將套件綁定至 GitHub 儲存庫和特定工作流程檔案。使用 GitHub 託管執行器與 OIDC `id-token: write`，不使用長效 npm 權杖。文件列出的需求為 Node >=22.14.0 和 npm CLI >=11.5.1。啟用前，請實作並驗證發佈工作流程，確保標籤、package.json 版本和已測試的提交一致。

GitHub Actions CI 會依鎖定檔安裝、檢查型別、執行單元測試、建置使用真正 tarball 的使用端專案，並執行 Chromium 測試。分支保護可要求合併前通過 CI；請隨外部貢獻帶來的維護需求調整設定。
