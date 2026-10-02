# AutoTabs

**English** | [简体中文](i18n/zh-CN/auto-tabs.md) | [繁體中文](i18n/zh-TW/auto-tabs.md) | [日本語](i18n/ja/auto-tabs.md) | [한국어](i18n/ko/auto-tabs.md) | [Español](i18n/es/auto-tabs.md) | [Français](i18n/fr/auto-tabs.md) | [Deutsch](i18n/de/auto-tabs.md) | [Português (Brasil)](i18n/pt-BR/auto-tabs.md) | [Русский](i18n/ru/auto-tabs.md)

Tab list. Nested tabs are another `AutoTabs` fed by `children`, not a menu. Use [AutoMenu](auto-menu.md) for a sidebar.

## Usage

```tsx
import { AutoTabs } from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

<AutoTabs
  items={[
    { id: "one", label: "One", content: <p>First</p> },
    { id: "two", label: "Two", content: <p>Second</p>, disabled: true },
  ]}
/>
```

## Behavior and props

| Prop | Behavior |
| --- | --- |
| `items` | Each tab needs a stable `id`. `hidden` (boolean or function) and a failed `canAccess` remove the tab. |
| `value` | Controlled path of ids from the root. Nested selection is `["parent", "child"]`. |
| `defaultValue` | Uncontrolled initial path. |
| `onChange(path, item)` | **Not caught.** If it throws, React reports the error and the last committed path stays when the component is controlled by you. |
| `mode` | Default `"horizontal"`. `"vertical"` stacks the tab list. |
| `keepMounted` | Default `true`: inactive panels stay mounted and keep local state. `false` unmounts them. |
| `onRefresh` | When set, a refresh button is rendered for that tab. **Not caught.** |
| `loading` | Appends an ellipsis to the tab label. It does not block selection. |
| `size`, `density` | Override the provider. Tabs read `config.tabs`, then `config.density` / `config.size`. |
| `disabled` | The tab stays visible and cannot be selected. The default selection skips disabled tabs. |
| `closable` | With `onClose`, the tab shows a close button. Delete on the focused tab requests the same close. |
| `onClose(path, item)` | Asks the owner to remove the tab. **Not caught.** Nested groups pass the full path. The owner updates `items`. |
| `lazy` | Default `false`. `true` mounts a panel on its first visit. |

A nested `children` list replaces `content` for that tab. `defaultActive` is the nested uncontrolled id.

## Dynamic tabs

`useAutoTabsWorkspace` keeps a flat set of pages without a router. Spread `tabsProps` onto `AutoTabs`. `open` adds a page, or activates one that is already open and keeps its draft.

```tsx
import {
  AutoTabs,
  useAutoTabsWorkspace,
} from "@zeroman.yang/react-auto-components";

const pages = {
  home: { title: "Home", render: () => <p>Pinned</p> },
  order: {
    title: "Order",
    render: ({ tab, setState }) => (
      <input
        aria-label="Draft"
        value={typeof tab.state === "string" ? tab.state : ""}
        onChange={(event) => setState(event.target.value)}
      />
    ),
  },
};

export function Orders() {
  const workspace = useAutoTabsWorkspace({
    workspaceId: "orders",
    pages,
    defaultTabs: [{ id: "home", page: "home", pinned: true }],
  });
  return (
    <>
      <button
        type="button"
        disabled={!workspace.ready}
        onClick={() =>
          workspace.open({
            id: "order:1",
            page: "order",
            title: "Order 1",
            params: { orderId: "1" },
          })
        }
      >
        Open order
      </button>
      {workspace.ready && <AutoTabs {...workspace.tabsProps} />}
    </>
  );
}
```

A pinned tab has no close button. Closing the active tab selects the next enabled neighbor. `beforeClose` returning `false`, or throwing, cancels the close. A throw from the close button is shown with `config.notify`. Tabs, the selection, `params`, and `state` are restored from `sessionStorage` after mount. Wait for `ready` before calling `open`. `storage: false` keeps the workspace in memory. `"local"` or a storage adapter chooses another store. The key is `${namespace}:tabs:${workspaceId}`.

`tabsProps` sets `lazy` and `keepMounted`, so a panel mounts on its first visit and then stays mounted. The component does not remove a tab by itself. `onClose` asks the workspace to remove it.

## Preconditions

Import `style.css` once (`RAC-CSS-MISSING` in development). `AutoConfigProvider` is optional.
