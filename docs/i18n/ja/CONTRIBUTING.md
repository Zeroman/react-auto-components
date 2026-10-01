# コントリビューション

[English](../../../.github/CONTRIBUTING.md) | [简体中文](../zh-CN/CONTRIBUTING.md) | [繁體中文](../zh-TW/CONTRIBUTING.md) | **日本語** | [한국어](../ko/CONTRIBUTING.md) | [Español](../es/CONTRIBUTING.md) | [Français](../fr/CONTRIBUTING.md) | [Deutsch](../de/CONTRIBUTING.md) | [Português (Brasil)](../pt-BR/CONTRIBUTING.md) | [Русский](../ru/CONTRIBUTING.md)

再現可能な問題の報告や機能の提案には Issues を、改善の提供には Pull Requests を使用してください。

## ローカル開発

Node.js >=22.12.0 と pnpm 12.5.1 が必要です。パッケージマネージャーのバージョンは package.json の packageManager フィールドで固定されています。

```sh
pnpm install --frozen-lockfile
pnpm prepare:test-project
pnpm --dir test-project dev
```

利用側プロジェクトは実際の tarball からライブラリをインストールします。ライブラリを変更した後は `pnpm prepare:test-project` を再実行してください。ソースエイリアスを導入せず、このパッケージベースのワークフローを維持してください。生成物、node_modules、実行ログはコミットしないでください。

## 検証

```sh
pnpm typecheck
pnpm test
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium
pnpm test:e2e
```

CI はこれらのチェックを Linux 上で実行します。ブラウザーテストは自動的にポート 4174 を使用し、開発デモはポート 4173 を使用します。

## ディレクトリ

- `src/components`：7 つのコンポーネントとその公開型。
- `src/core`：設定、プロバイダー、クエリ、共有型。
- `src/adapters`：オプションの XLSX アダプター。
- `src/styles`：明示的にインポートするコンポーネントスタイル。
- `tests`：ユニットテストと型エラーを期待するテスト。
- `test-project`：独立した利用側プロジェクトと Chromium の操作テスト。
- `scripts`：パッケージングと利用側プロジェクトのセットアップ用スクリプト。

## プルリクエスト

問題、変更後の動作、実際に実行したチェックを記述してください。コンポーネントのバグ修正時には、問題を再現する回帰テストを追加してください。公開 API や使い方を変更する場合はドキュメントを更新してください。変更範囲を絞り、無関係なリポジトリ全体のフォーマット変更は避けてください。

既存の厳格な TypeScript 設定とコードスタイルに従ってください。React 19 は引き続き peer dependency とし、スタイルは独立したエントリーポイントを使用し、XLSX はメインエントリーに含めません。コントリビューションは、このリポジトリの MIT ライセンスに基づいて提供されます。

## ドキュメントの翻訳

英語のドキュメントはデフォルトのファイル名を使用します。翻訳は `docs/i18n/<locale>/` の下にロケールごとにグループ化されます。たとえば、`docs/i18n/ja/README.md` や `docs/i18n/zh-CN/migration.md` のようになります。各言語間でセクション、例、技術的な意味、リリースステータスを同一に保ってください。公開識別子とコマンド引数はそのまま維持してください。ドキュメントを更新する際は、その翻訳も更新し、言語切り替えリンクおよび関連ドキュメントへのリンクの一貫性を保ってください。
