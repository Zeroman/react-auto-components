# React Auto Components

[English](../../../README.md) | **简体中文** | [繁體中文](../zh-TW/README.md) | [日本語](../ja/README.md) | [한국어](../ko/README.md) | [Español](../es/README.md) | [Français](../fr/README.md) | [Deutsch](../de/README.md) | [Português (Brasil)](../pt-BR/README.md) | [Русский](../ru/README.md)

一个独立的、以 schema 驱动的 React 19 组件库，覆盖表单、表格与对话。基于 TypeScript、TanStack Table 9 / Form / Virtual、Radix 和 Floating UI 构建，不依赖 Ant Design、Element Plus 或 MUI。库构建使用 React Compiler。

[![Auto Studio 演示截图](../../assets/demo.png)](https://zeroman.github.io/react-auto-components/)

<p align="center">
  <a href="https://zeroman.github.io/react-auto-components/"><strong>🚀 在线演示 (GitHub Pages)</strong></a> · <a href="#演示与独立测试项目">本地运行</a> · <a href="#组件">组件列表</a>
</p>

## 项目状态

当前版本为 0.3.1，API 仍可能发生变化。需要 React 19。该包提供 ESM 和 TypeScript 类型声明。内置界面文本默认为英文，可通过 AutoConfigProvider.config.t 进行翻译。

使用 `pnpm add @zeroman.yang/react-auto-components` 安装（npm、yarn 同样可用）。peer dependency 为 React 19 与 react-dom 19。在入口引入一次样式：`import "@zeroman.yang/react-auto-components/style.css"`。

在应用入口引入一次 `import "@zeroman.yang/react-auto-components/style.css"`。缺少样式时，开发模式警告 `RAC-CSS-MISSING`。

XLSX 导出缺少 `exportXlsx` 适配器时为 `RAC-TABLE-XLSX`；无法加载可选依赖 `exceljs` 时为 `RAC-XLSX-DEP`。从 `@zeroman.yang/react-auto-components/xlsx` 导入并传入适配器，按需运行 `pnpm add exceljs`。CSV 和 JSON 不需要它。

- [在线演示 (GitHub Pages)](https://zeroman.github.io/react-auto-components/)
- [贡献指南](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/zh-CN/CONTRIBUTING.md)
- [变更记录](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/zh-CN/CHANGELOG.md)
- [注册账号与发布指南](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/zh-CN/publishing.md)
- [MIT 许可证](../../../LICENSE)

## 演示与独立测试项目

可以在浏览器中直接访问 **[GitHub Pages 在线演示](https://zeroman.github.io/react-auto-components/)**。

本地运行与开发（需要 Node.js >= 22.12 与 pnpm 12.5）：

```sh
pnpm install --frozen-lockfile
pnpm prepare:test-project
pnpm --dir test-project dev
```

打开 http://127.0.0.1:4173 。测试项目提供七个组件页面、本地/服务端/十万行/树形/可展开行表格、CRUD、提交失败重试、草稿、嵌套标签及动态行高场景。

演示会自动检测浏览器语言，并以英语作为回退。可以从页眉或全局设置中选择语言；所选语言在重新加载后仍会保留。选择“自动”可重新跟随浏览器语言。支持十种语言。页面填满整个视口，表格和较长的面板在其自身区域内滚动。

每个示例页面都提供**查看代码**按钮，会在弹窗中打开该示例的真实源码文件，支持文件切换、一键复制和跳转 GitHub。

`test-project` 有独立 package.json 和 lockfile，安装 `pnpm pack` 的真实产物，没有源代码别名。修改组件库后重新运行 `pnpm prepare:test-project`；脚本使用内容哈希文件名更新依赖，避免同名 tarball 缓存。

### 自动化更新与可复用命令

修改组件或示例后，可一键完成自动化编译与截图刷新：

```sh
pnpm demo:update       # 一键更新：编译库、更新测试工程、打包 demo 静态文件并自动截取最新界面
pnpm demo:build        # 仅编译 demo 静态产物至 demo-dist（适配 GitHub Pages）
pnpm demo:screenshot   # 仅通过无头 Chromium 重新截取 docs/assets/demo.png
```

代码推送到 `main` 分支时，GitHub Actions 会自动触发构建并部署静态文件到 GitHub Pages。

## 接入

```tsx
import { useState } from 'react';
import {
  AutoConfigProvider, AutoDialogProvider, AutoTable,
  type AutoColumn, type Field,
} from '@zeroman.yang/react-auto-components';
import '@zeroman.yang/react-auto-components/style.css';

type Person = { id: number; name: string; enabled: boolean };
const columns: AutoColumn<Person>[] = [
  { key: 'name', label: '姓名', sortable: true },
  { key: 'enabled', label: '已启用', options: [
    { label: '是', value: true }, { label: '否', value: false },
  ] },
];
const fields: Field<Person>[] = [
  { name: 'name', label: '姓名', required: true },
  { name: 'enabled', label: '已启用', type: 'switch', defaultValue: true },
];
export function App() {
  const [rows, setRows] = useState<Person[]>([]);
  return <AutoConfigProvider config={{ namespace: 'my-app' }}>
    <AutoDialogProvider>
      <AutoTable<Person> id="people" rowKey="id" data={rows}
        columns={columns} formFields={fields} searchFields={fields}
        onAdd={value => setRows(old => [...old, { ...value, id: Date.now() }])}
        onEdit={(row, value) => setRows(old => old.map(item => item.id === row.id ? { ...row, ...value } : item))}
        onDelete={selected => setRows(old => old.filter(item => !selected.some(row => row.id === item.id)))}
      />
    </AutoDialogProvider>
  </AutoConfigProvider>;
}
```

字段、列与 ref 使用泛型；类型错误的字段名或默认值会在编译期报错。Provider 提供命名空间、权限、字段翻译、自定义字段、通知和持久化适配。 内置标签、校验消息和无障碍文本使用 AutoConfigProvider.config.t；显式指定的组件标签优先。

### 国际化 (i18n)

内置界面文本默认为英文。所有内置文案均通过 `AutoConfigProvider.config.t(key, fallback)` 派发。组件级显式传入的标签属性（如 `confirmLabel`、`submitLabel`、`labels`）优先级高于 `config.t`。

`t` 回调接收一个消息键和一个回退文本。在翻译内置消息时，请保留诸如 `{0}` 和 `{1}` 的编号占位符；组件会在翻译后替换这些占位符的值。

#### 配合 react-i18next 使用

向 `config.t` 传入桥接函数即可无缝接入：

```tsx
import { useTranslation } from "react-i18next";
import { AutoConfigProvider } from "@zeroman.yang/react-auto-components";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <AutoConfigProvider
      config={{
        t: (key, fallback) => t(key, { defaultValue: fallback ?? key }),
      }}
    >
      {children}
    </AutoConfigProvider>
  );
}
```

#### 组件级文案覆盖

- **`AutoDialog`**：`confirmLabel="保存"`, `cancelLabel="取消"`
- **`AutoForm`**：`submitLabel="提交"`, `resetLabel="重置"`
- **`AutoSearch`**：`searchLabel="查询"`, `resetLabel="重置"`
- **`AutoChat`**：`labels={{ send: "发送", stop: "停止", conversation: "会话" }}`
- **`Field<T>`**：`lang="user.name"` 通过 `config.t("user.name", field.label)` 翻译字段标签

## 组件

| 组件 | 主要能力 |
| --- | --- |
| AutoForm | 多种原生字段、虚拟选项、级联、上传适配、自定义渲染、联动、动态显隐、异步规则、受控状态、失败保留输入 |
| AutoSearch | 基本/更多条件、手动/即时查询、重置、排序标签、统一查询 AST、RSQL 序列化与 `search.*` 配置 |
| AutoTable | 本地/远程数据、多列排序、列筛选、分页、稳定选择、虚拟化、树形/详情展开、汇总、合并单元格、CRUD、右键菜单、复制 |
| AutoDialog | 声明式/命令式、隔离的 Provider、草稿、关闭拦截、焦点管理、拖动、全屏、异步提交 |
| AutoTabs | 横向/纵向、嵌套、权限、禁用、保留面板状态、刷新，以及异步 `source`（`config.tabsSources`）的加载/错误/重试状态 |
| AutoMenu | 侧边导航，支持图标、描述、徽标、嵌套分组、权限与可折叠图标栏 |
| AutoChat | 调用方自定义消息渲染、可选虚拟化、流式跟随、锚定历史加载、发送/停止输入框与自定义操作 |

## 前置条件

样式只需引入一次：`import "@zeroman.yang/react-auto-components/style.css"`。未引入时 `--auto-text` 未定义，页面无样式，开发模式会发出 `RAC-CSS-MISSING` 警告。配色自动跟随系统的 `prefers-color-scheme`；在任意祖先元素（通常为 `<html>`）上设置 `data-auto-theme="light"` 或 `"dark"` 可强制指定明暗主题。

`AutoConfigProvider` 为可选。默认配置为：命名空间 `"auto"`、尺寸 `"medium"`、密度 `"comfortable"`、顶部标签与 `localStorage`。命名空间会加在 `${namespace}:table:${id}` 和 `${namespace}:draft:${draftKey}` 前。同源下的两个应用若均使用 `"auto"` 将共享这些持久化键。

`AutoDialogProvider` 是使用 `useAutoDialog()` 所必需的，并不由 `AutoConfigProvider` 隐式提供。声明式 `<AutoDialog open>` 则不需要。

`exceljs` 是仅在 `@zeroman.yang/react-auto-components/xlsx` 中使用的可选依赖项。CSV 与 JSON 导出无需此依赖。缺少适配器或未安装 `exceljs` 时会报错 `RAC-TABLE-XLSX` 或 `RAC-XLSX-DEP`。

表格布局、排序、筛选、导出各自支持命名方案及版本。默认 localStorage 持久化，也可注入远程适配器。JSON/CSV 内置；XLSX 使用可选的独立适配器：

```tsx
import { exportXlsx } from '@zeroman.yang/react-auto-components/xlsx';
// <AutoTable ... exportXlsx={exportXlsx} />
```

ExcelJS 在首次使用适配器时动态加载，不进入库的主入口。纯 CSV/JSON 用户可安装时省略 optional dependencies。

## 外部权限状态

在每个浏览器标签页内部通过 `createAutoAccess()` 创建独立状态，并传入 `config.access`。不同标签页可以同时登录不同用户，不设置整个浏览器共用的“当前用户”。登录、接口请求和实时更新由外部业务负责；组件库只保存快照并通知使用者。

```tsx
import { createAutoAccess, AutoConfigProvider } from "@zeroman.yang/react-auto-components";

export const access = createAutoAccess();
// 每个应用创建一次；SSR 时每个请求独立创建。
<AutoConfigProvider config={{ namespace: "my-app", access }}>
  <App />
</AutoConfigProvider>;

// 外部业务在取得或更新身份数据后调用。
access.replaceState({ userId: "alice", roles: ["editor"], permissions: ["project:read"], orgIds: ["north"] });
access.setState({ permissions: ["project:read", "project:edit"] });
access.reset(); // 退出登录：清空身份及全部授权。
```

状态提供 `hasPerm(code)`、`hasRole(role)`、`hasUser(userId)` 和 `hasOrg(orgId)`。`getState()` 返回引用稳定的只读快照；非 React 代码可用 `subscribe(listener)` 订阅。React 组件通过 `useAutoConfig().access` 读取，Provider 会自动通知更新。

`setState` 合并补丁，传入的数组整体替换；修改 `userId` 时同时清除未提供的旧授权。`replaceState` 总会清空省略字段，切换用户推荐使用它。角色不会隐式授予权限。内置 `canAccess` 要求声明的角色与权限**全部满足**，没有访问要求的字段仍为公开。自定义 `config.canAccess` 优先，可组合四个判断函数。现有组件配置仍使用 `roles`／`permissions`；用户、组织条件由业务通过判断函数组合。

`userId` 变化时，Provider 重新挂载子树，清除其中表单、弹窗及组件的内存状态。内置设置和草稿使用 `${namespace}:user:${JSON.stringify(userId)}` 作为持久化命名空间；切回原用户只恢复该用户保存的数据。同一用户的授权变化保留当前编辑。用户相关组件应放在 Provider 下；外部持有的状态、导航实例和请求仍由业务清理或取消。身份请求使用 AbortSignal／请求序号，防止旧用户的迟到响应覆盖新用户。每个 Chrome 标签页有自己的状态；A 页替换身份或退出不会替换 B 页的用户，也不会让 B 退出。不要通过 localStorage 广播一份“当前用户”覆盖所有标签页。外部请求必须绑定本标签页的真实登录会话；仅靠同一域共享的一份登录 Cookie 无法表示两个独立用户，前端权限状态也不会改变服务端鉴权身份。

未配置 `config.access` 时，原有 `canAccess` 行为与存储键保持不变。Demo 的 **Permissions／权限** 页包含首次 mock 加载、角色与权限独立变化、用户切换、迟到响应取消和失败重试。mock 接口位于 `test-project/src/examples/mock/access.ts`，不进入组件库。Demo 只在 sessionStorage 保存本页选中的 mock 用户，因此刷新会保留该页身份（包括退出状态）；“新标签页登录”链接传入一次性的演示用户选择，不是鉴权凭据。双页面测试使用同一浏览器上下文，在共享 Cookie／localStorage 的情况下验证用户、权限更新和退出彼此独立。

## 验证

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium  # 仅首次运行
pnpm test:e2e
```

单元测试覆盖字段、异步校验、查询、弹窗、虚拟化、表格、配置迁移与导出。Playwright 从已打包的公开入口测试交互，桌面/手机截图写入 `test-project/test-results`。

## 行为约定

- 这是 React 原生 API，不是旧 Vue 属性/方法的逐项兼容层。见 [迁移指南](migration.md)。
- 数据由业务持有。CRUD 回调负责保存，失败抛错可保留编辑；成功后组件刷新远程数据。本地数据需由调用方更新。
- 表格 `id` 在命名空间内唯一，`rowKey` 在所有分页和树节点内唯一。服务端模式显式传 `columns`，总数由数据源返回。
- `query` / `value` 受控时由父组件接收回调并更新；普通使用可省略。
- 启用合并单元格后使用非虚拟语义表格，适合分页数据；避免跨虚拟窗口的 rowSpan 错位。
- 服务端全量筛选汇总由 `summaryValues` 提供；未提供的汇总显示 `—`，不会把当前页合计冒充全量合计。`summaryScope="page"` 可显式计算当前页。
- 上传进行中暂停提交；重置、替换字段值和卸载会取消旧上传，晚到结果不会覆盖新值。
- 远程“全部筛选结果”导出会逐页请求数据源；大规模业务可自行实现后台导出。
- 浏览器样式通过 `style.css` 显式导入；JS 模块可在无 window 的 Node 环境导入。

## AutoTable 占满剩余高度

`height={440}` 继续表示数据滚动区的固定高度。使用 `height="auto"` 时，整个表格填满父布局分配的高度，搜索区、工具栏与分页按实际内容布局，数据区使用剩余空间并独立滚动：

```tsx
<div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', gap: 12 }}>
  <header>页面标题和描述</header>
  <AutoTable<Person> id="people" rowKey="id" data={rows}
    columns={columns} height="auto" />
  <footer>页面页脚</footer>
</div>
```

父容器必须有可确定的高度。嵌套 Flex 容器使用 `flex: 1; min-height: 0` 传递剩余空间；Grid 可使用 `grid-template-rows: auto minmax(0, 1fr) auto`。不需要 JS 计算视口减去工具栏高度；搜索条件增减、工具栏换行及父容器尺寸变化由布局自动处理，虚拟列表跟随实际滚动区尺寸。

这与“随数据条数撑高表格”不同：空数据和少量数据仍填满剩余空间。父容器至少应能容纳搜索区、工具栏及分页本身。

测试项目在 **AutoTable → 剩余高度** Tab 内演示，保留侧栏和页面顶部；旧地址 `http://127.0.0.1:4173/?demo=auto-height` 会直接选中该 Tab。对应浏览器测试：`test-project/tests/auto-height.spec.ts`。

## 全局表单布局

通过 `AutoConfigProvider.config.form` 统一控制普通表单、搜索区、表格搜索区和弹窗表单。支持上方标签与左侧标签两种布局，标签文字可独立设置左对齐或右对齐；未配置时，库默认使用上方标签和舒适间距。

```tsx
<AutoConfigProvider config={{
  form: {
    labelPosition: 'left', // 'top'：位于上方；'left'：位于控件左侧
    labelAlign: 'right',   // 文本右对齐；标签保持在控件左侧
    labelWidth: 80,
    density: 'compact',   // 'comfortable'：间距更大
  },
}}>
  <App />
</AutoConfigProvider>
```

嵌套 Provider 按属性合并布局，组件显式参数优先于所在 Provider。例如，在全局同行布局中保留某个表单的上下排列：

```tsx
<AutoForm fields={fields} labelPosition="top" density="comfortable" />
<AutoTable id="people" rowKey="id" data={rows} columns={columns}
  searchFields={searchFields}
  searchLayout={{ labelWidth: 100, columns: 3 }} />
```

`labelWidth` 默认为 `"auto"`，也接受像素数或 CSS 宽度（例如 `"6em"`）。自动模式下，搜索项的标签分别贴合文字；普通表单和弹窗表单按可见标签统一宽度，保持控件对齐。长标签最多占字段宽度的 45%，超出时换行，为输入控件保留空间；显式固定宽度不受此自动限制。紧凑搜索区在宽度足够时将操作按钮放在同一行，窄屏自动换行。标签关联保留，错误提示和说明跟随控件对齐，长标签可以折行。

演示项目通过侧栏 **全局设置** 或右上角齿轮打开独立设置面板，统一修改布局、密度、标签宽度和主题；设置即时生效，不清空当前示例的输入；表单页还可选择 **跟随全局** 或局部覆盖。演示项目通过 Provider 显式启用同行紧凑布局。

## 全局尺寸与密度

`AutoConfigProvider` 支持 `size: "small" | "medium" | "large"` 和 `density: "compact" | "comfortable"`。组件显式参数优先于对应类别配置，类别配置优先于全局值：

```tsx
<AutoConfigProvider config={{
  size: "medium",
  density: "compact",
  form: { labelPosition: "left", labelAlign: "right" },
  table: { density: "compact" },
  tabs: { density: "compact" },
}}>
  <AutoForm fields={fields} size="small" />
</AutoConfigProvider>
```

表格密度另外支持 `normal`（标准）。表格设置面板的默认项为“跟随全局”；选择紧凑、标准或宽松会覆盖全局密度并随布局方案保存，组件 `density` 参数优先级最高。嵌套组件的局部尺寸独立生效。

表单支持 `resetLabel`、`extraActions` 和 `onReset`；搜索面板支持 `searchLabel`、`resetLabel` 和 `extraActions`；弹窗支持 `cancelLabel` 与 `extraActions`。`AutoTabs` 的条目可配置 `badge`；`AutoTable.empty` 可自定义无数据内容。

### AutoChat

AutoChat 提供轻量的对话布局，支持流式跟随、历史消息加载和消息输入框。传入 React 内容或 renderMessage 即可渲染消息，无需额外的运行时依赖。

[AutoChat API](auto-chat.md)

### 组件导航树（AutoNavigation）

`AutoNavigation` 提供基于组件树的声明式导航系统。将结构化路径、参数、权限校验及 URL 历史同步彻底解耦，支持深度相对路径跳转（`./child`、`../sibling`）、严苛模式安全生命周期控制以及与 React Router、TanStack Router、Next.js 和静态 Hash 路由的高性能适配。

[AutoNavigation API 与路由接入指南](auto-navigation.md)

回调抛错之后组件会怎样，见行为契约：[AutoForm](auto-form.md)、[AutoSearch](auto-search.md)、[AutoTable](auto-table.md)、[AutoDialog](auto-dialog.md)、[AutoTabs](auto-tabs.md)、[AutoMenu](auto-menu.md)、[AutoNavigation](auto-navigation.md)。开发者错误码：[errors.md](errors.md)。
