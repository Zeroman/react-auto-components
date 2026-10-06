# AutoTable

[English](../../auto-table.md) | **简体中文** | [繁體中文](../zh-TW/auto-table.md) | [日本語](../ja/auto-table.md) | [한국어](../ko/auto-table.md) | [Español](../es/auto-table.md) | [Français](../fr/auto-table.md) | [Deutsch](../de/auto-table.md) | [Português (Brasil)](../pt-BR/auto-table.md) | [Русский](../ru/auto-table.md)

本地或远程数据的表格，带排序、筛选、选择、可选虚拟滚动，以及增删改弹窗。搜索字段遵循 [AutoSearch](auto-search.md)。新增和编辑弹窗遵循 [AutoDialog](auto-dialog.md) 与 [AutoForm](auto-form.md)。

`data`、`dataSource`、`source` 只能提供一个；同时传递是类型错误。


列可设置 `tip: ReactNode`，通过列头旁的提示按钮显示。表格将 `tipComponent` 传给列提示、搜索字段和新增／编辑弹窗；`searchLayout.tipComponent` 可覆盖搜索提示。表格内部统一按表格参数 → `config.table.tipComponent` → 全局 `config.tipComponent` → `DefaultTip` 回退；内部搜索／编辑表单不再回退到 `config.form.tipComponent`。独立的 AutoSearch／AutoDialog 仍使用 form 默认配置。

优先级为：单项／字段／列参数 → 所属组件参数 → Provider 的组件默认配置（`config.tabs`、`config.form`、`config.table` 或 `config.menu`）→ 全局 `AutoConfigProvider.config.tipComponent` → 内置 `DefaultTip`。自定义组件接收 `{ content, children, placement }`（`AutoTipProps`），需保留触发元素的事件、ref 和无障碍属性。`AutoTip` 与 `DefaultTip` 均已导出；默认实现通过 portal 显示，支持 Escape 关闭，触发元素位置不变。

## 用法

```tsx
import { AutoTable } from "@zeroman.yang/react-auto-components";
import { exportXlsx } from "@zeroman.yang/react-auto-components/xlsx";
import "@zeroman.yang/react-auto-components/style.css";

<AutoTable
  id="orders"
  rowKey="id"
  title="订单列表"
  headerExtra={<span className="auto-muted">实时同步</span>}
  data={rows}
  columns={[{ key: "id", label: "编号" }]}
  actions={<button type="button">导入</button>}
  batchActions={(selected) => (
    <button type="button" onClick={() => archive(selected)}>
      归档所选 ({selected.length})
    </button>
  )}
  onAdd={(values) => createOrder(values)}
  onDelete={(selected) => deleteOrders(selected)}
  exportXlsx={exportXlsx}
/>
```

排序标签仅在多列排序（至少两个排序字段）时显示，默认与标题同行（`sortTagsLayout="inline"`）。设置 `sortTagsLayout="separate"` 可让标签在标题工具栏下方独占一行。没有排序条件或仅单列排序时，两种布局都不会为标签预留空间；已排序的列表头会高亮显示方向标志。

`exportXlsx` 来自 `@zeroman.yang/react-auto-components/xlsx`，不是主入口。`exceljs` 是可选依赖，缺失时为 `RAC-XLSX-DEP`。

## JSON 驱动的表格（零函数属性）

把这一节当作 `zm_api` 这类 JSON 生产方服务的接入模板：宿主一次性注册可执行行为，表格描述只包含 JSON。下面的端点只是示例宿主 API，不是库内置端点。

把这份描述保存为 `orders.table.json`：

```json
{
  "id": "orders",
  "rowKey": "id",
  "source": "orders.list",
  "pageSize": 10,
  "columns": [
    { "key": "id", "label": "Id" },
    { "key": "customer", "label": "Customer" },
    { "key": "paid", "label": "Paid", "component": "paid-label" }
  ],
  "searchFields": [
    { "name": "customer", "label": "Customer", "type": "input", "match": "contains" }
  ],
  "rowActions": [
    { "id": "inspect", "label": "Inspect order", "action": "orders.inspect" }
  ]
}
```

在 React 宿主里注册这些键，然后把描述原样传入：

```tsx
import {
  AutoConfigProvider,
  AutoTable,
  type AutoServices,
  type AutoTableProps,
} from "@zeroman.yang/react-auto-components";
import descriptionJson from "./orders.table.json";
import "@zeroman.yang/react-auto-components/style.css";

type Order = { id: string; customer: string; paid: boolean };
const description = descriptionJson as AutoTableProps<Order>;

const config = {
  namespace: "orders-app",
  sources: {
    "orders.list": async (query, { signal }) => {
      const response = await fetch("/api/orders/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
        signal,
      });
      if (!response.ok) throw new Error(`Load orders failed: ${response.status}`);
      return (await response.json()) as { rows: Order[]; total: number };
    },
  },
  columns: {
    "paid-label": { format: (value) => (value ? "Paid" : "Unpaid") },
  },
  rowActions: {
    "orders.inspect": (row) => {
      window.alert(`Order ${(row as Order).id}`);
    },
  },
} satisfies Partial<AutoServices>;

export default function OrdersPage() {
  return (
    <AutoConfigProvider config={config}>
      <AutoTable<Order> {...description} />
    </AutoConfigProvider>
  );
}
```

宿主端点收到 `{ pageIndex, pageSize, sort, filter }`（`pageIndex` 从零开始；`filter` 是[查询 AST](auto-search.md)）。它必须先做筛选与排序再分页，并返回例如 `{ "rows": [{ "id": "o-1", "customer": "Ada", "paid": true }], "total": 1 }`。`total` 是筛选后的总数。搜索或翻页会再次调用注册的 source；请求被拒绝时表格会显示错误并带重试。右键行可选择 **Inspect order**。

所有函数都在 `config` 中；表格描述里不出现任何函数。`source`、列 `component` 与行 `action` 指向宿主注册。自定义表单/搜索组件同样可以用 `Field.component` 搭配 `config.fields`。这些注册表并不取代内置的 CRUD 回调（`onAdd`、`onEdit`、`onDelete`）；自定义工作流请使用注册的行操作。上文中的类型断言描述的是约定好的数据契约，不是运行时校验：请在宿主边界对外部提供的描述与响应做校验。

AI/浏览器验证下的隔离渲染，见[确定性测试配方](../../llms.txt#deterministic-testing)。

## 行为与属性

| 属性 | 行为 |
| --- | --- |
| `id` | 必填。设置键是 `${namespace}:table:${id}`。空 id 警告 `RAC-TABLE-ID`。 |
| `rowKey` | 字段名或 `(row) => string`。已加载的行里必须唯一。缺失或重复警告 `RAC-TABLE-ROWID`。选择、展开和 `scrollToRow` 都用它。 |
| `data` | 本地行。筛选和分页在浏览器里完成。 |
| `dataSource(query, { signal })` | 远程分页。**reject：显示消息和重试按钮。abort 被忽略。** 返回 `{ rows, total }`，`total` 是筛选后的总条数，不是本页长度。 |
| `columns` | 省略时用第一行的键，跳过 `_auto_*`。列的 `type` 只影响格式化，不是表单控件。列属性 `formField?: Partial<Field<T>> | false` 可自定义或在新增/编辑弹窗中跳过该字段。 |
| `pageSize` | 默认 `10`。`pagination` 默认 `true`。 |
| `height` | 默认 `440` 像素。`"auto"` 填满已经有高度的父元素。 |
| `virtual` | 可选。用 TanStack Virtual 测量行高。 |
| `query`、`onQueryChange` | 受控查询。省略则页码、排序和筛选留在表格内（排序和筛选也跟随已保存的方案）。 |
| `searchFields` | 渲染 `AutoSearch`。它的 `onSearch` 更新表格筛选。 |
| `formFields` | 新增/编辑弹窗的 schema。省略时，从 `columns` 自动推导表单字段。列设置 `formField: false` 可排除该列；设置 `formField: { ... }` 可覆盖字段属性（如 `type`、`options`、`rules`）。带 `options` 的列映射为 `select`，`date` / `datetime` / `percentage` / `progress` 映射为对应表单控件，`number` 映射为 `integer`。 |
| `onAdd`、`onEdit`、`onDelete` | 校验通过后由弹窗调用。**reject 或 throw：弹窗保持打开并显示 `error.message`。除非你的处理函数已经改了数据，否则行不会变。** |
| `rowActions` | 行右键菜单操作集合。`onClick` 拒绝会被捕获，并在状态行显示约 2.5 秒；行不会被移除。 行菜单动作缺少 `onClick`，且 `action` 不是已注册的 `config.rowActions` 键时，选择该动作会在状态行显示 `RAC-ROW-ACTION`。提供 `onClick` 或注册对应的 `action`；两者都有时 `onClick` 优先。动作项支持 `icon` 图标、`danger` 危险警示色、`separator` 分隔线、`disabled` 及 `hidden`。 |
| `component` | 列的 `component` 未在 `AutoConfigProvider` 的 `config.columns` 中注册时，开发模式警告 `RAC-COLUMN-COMPONENT`，单元格使用默认格式。注册该键，或在列上提供 `render`、`format`、`sort`；列上的函数优先。 |
| `source` | `source` 是 `AutoConfigProvider` 的 `config.sources` 中的数据源键。未知键会显示 `RAC-TABLE-SOURCE` 和重试按钮。注册该键，或改用 `data` / `dataSource`；三者只能提供一个。 |
| `exportXlsx` | 只有 xlsx 需要。缺少适配器抛 `RAC-TABLE-XLSX`，状态行显示翻译后的适配器文案。CSV 和 JSON 是内置的。 |
| `versions` | 提高 layout、sort、filter 或 export 的版本号，丢掉对应的已存方案。 |
| `summaryValues` | 筛选结果的服务端合计，按列键索引。 |
| `actions` | 顶部右侧系统工具前的业务操作按钮区域。 |
| `batchActions` | `(selectedRows: T[]) => ReactNode`。选中行时在动态选择条中展示的批量操作。`onDelete` 也会在此渲染“删除所选”按钮。 |
| `headerExtra` | 顶部左侧标题和记录数旁的扩展内容。 |
| `reorderableColumns` | 默认 `true`。允许直接拖拽表头调整列顺序。列上可设置 `reorderable: false` 单独禁用拖拽。调整后的顺序自动持久化到布局设置中。 |
| `toolbarActions` | 刷新、设置、导出和 JSON。默认均在紧凑图标模式下展示（`mode: "icon"`）。可配置 `mode: "text"` 或 `"both"`。`false` 隐藏这四个按钮。对象只关掉设为 `false` 的按钮。`extra` 追加自定义工具。`handle.refresh()` 和 `handle.export()` 仍然可用。 |

### 数据源稳定性与原地换源

切换数据源（`source` 或 `dataSource` 变化）时，`AutoTable` 采用**原地发起新请求**，而非卸载或重建组件：
- **行保留（SWR 平滑过渡）**：请求在途期间保留上一份数据行，同时呈现顶部进度条动画与 `aria-busy="true"` 变暗加载态，杜绝白屏与布局抖动；
- **页码归零**：`pageIndex` 自动重置为 `0`，避免上一源页码在新源中产生越界空页；
- **清理选中**：上一数据源的选中项集合自动清空；
- **空态就绪**：只有当新源的响应实际返回空行（`rows: []`）时，才切换为 empty 空状态。

**稳定性契约**：`dataSource` 函数引用是响应式信号。如果直接传内联箭头函数（`<AutoTable dataSource={(q) => fetch(q)} />`），父组件每次渲染都会触发原地重新请求。请务必使用 `useCallback` 稳定引用或声明在组件外部，或使用 `source="name"` 搭配 `AutoConfigProvider`。

**本地 data 模式例外**：若使用本地受控模式（`<AutoTable data={rows} />`），数据全由调用方状态管理。若调用方在请求前自行清空状态（`setRows([])`），组件将直接接收空数组并渲染空态。若需享受无白屏原地 SWR 平滑刷新体验，请迁移至 `dataSource` 或 `source` 模式。

## 导出与设置

`handle.export(format, scope)` 即使状态行显示错误也会 resolve，错误不会再抛出。远程表的 `scope: "filtered"` 会逐页拉取。最后一页之前出现空页会抛 `RAC-TABLE-EXPORT-PAGE`，不会下载半份文件。

布局、排序、筛选和导出默认进 `config.storage`（即 `localStorage`），也可再走 `config.settings`。`settings.save` / `load` 失败会显示 "Could not save settings" 和重试按钮。内存中的表格继续可用。

设置里的筛选 JSON 不合法时，显示翻译后的 "Invalid filter"，警告 `RAC-TABLE-FILTER`，并保留上一次筛选。`between` 必须是两项数组。`in` 必须是数组。

`handle.reset()` 清排序、筛选、选择，并把布局收回列的默认值。`handle.refresh()` 重新请求 `dataSource`。`handle.scrollToRow(id)` 在该 id 未加载时什么也不做。

## 前置条件

入口引入一次 `style.css`。同一个源上有多个应用要持久化表格时，设置 `AutoConfigProvider` 的 `namespace`；默认是 `"auto"`。内置的新增/编辑弹窗用的是声明式对话框，不需要 `AutoDialogProvider`。只有 `useAutoDialog()` 需要它。
