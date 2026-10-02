# AutoTabs

[English](../../auto-tabs.md) | [简体中文](../zh-CN/auto-tabs.md) | [繁體中文](../zh-TW/auto-tabs.md) | **日本語** | [한국어](../ko/auto-tabs.md) | [Español](../es/auto-tabs.md) | [Français](../fr/auto-tabs.md) | [Deutsch](../de/auto-tabs.md) | [Português (Brasil)](../pt-BR/auto-tabs.md) | [Русский](../ru/auto-tabs.md)

タブです。入れ子は `children` の別の `AutoTabs` です。サイドバーは [AutoMenu](auto-menu.md) です。

## 振る舞いとプロパティ

| プロパティ | 振る舞い |
| --- | --- |
| `items` | 安定した `id`。`hidden` と失敗した `canAccess` はタブを外します。 |
| `value` | 根からの id パス。入れ子は `["parent", "child"]` です。 |
| `onChange(path, item)` | **捕捉しません。** throw すると React が報告します。制御しているなら、まだ確定していないパスは前回のままです。 |
| `mode` | 既定 `"horizontal"`。`"vertical"` はタブを縦にします。 |
| `keepMounted` | 既定 `true`。非選択パネルもマウントしたままです。`false` は外します。 |
| `onRefresh` | あるとそのタブに更新ボタン。**捕捉しません。** |
| `disabled` | 見えたまま選べません。既定の選択は無効タブを飛ばします。 |

## 前提

`style.css` を一度（開発時 `RAC-CSS-MISSING`）。`AutoConfigProvider` は任意です。

## 動的タブ

`useAutoTabsWorkspace` はルーターなしでページを開閉します。`tabsProps` を `AutoTabs` に渡します。同じ id を再度 `open` すると、下書きを残したままそのタブを選びます。固定タブは閉じられません。`ready` になるまで `open` しないでください。選択、`params`、`state` はマウント後に `sessionStorage` から戻ります。`beforeClose` が `false` または throw すると閉じません。例は [DynamicTabsDemo.tsx](../../../test-project/src/examples/DynamicTabsDemo.tsx) です。
