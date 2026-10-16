# React Auto Components DevTools

供 agent 操作基于 React Auto Components 构建的项目的可选开发工具。组件库和工具请安装配套版本。首版支持 Vite 项目，不向生产构建或 preview 服务注入浏览器控制能力。

## 安装与开启

```sh
pnpm add -D @zeroman.yang/react-auto-components-devtools
```

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { reactAutoComponentsDevtools } from "@zeroman.yang/react-auto-components-devtools/vite";

export default defineConfig({
  plugins: [react(), reactAutoComponentsDevtools()],
});
```

使用 `RAC_AGENT=1 pnpm dev` 启动。不设置此环境变量时，桥默认关闭。也可在专用 agent 配置中显式传入 `enabled: true`。插件选项只在服务端使用，不要将会话令牌放入公开环境变量。

插件自动注入页面客户端，在 Vite 根目录的 `.rac/servers/` 写入私有发现文件。请将 `.rac/` 加入 `.gitignore`。CLI 从当前目录向上查找；使用 `--discovery-dir <path>` 可以指定其他发现目录。本仓库根 demo 将发现文件写到仓库根目录。多个服务同时运行时需通过 `--server <serverId>` 选择，不猜测端口。只接受本机回环连接及同源浏览器请求，即使应用本身通过局域网地址提供访问。

## Agent 入口

在项目的 agent 指引中加入：

> 使用 `pnpm exec rac inspect` 发现开发页面。多个页面时，根据标题和 URL 选择目标，后续每条命令都带上它的 `--page` ID。使用 inspect 返回的 ref，不猜测选择器。通过 `pnpm exec rac help --json` 查看命令契约。页面断开后不要隐式切换目标。

```sh
pnpm exec rac inspect
pnpm exec rac inspect --page <pageId>
pnpm exec rac click <ref> --page <pageId>
pnpm exec rac fill <ref> "新值" --page <pageId>
pnpm exec rac wait <ref> --page <pageId> --timeout 5000
pnpm exec rac goto table:local --page <pageId>
pnpm exec rac console --page <pageId>
```

命令返回 JSON。未选定页面且存在多个页面时，inspect 返回 `selection_required` 和页面列表；其他命令拒绝有歧义的目标。每条命令仅操作一个页面，结果带有页面 ID。新页面不会抢走目标。刷新保留页面 ID 并替换连接；复制页面会获得独立 ID。关闭或过期的页面标记为 offline。刷新或超时打断的命令不自动重试，因为点击或提交可能已经执行。

检查结果包含可见交互元素、可访问名称、支持的操作，以及基于 RAC DOM 语义识别的组件分组。ref 指向本次检查的元素，在下一次检查或页面刷新后失效。`fill` 触发原生 input/change 事件以更新 React 受控输入；`submit` 经过表单正常的校验和提交流程；`validate` 只报告原生 HTML 有效性，不代表异步业务校验已完成。`wait` 等待已有引用的元素变为可见；新创建的元素需重新 inspect 后发现。自定义控件可通过其可见操作元素探索。

`AutoNavigationProvider` 在开发模式下自动提供导航能力，无需应用设置全局变量。未使用该 provider 的页面仍可进行 DOM 操作；导航命令会报告能力缺失。存在多个导航 provider 时返回歧义错误，不自动挑选。交互成功仅表示动作已执行，不保证后续数据请求全部结束，应再次检查或等待相关状态。

## 观察表单和搜索数据如何改变界面

在本仓库运行 `pnpm dev:agent`，打开终端显示的本地地址，在 AutoForm 或 AutoSearch 下选择 **RAC 联动演示**。这些示例也支持手动输入。RAC 操作真实控件，触发正常的 React 变更回调。

点击**开始演示**可观看引导演示。开发服务端逐步检查当前控件，通过与 CLI 相同的通道发送真实 RAC `fill` / `click` 命令。每次先显示提示并高亮需要关注的区域，约三秒后才修改数据，变化后的结果再保留至少三秒。演示期间暂时阻止页面的手动交互，**停止**和 Esc 仍可使用；完成、取消或连接异常后解除锁定。停止时已经发出的命令可能执行完毕，但不会再执行后续步骤。

一次演示绑定当前页面和当前连接，其他已打开的页面不受影响；刷新、切换路由或断开连接都会结束演示，不会自动重试。只允许运行 Vite 插件可选 `demos` 配置中预先声明的命名场景，界面不能提交可执行代码或任意命令步骤。本仓库的步骤定义位于 `test-project/racDemoScenarios.ts`。所有演示请求沿用本地来源和发现令牌验证。普通开发模式、静态构建和预览不会启用此功能。

```sh
pnpm rac inspect
# 根据标题和 URL 选择目标页面，替换以下所有占位符。
pnpm rac goto form:rac --page <pageId>
pnpm rac inspect --page <pageId>
pnpm rac fill <project-name-ref> "Nebula" --page <pageId>
pnpm rac fill <project-budget-ref> "4800" --page <pageId>
pnpm rac fill <enabled-ref> true --page <pageId>
# 新字段出现后重新检查，接下来全部使用新的 ref。
pnpm rac inspect --page <pageId>
pnpm rac fill <internal-code-ref> "RAC-001" --page <pageId>
```

观察**实时预览**卡片和**当前值**同步变化。启用后会出现内部代码字段；重置会恢复 Atlas、预算 1200 和未启用状态。受控 `AutoForm` 每次变更都更新演示页面的状态，同一份状态驱动预览，无需提交即可观察效果。

```sh
pnpm rac goto search:rac --page <pageId>
pnpm rac inspect --page <pageId>
pnpm rac fill <project-name-ref> "Atlas" --page <pageId>
```

**即时**模式下，结果从六条变成两条，只显示 Atlas 和 Atlas Mobile；重置恢复全部六条。要观察**手动**模式，重新检查后把“搜索模式”下拉框填为 `manual`，再修改项目名称。条件草稿会变化，已应用条件和结果保持不变；使用当前 ref 点击“搜索”按钮后才应用草稿。筛选状态时，使用 inspect 返回的“活跃”或“已暂停”对应的 `options[].value`；DOM 选项值是索引，并不是模型中的 `active` / `paused` 字符串。

上面的 ref 都是占位符，不是固定 ID。根据控件的可访问名称和支持的动作，在目标组件内选择控件。每次 inspect 都会使旧 ref 失效；导航或新字段出现后要重新检查。存在多个服务时还需加上 `--server <serverId>`。`fill` 通过事件修改字段值，不会直接替换任意组件数据对象。搜索结果在校验及 `onSearch` 后更新，每次动作后都应核对可见结果；托管页面可使用 `rac shot` 截取实时预览和结果列表。

## 截图与托管页面

需要托管浏览器页面和截图时，安装 Playwright 及 Chromium：

```sh
pnpm add -D playwright
pnpm exec playwright install chromium
pnpm exec rac open
pnpm exec rac shot --page <pageId> --out .rac-shots/page.png
```

`open` 创建可见浏览器页面；CI 中可传 `--headless`。`shot` 截取指定页面本身，不刷新页面、不重建路由。手动打开的页面支持检查和操作，但截图需要显式配置 `browserEndpoint`（本机 Chromium CDP 地址）。没有截图连接时返回可修复的能力错误，绝不另开替代页面。浏览器能力与 RAC 组件能力分别报告。

## 配置与生命周期

- `enabled`：默认取 `process.env.RAC_AGENT === "1"`，插件仅在开发服务生效。
- `allowEval`：默认 `false`，需显式开启后才允许 `eval` 命令。
- `discoveryDir`：默认是最终 Vite 根目录下的 `.rac/servers`。
- `browserEndpoint`：可选的本机 Chromium CDP 地址，用于接入现有浏览器。

页面标题和 URL 在变化时更新，并以一秒检查覆盖 history 更新。轮询或回执的短暂失败会有限重试，页面动作不会重放。开发服务重启会创建新会话。

服务每次启动生成令牌，控制请求需验证令牌；令牌只写入限制访问权限的发现文件。所提供的 HTML 不包含任何机密：页面加载同源的 `/__rac/bootstrap.js` 模块，该模块只有在回环、Host 和 Origin 检查通过后才会拿到令牌。即使应用通过局域网地址提供访问，页面标记本身也不会泄露凭据——请保持桥的回环限制不被放松。正常退出时清理发现文件，异常退出的残留由 CLI 探测后忽略。不要分享这些文件。服务关闭时还会拒绝未完成命令并关闭自己启动的浏览器；外部接入的浏览器只断开连接，不关闭其页面。

一个插件实例同一时间只服务一个运行中的开发服务器。把同一个 `reactAutoComponentsDevtools()` 对象挂到第二个正在运行的服务上会被拒绝并报 `RAC-DEVTOOLS-INPUT`；请为每个运行中的服务创建新的插件实例。前一个服务释放后按顺序复用同一实例仍然受支持，包括 Vite 的重启流程。

## 维护者发布流程

组件库与 DevTools 在同一仓库维护，初期版本同步。同时更新两个包的版本及 DevTools 的组件 peer 依赖。`pnpm prepare:test-project` 打包两份产物并安装到测试项目，测试项目不使用工作区链接消费它们。

发布工作流校验标签、验证打包消费，然后先发布组件库、再发布 DevTools。发布脚本查询已存在版本并跳过，使部分成功的发布能够续跑。预发布版本使用 npm 的 `next` 标签，稳定版本使用 `latest`。每个 npm 包需单独配置发布权限或 Trusted Publisher。本地实现和验证不会发布任何包。

结果传输有大小限制：成功结果超过 512 KiB（UTF-8）时，客户端返回 `RAC-DEVTOOLS-RESULT`，不会断开页面连接。动作已经执行，绝不自动重放。错误详情和控制台记录会限长截断。结果接口最大接受 2 MiB；命令输入仍限制为 64 KiB。
