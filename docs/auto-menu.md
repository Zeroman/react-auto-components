# AutoMenu

**English** | [简体中文](i18n/zh-CN/auto-menu.md) | [繁體中文](i18n/zh-TW/auto-menu.md) | [日本語](i18n/ja/auto-menu.md) | [한국어](i18n/ko/auto-menu.md) | [Español](i18n/es/auto-menu.md) | [Français](i18n/fr/auto-menu.md) | [Deutsch](i18n/de/auto-menu.md) | [Português (Brasil)](i18n/pt-BR/auto-menu.md) | [Русский](i18n/ru/auto-menu.md)

Sidebar. Items can nest, collapse to an icon rail, and carry an icon, description, and badge. It is navigation, not a tab panel. Use [AutoTabs](auto-tabs.md) for panels.

## Usage

```tsx
import { AutoMenu } from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

<AutoMenu
  label="Main"
  items={[
    { id: "inbox", label: "Inbox" },
    {
      id: "settings",
      label: "Settings",
      children: [{ id: "profile", label: "Profile" }],
    },
  ]}
  onChange={(id) => navigate(id)}
/>
```

## Behavior and props

| Prop | Behavior |
| --- | --- |
| `items` | `id` must be unique in the tree. `hidden` and a failed `canAccess` drop the item. A `children` list that points at an ancestor is dropped so a bad schema cannot recurse. |
| `value` | Controlled selected leaf id. Omit it to keep selection internally. |
| `defaultValue` | Uncontrolled initial leaf. If it does not match a leaf, the first enabled leaf is selected. |
| `onChange(id, item, path)` | **Not caught.** `path` is the id chain from the root to the leaf. A parent with children toggles expansion instead of selecting. |
| `collapsible` | Default `false`. When `true`, a button toggles the icon rail. |
| `collapsed` | Controlled rail. Omit it to use `defaultCollapsed` (default `false`). |
| `onCollapsedChange` | **Not caught.** Called with the next boolean. If `collapsed` is controlled, update it yourself or the rail will not move. |
| `disabled` | Disables the item and its descendants. Disabled items are skipped by selection. |
| `label` | Group title, also the nav accessible name. |
| `header`, `footer` | Slots above and below the list. |
| `size`, `density` | Override the provider. The menu reads `config.menu`, then the global size and density. |

Keyboard movement stays inside the menu. Selecting a leaf does not navigate by itself; `onChange` is the only signal.

## Preconditions

Import `style.css` once (`RAC-CSS-MISSING` in development). `AutoConfigProvider` is optional. Permissions use `config.canAccess`.
