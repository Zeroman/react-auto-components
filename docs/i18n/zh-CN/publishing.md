# GitHub 与 npm 发布指南

[English](../../publishing.md) | **简体中文** | [繁體中文](../zh-TW/publishing.md) | [日本語](../ja/publishing.md) | [한국어](../ko/publishing.md) | [Español](../es/publishing.md) | [Français](../fr/publishing.md) | [Deutsch](../de/publishing.md) | [Português (Brasil)](../pt-BR/publishing.md) | [Русский](../ru/publishing.md)

## 账号与包名

GitHub 仓库为 `Zeroman/react-auto-components`。npm 账号需要单独注册。计划使用的包名为 `@zeroman/react-auto-components`；发布前请先确认 `@zeroman` scope 的所有权。该包尚未发布到 npm。

1. 打开 [npm 注册页](https://www.npmjs.com/signup)，填写用户名、邮箱、密码，并自行阅读和接受服务条款。
2. 验证注册邮件。npm 文档说明发布前必须验证邮箱，发布账号的邮箱会出现在包元数据中；请选择适合公开维护用途的邮箱。
3. 在账号设置启用二步验证并保存恢复信息。密码、验证码、恢复码和 token 不写入仓库或聊天。
4. 在终端执行 `npm login --registry=https://registry.npmjs.org/`，按浏览器提示登录；执行 `npm whoami --registry=https://registry.npmjs.org/` 确认用户名。
5. 推荐个人 scope：`@<npm-username>/react-auto-components`。若使用组织 scope，先确认组织成员权限。

最终包名确定后，同步根目录 `package.json` 的 name、各语言 README 中的 import、消费项目依赖和源码/测试 import，再运行 `pnpm prepare:test-project` 刷新测试项目 lockfile。打包脚本会从根目录 package.json 读取包名并生成 tarball 名称。

官方说明：[账号注册](https://docs.npmjs.com/creating-a-new-npm-user-account/)、[公开 scoped 包](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)、[二步验证](https://docs.npmjs.com/about-two-factor-authentication/)。

## 发布前验证

从仓库根目录执行：

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium
pnpm test:e2e
npm pack --dry-run
```

`prepack` 自动构建 JS、CSS 与声明；`prepublishOnly` 执行类型检查和单元测试。npm 包只包含 dist、各语言 README 与迁移指南、LICENSE 及 package.json；确认没有凭据、本地日志或测试产物。README 的其他仓库文档链接可通过 GitHub 查看。

`test-project` 通过内容哈希 tarball 验证真实公开入口，新克隆不要直接在该目录运行 install，应先从根目录运行 `pnpm prepare:test-project`。准备命令会更新消费项目的本地依赖与 lockfile。

## 首次发布

账号、最终包名、许可证和上述验证完成后：

```sh
npm whoami --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```

发布时在 npm 提示中完成验证。发布后使用最终包名运行 `npm view <包名> version`，并在全新消费项目安装验证。首次发布成功后，移除各语言 README 的“首次发布准备中”提示并添加安装命令。

每次发布前更新 version 和各语言 CHANGELOG；不要尝试覆盖已发布版本。当前仓库 CI 只运行验证，不会自动发布 npm。

## 后续自动发布

可在首次发布后配置 [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)，将 npm 包绑定到 GitHub 仓库与明确的 workflow 文件；使用 GitHub 托管 runner、OIDC `id-token: write`，无需长期 npm token。官方当前要求 Node >=22.14.0、npm CLI >=11.5.1。启用前应先编写和验证发布工作流，并确保 tag、package.json 版本及被测提交一致。

GitHub Actions CI 执行锁文件安装、类型检查、单元测试、真实 tarball 消费构建和 Chromium 测试。分支保护可将 CI 设为合并要求；有外部贡献后再按维护需要配置。
