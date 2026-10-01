# 貢獻指南

[English](../../../.github/CONTRIBUTING.md) | [简体中文](../zh-CN/CONTRIBUTING.md) | **繁體中文** | [日本語](../ja/CONTRIBUTING.md) | [한국어](../ko/CONTRIBUTING.md) | [Español](../es/CONTRIBUTING.md) | [Français](../fr/CONTRIBUTING.md) | [Deutsch](../de/CONTRIBUTING.md) | [Português (Brasil)](../pt-BR/CONTRIBUTING.md) | [Русский](../ru/CONTRIBUTING.md)

請透過 Issues 回報可重現的問題或提出功能建議，並透過 Pull Requests 貢獻改進。

## 本機開發

需要 Node.js >=22.12.0 和 pnpm 12.5.1。套件管理工具版本已固定於 package.json 的 packageManager 欄位。

```sh
pnpm install --frozen-lockfile
pnpm prepare:test-project
pnpm --dir test-project dev
```

使用端專案會從真正的 tarball 安裝元件庫。修改元件庫後，請再次執行 `pnpm prepare:test-project`。請維持以套件為基礎的流程，不要引入原始碼別名。請勿提交建置產物、node_modules 或執行記錄。

## 驗證

```sh
pnpm typecheck
pnpm test
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium
pnpm test:e2e
```

CI 會在 Linux 上執行這些檢查。瀏覽器測試會自動使用連接埠 4174；開發示範使用連接埠 4173。

## 目錄

- `src/components`：七個元件及其公開型別。
- `src/core`：設定、Provider、查詢及共用型別。
- `src/adapters`：選用的 XLSX 介接器。
- `src/styles`：需要明確匯入的元件樣式。
- `tests`：單元測試與預期型別錯誤的測試。
- `test-project`：獨立使用端專案與 Chromium 互動測試。
- `scripts`：打包與使用端專案設定指令碼。

## 提交 Pull Request

請描述問題、修改後的行為，以及實際執行的檢查。修復元件錯誤時，請新增可重現該問題的迴歸測試。公開 API 或使用方式變更時，請更新文件。保持變更範圍集中，避免對整個儲存庫進行無關的格式調整。

請遵循現有的嚴格 TypeScript 設定與程式碼風格。React 19 維持為 peer dependency，樣式使用獨立進入點，XLSX 不納入主要進入點。貢獻內容依本儲存庫的 MIT 授權條款提供。

## 文件翻譯

英文文件使用其預設檔名。翻譯版本依語系分組存放於 `docs/i18n/<locale>/` 底下，例如 `docs/i18n/ja/README.md` 與 `docs/i18n/zh-CN/migration.md`。各語言版本應保持相同的章節、範例、技術意義與發布狀態。請保留公開識別碼與命令列引數。更新文件時，應一併更新其翻譯版本，並保持語言切換連結與相關文件連結的一致性。
