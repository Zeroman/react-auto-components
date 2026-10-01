# コンポーネント統合ガイド

[English](../../migration.md) | [简体中文](../zh-CN/migration.md) | [繁體中文](../zh-TW/migration.md) | **日本語** | [한국어](../ko/migration.md) | [Español](../es/migration.md) | [Français](../fr/migration.md) | [Deutsch](../de/migration.md) | [Português (Brasil)](../pt-BR/migration.md) | [Русский](../ru/migration.md)

React のジェネリクス、コールバック、プロバイダを通じてコンポーネントを設定します。次の表は、よくあるアプリケーションのニーズと公開 API および実行可能な例との対応を示したものです。

| 元のユースケース | React API | 実行可能な例／テスト |
| --- | --- | --- |
| フォームフィールドと v-model | `fields: Field<T>[]`、`value/onChange`、または `defaultValue` | `test-project/src/examples/FormDemo.tsx` のフォームページ；`tests/form*.test.tsx` |
| スロットと追加コンテンツ | フィールドの `render`、列の `render/header`、ReactNode | フォーム／テーブルページ |
| フォームインスタンスの操作 | `ref.validate/reset/getValues/setValue/focus` | `tests/form.test.tsx` |
| 検索、関連条件、RSQL | `buildQuery`、`matchesQuery`、`serializeRsql` | 検索ページ；`tests/query.test.ts` |
| ローカル／リモートのテーブルデータ | `data` または `dataSource(query,{signal})` | テーブルページ；`tests/table.test.tsx` |
| レイアウト／フィルター／ソート／エクスポートのプリセット | 設定ダイアログ内の独立したプリセット。`versions` によって個別に無効化 | テーブルページ；`tests/table-settings.test.ts` |
| ツリー、詳細、集計、セル結合 | `getChildren/renderExpanded`、列の `summary/merge` | ツリーと展開の例；`tests/table-advanced.test.tsx` |
| 追加、編集、削除 | `formFields` と `onAdd/onEdit/onDelete` | ブラウザーの CRUD テスト |
| 命令的ダイアログ | `AutoDialogProvider` + `useAutoDialog().open()` | ダイアログページ；`tests/dialog.test.tsx` |
| ポップオーバーサービス | `AutoPopoverProvider` + `useAutoPopover()` | ポップオーバーページ；`tests/popover.test.tsx` |
| 仮想スクロール | `AutoScroll` と ref メソッド | スクロールページ；10,000 行のブラウザーテスト |
| タブと入れ子のタブ | `AutoTabs` の items、value/onChange、keepMounted | タブページ；`tests/tabs.test.tsx` |

## フィールド型

`input/email/textarea/integer/float/percentage/progress/switch/select/select-v2/radio/checkbox/cascader/autocomplete/date/datetime/daterange/datetimerange/upload/text/title/tip/button/append/custom`。

`select-v2` は選択肢を仮想化します。日付範囲は個別のラベルを持つ 2 つのネイティブ入力を使用し、`dateValue` で文字列またはタイムスタンプを選択します。数値入力は編集中の中間状態を許容します。送信時のビジネス上の制約はフィールドルールで検証してください。`rules` は非同期バリデーションをサポートし、非表示のフィールドは検証をスキップします。選択肢は数値／真偽値を文字列に変換せず保持します。

```tsx
const fields: Field<User>[] = [
  { name: 'name', label: '名前', required: true },
  { name: 'note', label: '備考', hidden: values => !values.enabled,
    render: ({ value, onChange, disabled }) =>
      <textarea disabled={disabled} value={String(value ?? '')}
        onChange={event => onChange(event.target.value)} /> },
];
```

完全な API はエクスポートされる TypeScript 型を参照してください。`Field<T>` は T の実際のキーに結び付きます。タイトルやヒントなどの構造的な項目にはデータプロパティは不要です。

## サーバー側のデータソース

```tsx
const dataSource: DataSource<User> = async (query, { signal }) => {
  const response = await fetch('/api/users/search', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  if (!response.ok) throw new Error('読み込みに失敗しました');
  return response.json(); // { rows: User[], total: number }
};
```

ページインデックスは 0 から始まります。`sort` は順序付きのフィールド配列で、`filter` は構造化されたクエリツリーです。コンポーネントは古いリクエストをキャンセルし、遅れて届いたレスポンスによって新しいクエリの結果が上書きされることを防ぎます。データソースのクロージャー外の業務条件が変化した場合は、テーブルの `ref.refresh()` を呼び出してください。不要なリクエストを避けるため、データソース関数の参照を安定させてください。RSQL シリアライズはそれを必要とするバックエンド向けのアダプターにすぎず、クエリ文字列を実行するものではありません。

## アプリケーションのアップロードと永続化

フィールドの `upload(files, signal)` は、アプリケーションがファイルを保存した後のフィールド値を返します。コンポーネントはアップロード失敗を表示します。アップロード URL、認証、オブジェクトストレージのポリシーは呼び出し側で提供します。

```tsx
<AutoConfigProvider config={{
  namespace: 'tenant-admin',
  canAccess: access => !access.permissions?.length || access.permissions.every(p => myPermissions.includes(p)),
  settings: {
    load: key => api.loadTableSettings(key),
    save: (key, settings) => api.saveTableSettings(key, settings),
  },
  notify: (message, level) => showToast(message, level),
}}>{children}</AutoConfigProvider>
```

ローカルの変更は即座に適用されます。リモートへの保存は逐次実行され、失敗後には再試行のオプションが提供されます。保存済みの設定形式を変更する場合は、互換性のない設定の読み込みを避けるため、新しいテーブル id またはバージョンを使用してください。
