# RAC Stress Demo

极限测试（stress / edge-case）各组件的独立示例工程，通过 pnpm workspace 依赖本仓库的 `@zeroman.yang/react-auto-components`。与 `test-project/` 分离：后者是产品演示与 E2E；本目录专门压边界。

## 安装与启动

在仓库根目录：

```bash
pnpm install
pnpm build   # 确保 dist/ 可用（workspace 包导出指向 dist）
pnpm --dir examples/stress-demo dev
```

浏览器打开 http://127.0.0.1:4174/ 。生产预览：`pnpm --dir examples/stress-demo build && pnpm --dir examples/stress-demo preview`。

## 场景一览

| 路由 | 组件 | 验证点 |
| --- | --- | --- |
| `#/form` | AutoForm | 200–2000 字段、交叉校验、连打 `setValue`、重复 `name` → `RAC-FIELD-DUPLICATE` |
| `#/table` | AutoTable | 最高 10 万行虚拟滚动、空表、超宽列、动态增删列、超长单元格 |
| `#/chat` | AutoChat | 最高 5 万条虚拟消息、超长内容、流式中断、并发 `onSend` |
| `#/dialog` | AutoDialog | 多层叠开、声明式快速开关、关闭拦截、提交失败保留 |
| `#/menu` | AutoMenu | 深嵌套树、折叠连切、极小可缩放容器 |
| `#/tabs` | AutoTabs | 大量溢出标签、嵌套子页、快速切换保草稿 |
| `#/focus` | AutoFocus | 多实例竞争、显隐狂切、极小/零尺寸目标 |
| `#/search` | AutoSearch | 多字段 + more popover、受控连打、搜索失败保留草稿、极窄宽 |

## 如何验证

```bash
pnpm --dir examples/stress-demo exec tsc --noEmit
pnpm --dir examples/stress-demo build
pnpm --dir examples/stress-demo dev     # http://127.0.0.1:4174/
```

打开浏览器控制台逐页操作，以下任一情况视为问题：

- 未预期报错：未捕获异常、React 警告、非页面说明中预告的 `RAC-` 错误码。
- 明显卡顿：滚动、输入或切换明显掉帧、页面无响应。
- 预期不成立：各页底部说明与首页表格中的"验证点"未满足，例如并发 `onSend` 后新草稿被旧请求清空。

页面内可切换规模、连续触发动画的场景，应在触发中途切换到其他路由，确认无残留计时器继续更新已卸载页面。
