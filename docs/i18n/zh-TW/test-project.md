# 獨立使用端與測試專案

[English](../../../test-project/README.md) | [简体中文](../zh-CN/test-project.md) | **繁體中文** | [日本語](../ja/test-project.md) | [한국어](../ko/test-project.md) | [Español](../es/test-project.md) | [Français](../fr/test-project.md) | [Deutsch](../de/test-project.md) | [Português (Brasil)](../pt-BR/test-project.md) | [Русский](../ru/test-project.md)

此專案從本機 tarball 安裝元件庫，具有獨立的相依套件與建置流程，不使用原始碼別名。

示範會自動偵測瀏覽器語言,並以英文作為後備。可從頁首或全域設定中選擇語言;所選語言會在重新載入後保留。選擇 Auto 即可再次跟隨瀏覽器語言。支援十種語言。頁面會填滿整個視區,表格與較長的面板會在其自身區域內捲動。

從儲存庫根目錄執行 `pnpm install --frozen-lockfile` 和 `pnpm prepare:test-project`，再執行 `pnpm --dir test-project dev`。

- `pnpm --dir test-project build`：檢查公開型別並建立正式環境建置。
- `pnpm exec playwright install chromium`：首次使用時安裝瀏覽器。
- `pnpm --dir test-project test`：執行 Chromium 互動測試（會自動在連接埠 4174 啟動獨立伺服器）。
- 修改元件庫後，請再次執行 `pnpm prepare:test-project`，更新包含內容雜湊的 tarball 相依套件。

`tests/components.spec.ts` 中的瀏覽器測試涵蓋 CRUD、欄位驗證與提交失敗重試、設定持久化、草稿與焦點、彈出視窗、巢狀分頁、10,000 筆資料捲動、伺服器端分頁、展開尺寸量測、欄寬、下載與行動版面。螢幕截圖儲存至 `test-results/`。

剩餘高度示範位於 **AutoTable → 剩餘高度** 分頁。舊版網址 `http://127.0.0.1:4173/?demo=auto-height` 會開啟同一頁面並選取該分頁。範例可切換 Flex/Grid、新增／移除表格上方內容、顯示／隱藏表格，以及變更分頁與資料列數量。`tests/auto-height.spec.ts` 量測瀏覽器中的邊界與捲動區高度，驗證剩餘空間版面、動態尺寸調整、虛擬化復原，以及固定高度相容性。

瀏覽器測試會在連接埠 4174 啟動新的 Vite 伺服器，而不沿用連接埠 4173 的開發示範。重新打包指令碼會通知現有示範伺服器解析新安裝的套件，避免使用過期元件。

全域設定獨立於範例內容，實作於 `src/GlobalSettings.tsx`。可從側邊欄或右上角控制項開啟面板。修改版面、密度、標籤寬度或主題時，目前範例會維持掛載狀態。
