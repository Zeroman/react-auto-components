# 独立组件消费与测试项目

[English](../../../test-project/README.md) | **简体中文** | [繁體中文](../zh-TW/test-project.md) | [日本語](../ja/test-project.md) | [한국어](../ko/test-project.md) | [Español](../es/test-project.md) | [Français](../fr/test-project.md) | [Deutsch](../de/test-project.md) | [Português (Brasil)](../pt-BR/test-project.md) | [Русский](../ru/test-project.md)

这里通过本地 tarball 安装组件库，拥有独立依赖与构建，不通过源码 alias 引用组件。

演示会自动检测浏览器语言，并以英语作为回退。可以从页眉或全局设置中选择语言；所选语言在重新加载后仍会保留。选择“自动”可重新跟随浏览器语言。支持十种语言。页面填满整个视口，表格和较长的面板在其自身区域内滚动。

每个示例页面都提供**查看代码**按钮，会在弹窗中打开该示例的真实源码文件，支持文件切换、一键复制和跳转 GitHub。

从仓库根目录执行 `pnpm install --frozen-lockfile && pnpm prepare:test-project`，再运行 `pnpm --dir test-project dev`。

- `pnpm --dir test-project build`：公共类型与生产构建验证。
- `pnpm exec playwright install chromium`：首次安装浏览器。
- `pnpm --dir test-project test`：运行 Chromium 交互验收（自动启动独立的 4174 端口）。
- 修改库后重新运行 `pnpm prepare:test-project`，更新哈希 tarball 依赖。

浏览器用例位于 `tests/components.spec.ts`，包括 CRUD、字段校验与失败重试、设置持久化、草稿与焦点、嵌套 Tabs、十万行滚动、服务端分页、展开测量、列宽、下载及移动端。截图输出在 `test-results/`。

剩余高度演示位于 **AutoTable → 剩余高度** Tab；旧地址 `http://127.0.0.1:4173/?demo=auto-height` 也会打开同一页面并选中该 Tab。示例可以切换 Flex/Grid、增减上方内容、显示/隐藏表格、切换分页和数据量。`tests/auto-height.spec.ts` 实际测量浏览器边界与滚动区高度，验证占满剩余空间、动态尺寸、虚拟化恢复和固定高度兼容性。

浏览器验收使用 4174 端口启动全新的 Vite 服务，不复用正在使用的 4173 演示服务。根目录演示（`pnpm dev`，端口 5173）直接以库源码运行，库改动即时热更，重新打包不会影响它。打包产物变化时，重新打包脚本会清掉过期的 Vite 依赖优化缓存；在 4173 验证新产物前请手动重启 `pnpm --dir test-project dev`。

全局设置独立于示例内容，由 `src/GlobalSettings.tsx` 实现；侧栏与右上角均可打开设置面板。修改布局、密度、标签宽度或主题时，当前示例保持挂载。

## 聊天渲染与大历史记录

AutoChat 提供格式选择器，覆盖 Markdown/GFM、代码、JSON、表格、本地图片与可交互 React 卡片。Markdown 相关依赖只安装在这个演示项目中。**大历史**模式以 1,000/10,000/50,000 条可变高度消息验证实际挂载行数，并支持追加/流式控制与历史导航。

浏览器验收位于 `tests/chat.spec.ts`、`tests/chat-renderers.spec.ts` 与 `tests/chat-lab.spec.ts`。
