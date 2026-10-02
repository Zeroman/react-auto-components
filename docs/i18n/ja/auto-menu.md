# AutoMenu

[English](../../auto-menu.md) | [简体中文](../zh-CN/auto-menu.md) | [繁體中文](../zh-TW/auto-menu.md) | **日本語** | [한국어](../ko/auto-menu.md) | [Español](../es/auto-menu.md) | [Français](../fr/auto-menu.md) | [Deutsch](../de/auto-menu.md) | [Português (Brasil)](../pt-BR/auto-menu.md) | [Русский](../ru/auto-menu.md)

サイドバーです。パネルには [AutoTabs](auto-tabs.md) を使います。

## 振る舞いとプロパティ

| プロパティ | 振る舞い |
| --- | --- |
| `items` | `id` は木の中で一意。`hidden` と失敗した `canAccess` は捨てます。祖先を指す `children` は枝ごと捨て、再帰で落ちないようにします。 |
| `value` | 選択中の葉の id。省くと内部状態です。 |
| `onChange(id, item, path)` | **捕捉しません。** `path` は根から葉までの id です。子を持つ親は展開を切り替え、選択しません。 |
| `collapsible` | 既定 `false`。`collapsed` を制御するなら `onCollapsedChange` で自分で更新しないとレールは動きません。**`onCollapsedChange` は捕捉しません。** |
| `disabled` | その項目と子孫を無効にします。選択は飛ばします。 |

葉を選んでも自分では遷移しません。信号は `onChange` だけです。

## 前提

`style.css` を一度。`AutoConfigProvider` は任意です。権限は `config.canAccess` です。

アプリのエントリーで `import "@zeroman.yang/react-auto-components/style.css"` を一度読み込んでください。スタイルシートがない場合、開発時に `RAC-CSS-MISSING` を警告します。
