# AutoFocus

**English** | [简体中文](i18n/zh-CN/auto-focus.md)

Declare an automatic entry anywhere in the page. No provider, tab integration or router is required.

```tsx
import { AutoFocus } from "@zeroman.yang/react-auto-components";

<AutoFocus>
  <input aria-label="Name" />
  <input aria-label="Email" />
</AutoFocus>

<AutoFocus target="textarea">
  <button>Toolbar</button>
  <textarea aria-label="Editor" />
</AutoFocus>
```

## Behavior and props

| Prop | Behavior |
| --- | --- |
| `children` | Optional content. AutoFocus renders a `div` with `display: contents`, which adds no layout box. By default it selects the first visible, enabled, focusable descendant in DOM order. |
| `target` | Optional CSS selector scoped to the wrapper, or `{ current: HTMLElement \| null }` DOM ref. A ref can target an element elsewhere and can be used without children. Selector matches are checked in DOM order. Invalid selectors throw `RAC-FOCUS-TARGET` with a repair hint. |
| `disabled` | Default `false`. Excludes this registration without unmounting its children. |

Default discovery skips negative `tabindex` values, including programmatically focusable scroll containers. An explicit `target` selector or ref may select them.

There is one registration list per document. The last registered instance with an eligible target wins. Registration order stays stable across ordinary rerenders; an unmounted instance that mounts again joins the end. Multiple entries are normal and do not report conflicts. AutoFocus does not manage nesting: ancestor visibility determines whether a target is eligible.

Resolution is batched into an animation frame. Only a change of winning DOM element moves focus, using `preventScroll`. An unchanged winner does not reclaim focus after the user clicks or tabs to another control. Changing registration priority to another instance pointing to the same DOM element does not refocus it. No previous editor or cursor position is stored.

## Visibility and lifecycle

Disconnected, disabled, inert or hidden targets are excluded, including disabled fieldsets, hidden ancestors and closed details. `visibility: hidden`, `display: none` and hidden content visibility are excluded. Transparent, offscreen or covered elements are not treated as hidden; scrolling does not select a new winner. AutoFocus is not a focus trap and does not decide modal ownership.

DOM changes within a declaration or its external ref target, ancestor attribute changes, target resize, window resize, stylesheet changes/load and transition/animation completion trigger a new check. Unchanged rerenders and unrelated DOM mutations do not rescan entries; each affected entry shares one candidate scan between resolution and resize observation. This covers cached panel visibility changes, conditional content and asynchronously mounted editors. Direct CSSOM edits, or CSS depending on unrelated siblings (for example `:has()`), need a resize or transition notification to trigger a check. The observers and scheduled work are released when the last instance unmounts.

A newly available later entry takes focus even if the user was editing another control. Use `disabled` to exclude entries when that behavior is unwanted. Hiding or removing the winner lets the last remaining eligible entry take focus; if none remain, AutoFocus does not choose an unrelated element.

## Tabs

Place AutoFocus in the panel content. Tabs only select, show and retain panels. On return, the entry is selected again; edits can remain cached, but historical focus is not restored. Mouse, Enter/Space activation and programmatic switches follow the same rule. Arrow keys only move focus between tab labels; they do not switch panels or activate AutoFocus. See [AutoTabs](auto-tabs.md) and [migration](migration.md#automatic-focus).
