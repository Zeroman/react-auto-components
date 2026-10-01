# 组件接入指南

[English](../../migration.md) | **简体中文** | [繁體中文](../zh-TW/migration.md) | [日本語](../ja/migration.md) | [한국어](../ko/migration.md) | [Español](../es/migration.md) | [Français](../fr/migration.md) | [Deutsch](../de/migration.md) | [Português (Brasil)](../pt-BR/migration.md) | [Русский](../ru/migration.md)

通过 React 泛型、回调和 Provider 来配置组件。下表将常见的应用需求映射到对应的公开 API 与可运行示例。

| 原场景 | React 接口 | 可运行示例/测试 |
| --- | --- | --- |
| 表单字段与 v-model | `fields: Field<T>[]`、`value/onChange` 或 `defaultValue` | `test-project/src/App.tsx` 表单页；`tests/form*.test.tsx` |
| 插槽、追加内容 | 字段 `render`、列 `render/header`、ReactNode | 表单/表格页 |
| 表单实例操作 | `ref.validate/reset/getValues/setValue/focus` | `tests/form.test.tsx` |
| 搜索、关联条件、RSQL | `buildQuery`、`matchesQuery`、`serializeRsql` | 搜索页；`tests/query.test.ts` |
| 表格本地/接口数据 | `data` 或 `dataSource(query,{signal})`，二选一 | 表格页；`tests/table.test.tsx` |
| 布局/筛选/排序/导出方案 | 设置弹窗中的独立方案，`versions` 分别失效 | 表格页；`tests/table-settings.test.ts` |
| 树、详情、汇总、合并 | `getChildren/renderExpanded`、列 `summary/merge` | 树形与展开场景；`tests/table-advanced.test.tsx` |
| 新增、修改、删除 | `formFields` 与 `onAdd/onEdit/onDelete` | 浏览器 CRUD 用例 |
| 命令式弹窗 | `AutoDialogProvider` + `useAutoDialog().open()` | 弹窗页；`tests/dialog.test.tsx` |
| 浮层服务 | `AutoPopoverProvider` + `useAutoPopover()` | 浮层页；`tests/popover.test.tsx` |
| 虚拟滚动 | `AutoScroll` 与 ref 方法 | 滚动页；浏览器万行测试 |
| 标签及嵌套标签 | `AutoTabs` items、value/onChange、keepMounted | 标签页；`tests/tabs.test.tsx` |

## 字段类型

`input/email/textarea/integer/float/percentage/progress/switch/select/select-v2/radio/checkbox/cascader/autocomplete/date/datetime/daterange/datetimerange/upload/text/title/tip/button/append/custom`。

`select-v2` 使用虚拟选项；范围日期使用两个有独立标签的原生输入；日期值通过 `dateValue` 选择字符串或时间戳。数字输入允许编辑中间态，提交时应使用字段规则验证业务约束。`rules` 支持异步校验，隐藏字段跳过校验。选项保留数字/布尔值，不强制转字符串。

```tsx
const fields: Field<User>[] = [
  { name: 'name', label: '姓名', required: true },
  { name: 'note', label: '备注', hidden: values => !values.enabled,
    render: ({ value, onChange, disabled }) =>
      <textarea disabled={disabled} value={String(value ?? '')}
        onChange={event => onChange(event.target.value)} /> },
];
```

完整参数以导出的 TypeScript 类型为准。`Field<T>` 绑定 T 的实际键；标题、提示等结构项无需绑定数据属性。

## 服务端数据源

```tsx
const dataSource: DataSource<User> = async (query, { signal }) => {
  const response = await fetch('/api/users/search', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  if (!response.ok) throw new Error('加载失败');
  return response.json(); // { rows: User[], total: number }
};
```

页码从 0 开始；`sort` 是多字段顺序数组，`filter` 是结构化查询树。组件取消旧请求，并阻止晚到结果覆盖新查询。业务条件在数据源闭包外变化时调用表格 `ref.refresh()`；保持数据源函数稳定可避免不必要请求。RSQL 适配仅用于后端协议需要时，不执行查询字符串。

## 业务上传与持久化

字段 `upload(files, signal)` 返回业务保存后的字段值，组件展示上传失败；上传 URL、鉴权与对象存储策略由调用方提供。

```tsx
<AutoConfigProvider config={{
  namespace: 'tenant-admin',
  canAccess: access => !access.permissions?.length || access.permissions.every(p => myPermissions.includes(p)),
  settings: {
    load: key => api.loadTableSettings(key),
    save: (key, settings) => api.saveTableSettings(key, settings),
  },
  notify: (message, level) => showToast(message, level),
}}>{children}</AutoConfigProvider>
```

本地更改会立即生效；远程保存按串行方式执行，失败后可选择重试。当更改持久化设置的格式时，请使用新的表格 id 或版本号，以避免加载不兼容的设置。
