# React Auto Components

[English](../../../README.md) | **简体中文** | [繁體中文](../zh-TW/README.md) | [日本語](../ja/README.md) | [한국어](../ko/README.md) | [Español](../es/README.md) | [Français](../fr/README.md) | [Deutsch](../de/README.md) | [Português (Brasil)](../pt-BR/README.md) | [Русский](../ru/README.md)

一个独立的、以 schema 驱动的 React 19 组件库。基于 TypeScript、TanStack Table 9 / Form / Virtual、Radix 和 Floating UI 构建，不依赖 Ant Design、Element Plus 或 MUI。库构建使用 React Compiler。

[![Auto Studio 演示截图](../../assets/demo.png)](https://zeroman.github.io/react-auto-components/)

<p align="center">
  <a href="https://zeroman.github.io/react-auto-components/"><strong>🚀 在线演示 (GitHub Pages)</strong></a> · <a href="#演示与独立测试项目">本地运行</a> · <a href="#组件">组件列表</a>
</p>

## 项目状态

当前版本为 0.1.0，API 仍可能发生变化。需要 React 19。该包提供 ESM 和 TypeScript 类型声明。内置界面文本默认为中文，可通过 AutoConfigProvider.config.t 进行翻译。

npm 首次发布准备中，`@zeroman/react-auto-components` 是当前开发包名，最终 scope 将在 npm 账号注册后确定。首次发布前请使用下面的源码与本地打包流程，不要假设该包已在 npm 上架。

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

打开 http://127.0.0.1:4173 。测试项目提供八个组件页面、本地/服务端/万行/树形表格、CRUD、提交失败重试、草稿、浮层、嵌套标签及动态行高场景。

演示会自动检测浏览器语言，并以英语作为回退。可以从页眉或全局设置中选择语言；所选语言在重新加载后仍会保留。选择“自动”可重新跟随浏览器语言。支持十种语言。页面填满整个视口，表格和较长的面板在其自身区域内滚动。

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
} from '@zeroman/react-auto-components';
import '@zeroman/react-auto-components/style.css';

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

t 回调接收一个消息键和一个回退文本。在翻译内置消息时，请保留诸如 {0} 和 {1} 的编号占位符；组件会在翻译后替换这些占位符的值。

## 组件

| 组件 | 主要能力 |
| --- | --- |
| AutoForm | 多种原生字段、虚拟选项、级联、上传适配、自定义渲染、联动、动态显隐、异步规则、受控状态、失败保留输入 |
| AutoSearchPanel | 基本/更多条件、手动/即时查询、重置、排序标签、统一查询 AST 与 RSQL 序列化 |
| AutoTable | 本地/远程数据、多列排序、列筛选、分页、稳定选择、虚拟化、树形/详情展开、汇总、合并单元格、CRUD、右键菜单、复制 |
| AutoDialog | 声明式/命令式、隔离的 Provider、草稿、关闭拦截、焦点管理、拖动、全屏、异步提交 |
| AutoPopover | 点击/悬浮、自动定位、碰撞避让、Escape/外部关闭、命令式浮层 |
| AutoScroll | 固定/动态行高虚拟化、滚动定位、读取/恢复滚动位置 |
| AutoTabs | 横向/纵向/菜单、嵌套、权限、禁用、保留面板状态、刷新 |

表格布局、排序、筛选、导出各自支持命名方案及版本。默认 localStorage 持久化，也可注入远程适配器。JSON/CSV 内置；XLSX 使用可选的独立适配器：

```tsx
import { exportXlsx } from '@zeroman/react-auto-components/xlsx';
// <AutoTable ... exportXlsx={exportXlsx} />
```

ExcelJS 在首次使用适配器时动态加载，不进入库的主入口。纯 CSV/JSON 用户可安装时省略 optional dependencies。

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
