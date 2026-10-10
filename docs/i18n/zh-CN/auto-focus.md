# AutoFocus

[English](../../auto-focus.md) | **简体中文**

在页面任意位置声明自动聚焦入口，无需 Provider、标签页集成或路由。

```tsx
import { AutoFocus } from "@zeroman.yang/react-auto-components";

<AutoFocus>
  <input aria-label="Name" />
  <input aria-label="Email" />
</AutoFocus>

<AutoFocus target="textarea">
  <button>Toolbar</button>
  <textarea aria-label="Editor" />
</AutoFocus>
```

## 行为与属性

| 属性 | 行为 |
| --- | --- |
| `children` | 可选内容。AutoFocus 渲染一个 `display: contents` 的 `div`，不产生布局盒。默认按 DOM 顺序选择首个可见、启用且可聚焦的后代元素。 |
| `target` | 可选的包装容器内 CSS 选择器，或 `{ current: HTMLElement \| null }` DOM ref。ref 可以指向其他位置的元素，也可不传 children 使用。选择器匹配项按 DOM 顺序检查。无效选择器会抛出带修复提示的 `RAC-FOCUS-TARGET`。 |
| `disabled` | 默认 `false`。将当前注册项排除，不卸载子内容。 |

默认查找会跳过负 `tabindex`，包括仅支持程序聚焦的滚动容器。显式 `target` 选择器或 ref 仍可指定这些元素。

每个 document 维护一个注册列表，最后注册且具有有效目标的实例优先。普通重渲染不会改变注册顺序，卸载后重新挂载的实例加入末尾。多个入口属于正常情况，不报告冲突。AutoFocus 不管理嵌套关系，目标是否有效由祖先可见性决定。

在动画帧中合并处理。仅当最终选中的 DOM 元素变化时执行聚焦，并使用 `preventScroll`。用户点击或 Tab 到其他控件后，未变化的优先目标不会抢回焦点。两个实例指向同一 DOM 元素时，优先实例变化不会重复聚焦。不记录历史编辑框或光标位置。

## 可见性与生命周期

已断开连接、禁用、inert 或隐藏的目标会被排除，包括禁用的 fieldset、隐藏祖先和关闭的 details。`visibility: hidden`、`display: none` 和隐藏的 content visibility 都会排除目标。透明、处于视口之外或被遮挡的元素不视为隐藏，滚动不会选择新目标。AutoFocus 不锁定焦点，也不判断模态窗口归属。

声明容器或外部 ref 目标内部的 DOM 变化、祖先属性变化、目标尺寸变化、窗口尺寸变化、样式表变化/加载和过渡/动画结束都会触发检查，覆盖缓存面板显隐、条件内容和异步挂载的编辑器。选项未变的重渲染和无关 DOM 变化不会重新扫描入口；受影响的入口只扫描一次候选元素，供焦点解析和尺寸观察共用。直接 CSSOM 修改或依赖无关兄弟节点的 CSS（例如 `:has()`）需要尺寸或过渡通知才能触发检查。最后一个实例卸载时，会释放观察器并取消调度任务。

后注册的入口变为可用时会获得焦点，即使用户正在编辑其他控件。不希望参与时可使用 `disabled`。隐藏或移除优先入口后，剩余有效项中最后注册的入口获得焦点；没有有效项时，不会选择无关元素。

## 标签页

在面板内容内放置 AutoFocus。标签页只负责选择、显示和保留面板，切回后会重新选择入口。草稿可以保留，但不会恢复历史焦点。鼠标、Enter/空格激活和程序切换遵循相同规则。方向键只在标签之间移动焦点，不切换面板，也不会触发 AutoFocus。参见 [AutoTabs](auto-tabs.md) 和[迁移说明](migration.md#自动聚焦)。
