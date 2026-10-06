# 变更记录

[English](../../CHANGELOG.md) | **简体中文** | [繁體中文](../zh-TW/CHANGELOG.md) | [日本語](../ja/CHANGELOG.md) | [한국어](../ko/CHANGELOG.md) | [Español](../es/CHANGELOG.md) | [Français](../fr/CHANGELOG.md) | [Deutsch](../de/CHANGELOG.md) | [Português (Brasil)](../pt-BR/CHANGELOG.md) | [Русский](../ru/CHANGELOG.md)

## Unreleased

- `AutoTable` 展开行稳定渲染详情面板。行渲染退出 React Compiler 的自动 memo 化——此前它缓存了 TanStack 可变的 `getIsExpanded()` 调用，较慢的机器上可能出现"展开图标已切换、详情面板缺失"。
- `AutoChat` 大历史在追加消息时保持暂停视口锚定。消息虚拟化同样退出该 memo 化——此前高负载下前置插入的锚点可能落偏一行。

## 0.3.0 - 2026-10-06

- `AutoTable` 原地切换数据源。更换 `dataSource` 函数或解析后的 `source` 会直接发起新请求而无需重挂载：请求期间保留当前行并显示 `aria-busy` 与进度条，`pageIndex` 重置为 0，选择被清空。`dataSource` 的函数身份是响应式信号——请用 `useCallback` 包裹；内联函数会在每次渲染时重新请求，开发模式会警告一次。
- `AutoTable` 挂载时保留调用方受控 `query.pageIndex` 的初始值。页码归零仅发生在数据源变化时，与挂载无关。
- `AutoTable` 重做工具栏：刷新、设置、导出与 JSON 渲染为紧凑图标按钮；`toolbarActions.mode` 可选 `"icon"`、`"text"` 或 `"both"`，`toolbarActions.extra` 追加自定义工具。选择操作移入独立的选择栏，由 `batchActions` 与 `renderSelectionBar` 配置。标题行左侧新增 `headerExtra`，右侧新增 `actions`。
- `AutoTable` 的 `title` 接受 `ReactNode`，列头支持拖拽排序（`reorderableColumns`，单列 `reorderable: false`）；顺序保存在布局设置中。
- `AutoTabs` 水平标签行溢出时可滚动：两侧出现滚动按钮，激活标签自动滚入视野，`data-overflow` 反映状态。新增 `actions` 属性，在标签栏右侧挂载与 `extra` 对齐的按钮。
- `AutoTabs` 新增 `tabActions`：右键标签页打开菜单；菜单项支持 `icon`、`danger`、`separator`、`disabled`、`hidden`，与表格行操作一致。

## 0.2.0 - 2026-10-04

- 新增 `createAutoAccess`。由宿主在每个浏览器标签页内持有独立的访问状态，并通过 `config.access` 接入。状态变化自动通知消费者，存储命名空间按用户隔离，身份变化会重挂载 Provider 子树。`hasPerm`、`hasRole`、`hasUser`、`hasOrg` 可与自定义 `canAccess` 策略组合。
- 新增暗色主题。调色板自动跟随 `prefers-color-scheme`，在任意祖先元素（通常是 `<html>`）上设置 `data-auto-theme="light"` 或 `"dark"` 可强制指定。
- 为 `AutoTabs` 新增数据接口。用 `({ signal }) => Promise<AutoTab[]>` 函数或 `config.tabsSources` 键代替本地 `items`。加载中显示状态行，失败显示 `error.message` 和重试按钮，未知键警告 `RAC-TABS-SOURCE`，加载完成的项会成为路由子节点。
- 修复 `equal`：数组与键名恰为数字下标的对象不再被判等。
- 修复级联选择在循环选项树上的死循环；虚拟选择下拉现在响应点击外部关闭。
- 统一 `hidden` 解析：菜单、路由与访问检查一致支持函数形式；纯字符串声明的路由子节点会规范化为 `{ id }`。
- 移除已废弃的顶层搜索属性（`match`、`ignoreCase`、`includeNull`、`searchFields`、`more`）与 `AutoSearchPanel` 别名。请在 `field.search` 上指定，并使用 `AutoSearch`。
- 移除 `AutoNavigationProvider` 上已废弃的 `hashSync` 属性；请传 `history={createHashHistory()}`。移除 `tip`／`append` 展示项上已废弃的 `tip` 属性；请使用 `content`。
- README 新增 i18n 集成文档：通过 `config.t` 桥接 react-i18next、各组件标签覆盖，以及 `Field.lang` 键。

## 0.1.4 - 2026-10-03

- 新增 `AutoNavigation`。已挂载的组件登记到路径树上。`goto` 支持相对路径、权限检查和中止信号。只有提交后的位置会同步到 hash、browser 或 memory history。`AutoMenu` 和 `AutoTabs` 可传入 `route`，并跟随当前子节点。
- 新增 `AutoTip` 和 `DefaultTip`。字段、列、菜单和标签的提示改为浮动层。展示类型 `tip` 和 `append` 仍是行内内容。优先级是条目自身的组件、所属组件、`config.form` / `config.table` / `config.tabs` / `config.menu`，然后是 `config.tipComponent`。
- `AutoSearch` 的 `mode` 默认改为 `"instant"`。隐藏字段和 `canAccess` 未通过的字段仍留在值对象里，但不进入查询。搜索选项写在 `search` 上；原来的顶层 `match` 仍然可用。
- `AutoTable` 的 `toolbarActions` 控制刷新、设置、导出和 JSON 按钮的显示。`handle.refresh()` 和 `handle.export()` 仍然可用。两个及以上排序时才显示排序标签。
- 表单支持 `classNames` 和 `styles` 槽、`divider` 展示项，以及 `virtual-select`。

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
