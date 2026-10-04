# AutoSearch

[English](../../auto-search.md) | **简体中文** | [繁體中文](../zh-TW/auto-search.md) | [日本語](../ja/auto-search.md) | [한국어](../ko/auto-search.md) | [Español](../es/auto-search.md) | [Français](../fr/auto-search.md) | [Deutsch](../de/auto-search.md) | [Português (Brasil)](../pt-BR/auto-search.md) | [Русский](../ru/auto-search.md)

搜索表单。内部渲染 `AutoForm`，同时给出 `QueryNode` 和原始值。即时输入和提交使用 [AutoForm](auto-form.md) 的字段校验规则；重置直接恢复默认筛选，不运行校验。

字段 tip 与 AutoForm 使用同一机制；AutoSearch 将 `tipComponent` 传给内部表单。

优先级为：单项／字段／列参数 → 所属组件参数 → Provider 的组件默认配置（`config.tabs`、`config.form`、`config.table` 或 `config.menu`）→ 全局 `AutoConfigProvider.config.tipComponent` → 内置 `DefaultTip`。自定义组件接收 `{ content, children, placement }`（`AutoTipProps`），需保留触发元素的事件、ref 和无障碍属性。`AutoTip` 与 `DefaultTip` 均已导出；默认实现通过 portal 显示，支持 Escape 关闭，触发元素位置不变。

## 用法

```tsx
import { AutoSearch } from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

<AutoSearch
  fields={[
    { name: "name", label: "名称", search: { match: "contains" } },
    {
      name: "period",
      type: "daterange",
      label: "周期",
      search: { match: "between" },
    },
  ]}
  onSearch={(query, values) => load(query, values)}
/>;
```

`type` 为 `daterange` 或 `search.match` 为 `"between"` 时，模型字段必须是两项元组。

## 行为与属性

| 属性                      | 行为                                                                                                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fields`                  | 与 AutoForm 相同的 `Field<T>`。搜索配置（`match`、`ignoreCase`、`includeNull`、`searchFields`、`more`）通过 `search?: SearchConfig` 子对象传入。`more: true` 的字段在展开「更多」之前隐藏。隐藏字段不进入查询。 |
| `onSearch(query, values)` | 必填，可返回 `void` 或 `Promise<void>`。**所有触发入口均捕获 throw/reject，保留当前值并显示 `error.message`，失败不会自动重置。** 新输入、重置或外部值变更后，旧搜索的错误不再显示。                            |
| `onChange`                | 编辑和重置都会触发。即时搜索时，它发生在 `onSearch` 之前。                                                                                                                                                      |
| `mode`                    | 默认 `"instant"`：修改条件时先校验，通过后搜索；提交也校验，重置直接搜索默认值。设置 `"manual"` 可仅在提交或重置时搜索。                                                                                        |
| `value`、`defaultValue`   | 受控和重置规则与 AutoForm 相同。                                                                                                                                                                                |
| `columns`                 | 默认 `3`。                                                                                                                                                                                                      |
| `sortTags`                | 你自己的按钮。`onRemove` 不捕获。                                                                                                                                                                               |
| `classNames`、`styles`    | 插槽样式覆盖：`classNames?: AutoSearchClassNames`（`root`、`form`、`actions`、`search`、`reset`、`moreToggle`）与 `styles?: AutoSearchStyles`。                                                                 |
| 标签属性                  | 与 AutoForm 相同。传入的布局优先于 provider。                                                                                                                                                                   |
| `searchLabel`、`resetLabel` | 替换内置的操作按钮文本。默认文本通过 `config.t` 国际化。                                                                                                                                                        |

## 查询值

| `match`      | 值                                                             |
| ------------ | -------------------------------------------------------------- |
| 省略         | `"eq"`；值是数组时为 `"in"`。                                  |
| `"contains"` | 子串。`ignoreCase: true` 忽略大小写。                          |
| `"between"`  | `[from, to]`。标量会警告 `RAC-FIELD-BETWEEN`，并且匹配不到行。 |
| `"isNull"`   | 匹配 null 或 undefined。输入的值被忽略。                       |
| 空值         | `undefined`、`null`、`""` 和空数组会被省略，`"isNull"` 除外。  |

`includeNull: true` 会再 OR 一个 `isNull`。`searchFields` 把同一次比较 OR 到这些行字段上，而不是只用 `name`。这些选项位于 `field.search = { match, ignoreCase, includeNull, searchFields, more }`；旧的顶层写法已在 0.2.0 移除。

即时校验包含可见、有权限、未禁用字段的 `required` 和同步／异步 `rules`；只有最新且通过校验的输入才会发出查询。已经发出的请求不会自动取消，调用方仍负责结果顺序或取消请求。

重置会清除字段错误和搜索错误，恢复 `defaultValue`，跳过校验并且只搜索一次。这样即使必填字段变空，也能清除筛选。重置搜索失败时显示错误，并保留已恢复的值。字段名不符合 `/^[\w.]+$/` 时，`serializeRsql` 抛 `RAC-QUERY-FIELD`。

## 前置条件

入口引入一次 `style.css`（开发模式 `RAC-CSS-MISSING`）。`AutoConfigProvider` 可选，只提供布局、翻译和权限。
