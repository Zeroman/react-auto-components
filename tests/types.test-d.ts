import type { Field, AutoTableProps } from "../src";
type Model = { count: number; name: string };
const good: Field<Model> = { name: "count", defaultValue: 1 };
// @ts-expect-error default values follow the field type
const bad: Field<Model> = { name: "count", defaultValue: "wrong" };
// @ts-expect-error fields must exist on the model
const missing: Field<Model> = { name: "missing" };
// @ts-expect-error local data and remote source cannot both own rows
const owners: AutoTableProps<Model> = {
  id: "x",
  rowKey: "name",
  data: [],
  dataSource: async () => ({ rows: [], total: 0 }),
};
void good;
void bad;
void missing;
void owners;

import type { AutoChatMessage, AutoChatProps } from "../src";
interface ToolMessage extends AutoChatMessage {
  result: number;
}
const chat: AutoChatProps<ToolMessage> = {
  messages: [{ id: "tool-1", role: "tool", result: 42 }],
  renderMessage: (message) => message.result,
};
// @ts-expect-error message IDs are required for stable streaming and history anchoring
const invalidChatMessage: AutoChatMessage = { role: "user", content: "hello" };
// @ts-expect-error transport-specific roles must be normalized by the host
const invalidChatRole: AutoChatMessage = { id: "x", role: "function" };
void chat;
void invalidChatMessage;
void invalidChatRole;
