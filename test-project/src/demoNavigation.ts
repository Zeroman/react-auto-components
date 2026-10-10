/** Shared by the sidebar and page tabs so their destinations stay in sync. */
export interface DemoExample {
  id: string;
  label: string;
  /** Tooltip shown on the page tab; English source doubles as the i18n key. */
  tip?: string;
}

/** Schema mock owned by one component. Not appended to menus that omit it. */
const serverSchema: DemoExample = {
  id: "server",
  label: "mock.entry",
  tip: "The page renders from a server JSON schema.",
};

function permissions(page: string): DemoExample {
  return {
    id: "permissions",
    label: "Permissions",
    tip: `permissions.${page}.tip`,
  };
}

export const demoExamples: Record<string, readonly DemoExample[]> = {
  table: [
    {
      id: "local",
      label: "Local Data",
      tip: "Add, edit, delete and select rows entirely in local state — no server required.",
    },
    {
      id: "server",
      label: "mock.entry",
      tip: "One mock server. Choose whether it only runs the query, or also sends the columns, search fields, and edit permission.",
    },
    {
      id: "large",
      label: "Massive data",
      tip: "100,000 rows with heavily repeated values stay smooth through row virtualization; scroll, sort, and filter without jank.",
    },
    {
      id: "tree",
      label: "Tree Table",
      tip: "Rows expand into child rows through a getChildren hierarchy.",
    },
    {
      id: "expanded",
      label: "Expandable Rows",
      tip: "Detail panels join virtual height measurement so scrolling stays correct.",
    },
    {
      id: "auto-height",
      label: "Remaining Height",
      tip: "The table fills the viewport height left over by the page layout.",
    },
    permissions("table"),
  ],
  form: [
    {
      id: "component",
      label: "form.own",
      tip: "form.own.tip",
    },
    serverSchema,
    permissions("form"),
  ],
  search: [
    {
      id: "instant",
      label: "Instant Search",
      tip: "Results update as you type or select a value. Reset restores all results.",
    },
    {
      id: "manual",
      label: "Manual Search",
      tip: "Edit criteria, then click Search to apply them.",
    },
    {
      id: "advanced",
      label: "Cross-field & Multi-select",
      tip: "Search project name, owner or region together, and combine multiple statuses.",
    },
    {
      id: "remote",
      label: "RSQL query",
      tip: "The query AST is serialized to RSQL and sent to a mock source for server-side filtering.",
    },
    serverSchema,
    permissions("search"),
  ],
  dialog: [
    {
      id: "component",
      label: "dialog.own",
      tip: "dialog.own.tip",
    },
    serverSchema,
    permissions("dialog"),
  ],
  tabs: [
    {
      id: "basic",
      label: "Basic",
      tip: "Horizontal and vertical tab layouts with preserved panel state.",
    },
    {
      id: "overflow",
      label: "Overflow scrolling",
      tip: "When tabs exceed the row width, edge scroll buttons appear and the active tab scrolls into view.",
    },
    {
      id: "equal",
      label: "Equal width",
    },
    {
      id: "dynamic",
      label: "Dynamic tabs",
      tip: "Open, close and reorder tabs at runtime, workspace style.",
    },
    {
      id: "access",
      label: "Tab features",
      tip: "Mounting modes, hidden and closable tabs, nested groups, icons and role-gated tabs.",
    },
    {
      id: "focus",
      label: "Focus & Autofocus",
      tip: "Independent AutoFocus entries, visibility, selectors, and nested tabs.",
    },
    serverSchema,
    permissions("tabs"),
  ],
  menu: [
    {
      id: "component",
      label: "menu.own",
      tip: "menu.own.tip",
    },
    serverSchema,
    permissions("menu"),
  ],
  chat: [
    {
      id: "conversation",
      label: "Conversation",
      tip: "Streaming replies, stop, retry and anchored history loading.",
    },
    {
      id: "performance",
      label: "Large history",
      tip: "Tens of thousands of variable-height messages stay responsive via virtualization.",
    },
    {
      id: "rendering",
      label: "Rendering",
      tip: "Caller-owned message renderers: markdown, cards and custom actions.",
    },
    {
      id: "layouts",
      label: "Message layout",
      tip: "Avatars, grouping, alignment and spacing variants for message lists.",
    },
    {
      id: "hooks",
      label: "Hooks",
      tip: "Compose chat behavior through hooks with your own message pipeline.",
    },
    {
      id: "edges",
      label: "Edge states",
      tip: "Empty, loading, error and offline states with retry actions.",
    },
    serverSchema,
    permissions("chat"),
  ],
};

/** Examples listed under one sidebar menu. Unknown pages get none. */
export function examplesFor(page: string): readonly DemoExample[] {
  return demoExamples[page] ?? [];
}
