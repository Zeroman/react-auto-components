# 贡献指南

[English](../../../.github/CONTRIBUTING.md) | **简体中文** | [繁體中文](../zh-TW/CONTRIBUTING.md) | [日本語](../ja/CONTRIBUTING.md) | [한국어](../ko/CONTRIBUTING.md) | [Español](../es/CONTRIBUTING.md) | [Français](../fr/CONTRIBUTING.md) | [Deutsch](../de/CONTRIBUTING.md) | [Português (Brasil)](../pt-BR/CONTRIBUTING.md) | [Русский](../ru/CONTRIBUTING.md)

欢迎通过 Issue 提供可复现问题或需求，通过 Pull Request 提交改进。

## 本地开发

需要 Node.js >=22.12.0、pnpm 12.5.1；版本由 package.json 的 packageManager 固定。

```sh
pnpm install --frozen-lockfile
pnpm prepare:test-project
pnpm --dir test-project dev
```

消费项目从真实 tarball 安装组件库。修改库后重新运行 `pnpm prepare:test-project`，不要改成源码 alias，也不要提交 artifacts、node_modules 或运行日志。

## 验证

```sh
pnpm typecheck
pnpm test
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium
pnpm test:e2e
```

CI 在 Linux 上执行以上验证。浏览器测试自动使用 4174 端口，日常演示使用 4173 端口。

## 目录

- `src/components`：七个组件及其公共类型。
- `src/core`：配置、Provider、查询和共享类型。
- `src/adapters`：可选 XLSX 适配器。
- `src/styles`：显式导入的组件样式。
- `tests`：单元测试和类型负例。
- `test-project`：独立包消费项目及 Chromium 交互测试。
- `scripts`：打包与消费项目准备脚本。

## 提交 Pull Request

描述问题、改动后的行为和实际执行的验证。修复组件缺陷时补充能重现问题的回归测试；公共 API 或使用方式变化同步更新 README。保持改动聚焦，避免无关的全量格式化。

遵循现有 TypeScript 严格类型和代码风格。库保持 React 19 peer dependency，样式通过独立入口导入，XLSX 不进入主入口。贡献按本仓库 MIT 许可证提供。

## 文档翻译

英文文档使用其默认文件名。翻译文档按语言区域分组存放在 `docs/i18n/<locale>/` 目录下，例如 `docs/i18n/ja/README.md` 和 `docs/i18n/zh-CN/migration.md`。各语言版本应保持相同的章节、示例、技术含义和发布状态。保留公共标识符和命令参数。更新文档时，请同步更新其翻译版本，并保持语言切换链接以及相关文档链接的一致性。
