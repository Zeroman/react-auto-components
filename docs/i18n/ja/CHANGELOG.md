# 変更履歴

[English](../../CHANGELOG.md) | [简体中文](../zh-CN/CHANGELOG.md) | [繁體中文](../zh-TW/CHANGELOG.md) | **日本語** | [한국어](../ko/CHANGELOG.md) | [Español](../es/CHANGELOG.md) | [Français](../fr/CHANGELOG.md) | [Deutsch](../de/CHANGELOG.md) | [Português (Brasil)](../pt-BR/CHANGELOG.md) | [Русский](../ru/CHANGELOG.md)

## 未リリース

- `AutoNavigation` を追加。マウントされたコンポーネントがパスツリーに登録されます。`goto` は相対パス、アクセス確認、中止シグナルに対応します。確定した位置だけが hash、browser、memory の history に同期されます。`AutoMenu` と `AutoTabs` は `route` を受け取り、現在の子に従います。
- `AutoTip` と `DefaultTip` を追加。フィールド、列、メニュー、タブのヒントはフローティング表示です。表示型の `tip` と `append` はインラインのままです。項目自身のコンポーネント、所有コンポーネント、`config.form` / `config.table` / `config.tabs` / `config.menu`、最後に `config.tipComponent` の順で決まります。
- `AutoSearch` の `mode` の既定は `"instant"` です。非表示のフィールドと `canAccess` を通らないフィールドは値オブジェクトに残り、クエリからは除かれます。検索オプションは `search` に書きます。従来のトップレベル `match` も使えます。
- `AutoTable` の `toolbarActions` で更新、設定、エクスポート、JSON の各ボタンを表示または非表示にします。`handle.refresh()` と `handle.export()` はそのまま使えます。並べ替えが 2 件以上のときだけ並べ替えタグを出します。
- フォームは `classNames` と `styles` のスロット、`divider` の表示項目、`virtual-select` に対応します。

## 0.1.3 - 2026-10-02

- 組み込み UI 文言の既定は英語になり、その文字列が `config.t` のキーです。他の言語は `t` を渡します。以前の中国語キー（`提交` や `刷新` など）は既定ではありません。
- 検索フォームは `AutoSearch`（`AutoSearchProps`）です。`AutoSearchPanel` と `AutoSearchPanelProps` は非推奨の別名として残します。
- `Field<T>` は `type` による判別共用体です。`options` のない `select`、スカラーの `daterange` または `datetimerange`、スカラー項目の `match: "between"` は TypeScript エラーです。`AnyField` と `unsafeField()` は逃げ道として残します。
- 開発者向けエラーは英語の `RacError` です。コンポーネント、修正方法、コードを含みます。[errors.md](errors.md) を参照。開発モードは、スタイル未読込、空のテーブル id、重複する `rowKey`、options のない選択項目、長さ 2 でない範囲値を警告します。
- `AutoConfigProvider` に JSON レジストリを追加：`config.fields`、`config.columns`、`config.rowActions`、`config.sources`。文字列キーは `Field.component`、列の `render` / `format` / `sort` / `exportFormat`、`RowAction.action`、`AutoTable` の `source` を解決します。フィールド、列、アクション上の関数が優先します。ネストした provider はマージされ、後のキーが勝ちます。`data`、`dataSource`、`source` は一つだけ渡します。未知の source は `RAC-TABLE-SOURCE` と再試行を表示します。
- フィールド、テーブル、検索、フォーム、ダイアログに安定した `data-testid="rac-*"` を追加。翻訳ラベルには従いません。
- 動的タブの開閉と切り替えに `useAutoTabsWorkspace` を追加。固定タブと任意の session 保存に対応します。タブは `closable`、`lazy`、`disabled`、`loading` にできます。
- 振る舞い: [AutoForm](auto-form.md)、[AutoSearch](auto-search.md)、[AutoTable](auto-table.md)、[AutoDialog](auto-dialog.md)、[AutoTabs](auto-tabs.md)、[AutoMenu](auto-menu.md)。パッケージ直下の `llms.txt` がエージェントの入口です。
- `v*` タグは GitHub Actions の Trusted Publishing で npm に公開されます。`./run.sh release` はきれいな `main` でパッチ番号を上げます。

## 0.1.2 - 2026-10-01

- `@zeroman.yang/react-auto-components` として公開。npm の `@zeroman` スコープは別のアカウントが所有しています。

- AutoChat を追加。メッセージ描画は呼び出し側が管理し、ストリーム追従・履歴アンカー読み込み・オプションのコンポーザー・10 言語デモに対応。新しいランタイム依存はありません。
- オンラインデモに「コードを表示」ダイアログを追加。各サンプルの実際のソースをファイル切り替え・ワンクリックコピー・GitHub リンクで確認できます。
- スキーマ駆動の React 19 コンポーネント：AutoForm、AutoSearchPanel、AutoTable、AutoDialog、AutoTabs、AutoMenu。
- グローバルなサイズと密度、フォームラベルのレイアウト、テーブル設定の永続化、オプションの XLSX エクスポート。
- 実際の tarball を使用する利用側プロジェクト、ユニットテスト、型チェック、Chromium の操作テスト。
- MIT ライセンス、コントリビューションガイド、GitHub CI、Issue テンプレート、npm アカウントの設定と公開手順。
- デフォルトの英語ドキュメントと、完全な翻訳および言語切り替えリンク。
