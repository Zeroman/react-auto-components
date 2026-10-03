/** Shared by the sidebar and page tabs so their destinations stay in sync. */
export const demoExamples: Record<
  string,
  readonly (readonly [string, string])[]
> = {
  table: [
    ["local", "Local Data"],
    ["remote", "Server-side"],
    ["large", "10,000 rows of data"],
    ["advanced", "Tree & Expansion"],
    ["auto-height", "Remaining Height"],
  ],
  search: [
    ["instant", "Instant Search"],
    ["manual", "Manual Search"],
    ["advanced", "Cross-field & Multi-select"],
    ["remote", "Server-side"],
  ],
  tabs: [
    ["basic", "Basic"],
    ["dynamic", "Dynamic tabs"],
    ["access", "Access control"],
  ],
  chat: [
    ["conversation", "Conversation"],
    ["performance", "Large history"],
    ["rendering", "Rendering"],
    ["layouts", "Message layout"],
    ["hooks", "Hooks"],
    ["edges", "Edge states"],
  ],
};

export function examplesFor(page: string) {
  return [
    ...(demoExamples[page] ?? [["component", "mock.examples"]]),
    ["server", "mock.entry"],
  ] as readonly (readonly [string, string])[];
}
