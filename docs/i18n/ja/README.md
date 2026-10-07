# React Auto Components

[English](../../../README.md) | [简体中文](../zh-CN/README.md) | [繁體中文](../zh-TW/README.md) | **日本語** | [한국어](../ko/README.md) | [Español](../es/README.md) | [Français](../fr/README.md) | [Deutsch](../de/README.md) | [Português (Brasil)](../pt-BR/README.md) | [Русский](../ru/README.md)

React 19 向けのスタンドアローンなスキーマ駆動コンポーネントライブラリで、フォーム・テーブル・チャットをカバーします。TypeScript、TanStack Table 9 / Form / Virtual、Radix、Floating UI を用いて構築されており、Ant Design、Element Plus、MUI には依存しません。ライブラリのビルドには React Compiler を使用しています。

[![Auto Studio デモプレビュー](../../assets/demo.png)](https://zeroman.github.io/react-auto-components/)

<p align="center">
  <a href="https://zeroman.github.io/react-auto-components/"><strong>🚀 オンラインデモ (GitHub Pages)</strong></a> · <a href="#独立したテストプロジェクトの実行">ローカル実行</a> · <a href="#コンポーネント">コンポーネント</a>
</p>

## プロジェクトの状況

現在のバージョンは 0.4.0 であり、API はまだ変更される可能性があります。React 19 が必要です。このパッケージは ESM および TypeScript 型宣言を提供します。組み込みのインターフェーステキストは既定で英語であり、AutoConfigProvider.config.t を通じて翻訳できます。

`pnpm add @zeroman.yang/react-auto-components` でインストールします（npm と yarn でも同様です）。peer dependency は React 19 と react-dom 19 です。エントリでスタイルシートを一度読み込んでください: `import "@zeroman.yang/react-auto-components/style.css"`。

アプリのエントリーで `import "@zeroman.yang/react-auto-components/style.css"` を一度読み込んでください。スタイルシートがない場合、開発時に `RAC-CSS-MISSING` を警告します。

XLSX 出力で `exportXlsx` アダプターがない場合は `RAC-TABLE-XLSX`、任意依存の `exceljs` を読み込めない場合は `RAC-XLSX-DEP` です。`@zeroman.yang/react-auto-components/xlsx` からアダプターを読み込んで渡し、必要なら `pnpm add exceljs` でインストールしてください。CSV と JSON には不要です。

- [オンラインデモ (GitHub Pages)](https://zeroman.github.io/react-auto-components/)
- [コントリビューション](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/ja/CONTRIBUTING.md)
- [変更履歴](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/ja/CHANGELOG.md)
- [アカウント設定と公開](https://github.com/Zeroman/react-auto-components/blob/main/docs/i18n/ja/publishing.md)
- [MIT ライセンス](../../../LICENSE)

## 独立したテストプロジェクトの実行

Node.js >= 22.12 と pnpm 12.5 が必要です。

```sh
pnpm install --frozen-lockfile
pnpm prepare:test-project
pnpm --dir test-project dev
```

http://127.0.0.1:4173 を開きます。テストプロジェクトには、全 7 コンポーネントのページ、ローカル／サーバー側／10,000 行／ツリーテーブル、CRUD、送信失敗後の再試行、下書き、入れ子のタブ、可変行高の例が含まれます。

デモではブラウザの言語を自動的に検出し、フォールバックとして英語を使用します。ヘッダーまたはグローバル設定から言語を選択できます。選択内容はリロード後も記憶されます。再びブラウザの言語に従うには「Auto」を選択してください。10 の言語をサポートしています。ページはビューポート全体に表示され、テーブルや長いパネルはそれぞれの領域内でスクロールします。

各サンプルページには**コードを表示**ボタンがあり、ダイアログで実際のソースファイルを開きます。ファイル切り替え・ワンクリックコピー・GitHub リンクに対応します。

`test-project` は独自の package.json とロックファイルを持ちます。ソースエイリアスを使用せず、`pnpm pack` の実際の出力をインストールします。ライブラリを変更した後は、`pnpm prepare:test-project` を再実行してください。このスクリプトはコンテンツハッシュ付きのファイル名を使用し、古い tarball キャッシュの利用を防ぎます。

## 使用方法

```tsx
import { useState } from 'react';
import {
  AutoConfigProvider, AutoDialogProvider, AutoTable,
  type AutoColumn, type Field,
} from '@zeroman.yang/react-auto-components';
import '@zeroman.yang/react-auto-components/style.css';

type Person = { id: number; name: string; enabled: boolean };
const columns: AutoColumn<Person>[] = [
  { key: 'name', label: '名前', sortable: true },
  { key: 'enabled', label: '有効', options: [
    { label: 'はい', value: true }, { label: 'いいえ', value: false },
  ] },
];
const fields: Field<Person>[] = [
  { name: 'name', label: '名前', required: true },
  { name: 'enabled', label: '有効', type: 'switch', defaultValue: true },
];
export function App() {
  const [rows, setRows] = useState<Person[]>([]);
  return <AutoConfigProvider config={{ namespace: 'my-app' }}>
    <AutoDialogProvider>
      <AutoTable<Person> id="people" rowKey="id" data={rows}
        columns={columns} formFields={fields} searchFields={fields}
        onAdd={value => setRows(old => [...old, { ...value, id: Date.now() }])}
        onEdit={(row, value) => setRows(old => old.map(item => item.id === row.id ? { ...row, ...value } : item))}
        onDelete={selected => setRows(old => old.filter(item => !selected.some(row => row.id === item.id)))}
      />
    </AutoDialogProvider>
  </AutoConfigProvider>;
}
```

フィールド、列、ref はジェネリクスを使用します。不正なフィールド名やデフォルト値はコンパイル時エラーになります。プロバイダーは名前空間、権限、フィールドラベルの翻訳、カスタムフィールド、通知、永続化アダプターをサポートします。 組み込みのラベル、バリデーションメッセージ、アクセシビリティテキストは AutoConfigProvider.config.t を使用します。明示的に指定されたコンポーネントのラベルが優先されます。

t コールバックはメッセージキーとフォールバックを受け取ります。翻訳された組み込みメッセージでは、{0} や {1} のような番号付きプレースホルダーを保持してください。コンポーネントが翻訳後に値を置換します。

## コンポーネント

| コンポーネント | 機能 |
| --- | --- |
| AutoForm | ネイティブフィールド型、選択肢の仮想化、連動選択、アップロードアダプター、カスタムレンダリング、依存フィールド、条件付き表示、非同期バリデーション、制御された状態、失敗後の入力保持 |
| AutoSearch | 基本／詳細条件、手動／即時検索、リセット、ソートタグ、共有クエリ AST、RSQL シリアライズ |
| AutoTable | ローカル／リモートデータ、複数列ソート、列フィルター、ページネーション、安定した選択状態、仮想化、ツリー／詳細の展開、集計、セル結合、CRUD、コンテキストメニュー、コピー |
| AutoDialog | 宣言的／命令的 API、分離されたプロバイダー、下書き、閉じる操作のガード、フォーカス管理、ドラッグ、全画面表示、非同期送信 |
| AutoTabs | 横／縦レイアウト、入れ子、権限、タブの無効化、パネル状態の保持、更新 |
| AutoMenu | アイコン・説明・バッジ・入れ子グループ・権限に対応し、折りたたみ可能なアイコンレールを備えたサイドバーナビゲーション |
| AutoChat | 呼び出し側によるメッセージ描画、オプションの仮想化、ストリーム追従、アンカー付き履歴読み込み、送信／停止コンポーザー、カスタムアクション |

テーブルのレイアウト、ソート、フィルター、エクスポートは、それぞれ名前付きプリセットと独立したバージョンをサポートします。永続化にはデフォルトで localStorage を使用し、リモートアダプターも注入できます。JSON/CSV エクスポートは組み込みです。XLSX は任意の独立したアダプターを使用します。

```tsx
import { exportXlsx } from '@zeroman.yang/react-auto-components/xlsx';
// <AutoTable ... exportXlsx={exportXlsx} />
```

ExcelJS はアダプターの初回使用時に動的に読み込まれ、ライブラリのメインエントリーには含まれません。CSV/JSON のみを使用するアプリケーションでは、インストール時にオプションの依存関係を省略できます。

## 検証

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm prepare:test-project
pnpm --dir test-project build
pnpm exec playwright install chromium  # 初回実行のみ
pnpm test:e2e
```

ユニットテストは、フィールド、非同期バリデーション、クエリ、ダイアログ、仮想化、テーブル、設定の移行、エクスポートをカバーします。Playwright テストはパッケージ化された公開エントリーポイント経由で操作を検証します。デスクトップ／モバイルのスクリーンショットは `test-project/test-results` に保存されます。

## 動作と規約

- これは React に適した API であり、Vue の各プロパティやメソッドをそのまま対応付ける互換レイヤーではありません。[移行ガイド](migration.md)を参照してください。
- データはアプリケーションコードが管理します。CRUD コールバックで変更を永続化し、失敗時に例外を送出すると編集内容が保持されます。成功後、コンポーネントはリモートデータを再取得します。ローカルデータは呼び出し側で更新する必要があります。
- テーブルの `id` は名前空間内で一意である必要があり、`rowKey` は全ページとツリーノードを通じて一意である必要があります。サーバー側モードでは `columns` を明示的に指定し、データソースは総件数を返します。
- `query` / `value` を制御する場合、親はコールバックを処理して値を更新する必要があります。非制御として使用する場合、これらの props は省略できます。
- セル結合は、仮想ウィンドウ間の rowSpan のずれを防ぐため、仮想化しないセマンティックなテーブルを使用します。ページ分割されたデータに適しています。
- フィルター後の全行に対するサーバー側の集計は `summaryValues` で渡します。集計がない場合は、現在のページの合計を全体の合計として表示せず、`—` を表示します。現在のページを明示的に集計するには `summaryScope="page"` を設定します。
- アップロード中は送信を一時停止します。リセット、フィールド値の置換、アンマウントは古いアップロードをキャンセルし、遅れて届いた結果が新しい値を上書きすることはありません。
- フィルター後の全結果をリモートからエクスポートする場合、1 ページずつデータを要求します。大規模なアプリケーションでは独自のサーバー側エクスポートを実装できます。
- ブラウザー用スタイルは `style.css` から明示的にインポートしてください。JavaScript モジュールは `window` のない Node 環境でもインポートできます。

## AutoTable で残りの高さを埋める

`height={440}` は引き続きデータのスクロール領域を固定の高さに設定します。`height="auto"` では、テーブル全体が親レイアウトから割り当てられた高さを埋めます。検索領域、ツールバー、ページネーションは自然な高さを取り、データ領域が残りのスペースを使用して独立にスクロールします。

```tsx
<div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', gap: 12 }}>
  <header>ページタイトルと説明</header>
  <AutoTable<Person> id="people" rowKey="id" data={rows}
    columns={columns} height="auto" />
  <footer>ページフッター</footer>
</div>
```

親には確定した高さが必要です。入れ子の flex コンテナーでは `flex: 1; min-height: 0` を使用して残りのスペースを引き継ぎ、grid レイアウトでは `grid-template-rows: auto minmax(0, 1fr) auto` を使用します。ビューポートの高さからツールバーの高さを引く JavaScript の計算は不要です。検索フィールドの追加／削除、ツールバーの折り返し、親のリサイズはレイアウトが処理し、仮想リストはスクロール領域の実際の寸法に追従します。

この設定は行数に応じてテーブルのサイズを変更するものではありません。空のデータセットや少数のデータでも、利用可能なスペースを埋めます。親は少なくとも検索領域、ツールバー、ページネーション自体を収められる必要があります。

テストプロジェクトの **AutoTable → 残りの高さ** タブで、サイドバーとページヘッダーを維持した例を確認できます。従来の URL `http://127.0.0.1:4173/?demo=auto-height` でもこのタブを直接選択できます。ブラウザーテストは `test-project/tests/auto-height.spec.ts` にあります。

## グローバルなフォームレイアウト

`AutoConfigProvider.config.form` を使用して、通常のフォーム、検索パネル、テーブルの検索領域、ダイアログのフォームを一貫して設定できます。ラベルはコントロールの上または左に配置でき、テキストの左揃え／右揃えは独立して指定できます。デフォルトは上配置のラベルとゆったりした間隔です。

```tsx
<AutoConfigProvider config={{
  form: {
    labelPosition: 'left', // 'top': 上; 'left': コントロールの左
    labelAlign: 'right',   // テキストは右寄せ。ラベルはコントロールの左に配置
    labelWidth: 80,
    density: 'compact',   // 'comfortable': 間隔を広めに
  },
}}>
  <App />
</AutoConfigProvider>
```

入れ子のプロバイダーはレイアウト設定をプロパティごとにマージします。コンポーネントに明示した props は外側のプロバイダーより優先されます。たとえば、全体ではインラインラベルを使用しつつ、1 つのフォームだけ上配置のラベルを維持できます。

```tsx
<AutoForm fields={fields} labelPosition="top" density="comfortable" />
<AutoTable id="people" rowKey="id" data={rows} columns={columns}
  searchFields={searchFields}
  searchLayout={{ labelWidth: 100, columns: 3 }} />
```

`labelWidth` のデフォルトは `"auto"` で、ピクセル数や `"6em"` などの CSS 幅も指定できます。自動モードでは各検索ラベルがテキストに合った幅になり、通常のフォームとダイアログのフォームでは表示中のラベルに基づく共通の幅でコントロールを揃えます。長いラベルの幅はフィールド幅の最大 45% となり、それを超える部分は折り返すことでコントロール用のスペースを確保します。明示した固定幅にはこの自動制限は適用されません。コンパクトな検索領域では、スペースがあれば操作ボタンを同じ行に配置し、狭い画面では折り返します。ラベルの関連付けは維持され、エラーと説明はコントロールに揃い、長いラベルは折り返せます。

デモでは、サイドバーまたは右上の歯車から **グローバル設定** を開き、レイアウト、密度、ラベル幅、テーマを変更できます。変更は現在の入力を消去せず即座に反映されます。フォームページでは **グローバル設定に従う** またはローカルの上書きを選択できます。デモはプロバイダーを通じてコンパクトなインラインレイアウトを明示的に有効化しています。

## グローバルなサイズと密度

`AutoConfigProvider` は `size: "small" | "medium" | "large"` と `density: "compact" | "comfortable"` をサポートします。コンポーネントに明示した props がコンポーネント種別の設定より優先され、種別の設定はグローバル値より優先されます。

```tsx
<AutoConfigProvider config={{
  size: "medium",
  density: "compact",
  form: { labelPosition: "left", labelAlign: "right" },
  table: { density: "compact" },
  tabs: { density: "compact" },
}}>
  <AutoForm fields={fields} size="small" />
</AutoConfigProvider>
```

テーブルの密度は `normal` もサポートします。テーブル設定パネルはデフォルトでグローバル設定に従います。コンパクト、標準、ゆったりした間隔を選択するとグローバル密度を上書きし、レイアウトプリセットとともに保存されます。コンポーネントの `density` prop が最優先です。入れ子のコンポーネントに設定したローカルサイズはそれぞれ独立して適用されます。

フォームは `resetLabel`、`extraActions`、`onReset` を、検索パネルは `searchLabel`、`resetLabel`、`extraActions` を、ダイアログは `cancelLabel`、`extraActions` をサポートします。`AutoTabs` の項目では `badge` を定義でき、`AutoTable.empty` で空の状態の内容をカスタマイズできます。

### AutoChat

AutoChat は、ストリーミング追従、履歴の読み込み、コンポーザーを備えた軽量な会話レイアウトを提供します。メッセージの表示には React コンテンツか renderMessage を指定でき、追加のランタイム依存関係は不要です。

[AutoChat API](auto-chat.md)

コールバックが throw したあとコンポーネントがどう扱うかは、振る舞いの契約を見てください：[AutoForm](auto-form.md)、[AutoSearch](auto-search.md)、[AutoTable](auto-table.md)、[AutoDialog](auto-dialog.md)、[AutoTabs](auto-tabs.md)、[AutoMenu](auto-menu.md)。開発者向けエラーコード：[errors.md](errors.md)。
