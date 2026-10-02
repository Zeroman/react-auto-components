# 变更记录

[English](../../CHANGELOG.md) | **简体中文** | [繁體中文](../zh-TW/CHANGELOG.md) | [日本語](../ja/CHANGELOG.md) | [한국어](../ko/CHANGELOG.md) | [Español](../es/CHANGELOG.md) | [Français](../fr/CHANGELOG.md) | [Deutsch](../de/CHANGELOG.md) | [Português (Brasil)](../pt-BR/CHANGELOG.md) | [Русский](../ru/CHANGELOG.md)

## Unreleased

## 0.1.3 - 2026-10-02

- 内置界面文案默认改为英文，这串英文同时是 `config.t` 的键。其他语言请传入 `t`。原先的中文键，例如 `提交` 和 `刷新`，不再是默认值。
- 搜索表单改为 `AutoSearch`（`AutoSearchProps`）。`AutoSearchPanel` 与 `AutoSearchPanelProps` 仍作为已弃用别名保留。
- `Field<T>` 改为按 `type` 的判别联合。`select` 缺少 `options`、标量用在 `daterange` 或 `datetimerange`、标量字段上的 `match: "between"` 都是 TypeScript 错误。`AnyField` 与 `unsafeField()` 仍是逃生舱。
- 开发者错误改为英文 `RacError`，带组件名、修复动作和错误码。见 [errors.md](errors.md)。开发模式会警告未引入样式、空的表格 id、重复的 `rowKey`、没有 options 的选择字段，以及不是两项数组的区间值。
- `AutoConfigProvider` 增加 JSON 注册表：`config.fields`、`config.columns`、`config.rowActions`、`config.sources`。字符串键分别解析 `Field.component`、列的 `render` / `format` / `sort` / `exportFormat`、`RowAction.action` 和 `AutoTable` 的 `source`。字段、列或操作上的函数优先。嵌套 provider 会合并，后写的键覆盖先写的。`data`、`dataSource`、`source` 只能传一个。未知 source 显示 `RAC-TABLE-SOURCE` 和重试。
- 为字段、表格、搜索、表单和弹窗增加稳定的 `data-testid="rac-*"`，不随翻译文案变化。
- 新增 `useAutoTabsWorkspace`，用于动态标签的打开、切换和关闭，支持固定标签和可选的 session 存储。标签可以是 `closable`、`lazy`、`disabled` 或 `loading`。
- 行为说明：[AutoForm](auto-form.md)、[AutoSearch](auto-search.md)、[AutoTable](auto-table.md)、[AutoDialog](auto-dialog.md)、[AutoTabs](auto-tabs.md)、[AutoMenu](auto-menu.md)。包根目录的 `llms.txt` 是代理的入口。
- `v*` 标签会经 GitHub Actions 的 Trusted Publishing 发布到 npm。`./run.sh release` 在干净的 `main` 上把补丁版本加一。

## 0.1.2 - 2026-10-01

- 以 `@zeroman.yang/react-auto-components` 发布。npm 上的 `@zeroman` scope 属于其他账号。

- 新增 AutoChat：消息渲染由调用方掌控，支持流式跟随、历史锚定加载、可选输入框与十语言演示；无新增运行时依赖。
- 在线演示新增「查看代码」弹窗，可查看每个示例的真实源码，支持文件切换、一键复制和 GitHub 跳转。
- React 19 配置驱动的 AutoForm、AutoSearchPanel、AutoTable、AutoDialog、AutoTabs、AutoMenu。
- 支持全局尺寸与密度、表单标签布局、表格配置持久化及可选 XLSX 导出。
- 提供真实 tarball 消费项目、单元测试、类型检查和 Chromium 交互测试。
- 补充 MIT 许可证、贡献指南、GitHub CI、问题模板及 npm 账号与发布说明。

- 文档默认使用英文，提供完整译文和语言切换链接。
