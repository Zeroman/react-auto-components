# GitHub と npm への公開

[English](../../publishing.md) | [简体中文](../zh-CN/publishing.md) | [繁體中文](../zh-TW/publishing.md) | **日本語** | [한국어](../ko/publishing.md) | [Español](../es/publishing.md) | [Français](../fr/publishing.md) | [Deutsch](../de/publishing.md) | [Português (Brasil)](../pt-BR/publishing.md) | [Русский](../ru/publishing.md)

## アカウントとパッケージ名

GitHub リポジトリは `Zeroman/react-auto-components` です。npm アカウントは別途登録が必要です。予定しているパッケージ名は `@zeroman/react-auto-components` であり、公開前に `@zeroman` スコープの所有権を確認してください。このパッケージはまだ npm に公開されていません。

1. [npm 登録ページ](https://www.npmjs.com/signup)を開き、ユーザー名、メールアドレス、パスワードを入力し、利用規約を自分で確認して同意します。
2. 登録メールを確認します。npm では公開前にメールアドレスの認証が必要です。公開者のメールアドレスはパッケージメタデータに表示されるため、公開プロジェクトの保守に適したアドレスを選択してください。
3. アカウント設定で二要素認証を有効にし、復旧情報を保存します。パスワード、確認コード、リカバリーコード、トークンをリポジトリやチャットに記載しないでください。
4. `npm login --registry=https://registry.npmjs.org/` を実行し、ブラウザーの案内に従います。`npm whoami --registry=https://registry.npmjs.org/` でアカウントを確認します。
5. `@<npm-username>/react-auto-components` のような個人スコープを推奨します。組織スコープの場合は、事前にメンバー資格と公開権限を確認してください。

名前が確定したら、ルートの package.json の name、各言語 README のインポート、利用側の依存関係、ソース／テストのインポートを更新します。その後 `pnpm prepare:test-project` を実行して利用側のロックファイルを更新します。パッケージングスクリプトは、ルートの package.json から tarball 名を生成します。

公式ドキュメント：[アカウント登録](https://docs.npmjs.com/creating-a-new-npm-user-account/)、[公開スコープ付きパッケージ](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)、[二要素認証](https://docs.npmjs.com/about-two-factor-authentication/)。

## リリース前の検証

リポジトリのルートから実行します。

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

`prepack` は JavaScript、CSS、型宣言を自動的にビルドし、`prepublishOnly` は型チェックとユニットテストを実行します。npm パッケージに含まれるのは dist、README と移行ガイドの翻訳、LICENSE、package.json のみです。認証情報、ローカルログ、テスト出力が除外されていることを確認してください。その他のリポジトリドキュメントには GitHub 上のリンクからアクセスします。

`test-project` はコンテンツハッシュ付きの tarball を通じて実際の公開エントリーポイントを検証します。新規クローンでは、そのディレクトリでインストールする前にルートから `pnpm prepare:test-project` を実行してください。準備コマンドは利用側のローカル依存関係とロックファイルを更新します。

## 初回リリース

アカウント設定、最終パッケージ名、ライセンス、上記のチェックがすべて完了したら、次を実行します。

```sh
npm whoami --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```

npm が要求する認証を完了します。公開後は最終的な名前を使って `npm view <package-name> version` を実行し、新しい利用側プロジェクトにインストールして検証します。初回リリースが成功した後、各言語の README から初回リリース準備中の案内を削除し、インストール手順を追加してください。

各リリースの前に、バージョンとすべての CHANGELOG 翻訳を更新してください。公開済みバージョンを上書きしようとしないでください。現在のリポジトリ CI は変更の検証のみを行い、npm への自動公開は行いません。

## 今後の自動リリース

初回リリース後に [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) を設定し、パッケージを GitHub リポジトリと特定のワークフローファイルに結び付けます。GitHub ホストランナーと OIDC の `id-token: write` を使用し、有効期間の長い npm トークンは使用しません。文書化されている要件は Node >=22.14.0 と npm CLI >=11.5.1 です。有効にする前に公開ワークフローを実装・検証し、タグ、package.json のバージョン、テスト済みコミットが一致していることを確認してください。

GitHub Actions CI はロックファイルからインストールし、型チェック、ユニットテスト、実際の tarball を利用するプロジェクトのビルド、Chromium テストを実行します。ブランチ保護によりマージ前の CI 成功を必須にできます。外部からのコントリビューションに伴う保守上の必要性に応じて設定してください。
