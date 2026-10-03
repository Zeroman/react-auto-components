import { ServerTableDemo } from "./mock/ServerTableDemo";
import { ServerFormDemo } from "./mock/ServerFormDemo";
import { ServerSearchDemo } from "./mock/ServerSearchDemo";
import { ServerDialogDemo } from "./mock/ServerDialogDemo";
import { ServerTabsDemo } from "./mock/ServerTabsDemo";
import { ServerMenuDemo } from "./mock/ServerMenuDemo";
import { ServerChatDemo } from "./mock/ServerChatDemo";

export function ServerDrivenDemo({ component }: { component: string }) {
  const Demo = {
    table: ServerTableDemo,
    form: ServerFormDemo,
    search: ServerSearchDemo,
    dialog: ServerDialogDemo,
    tabs: ServerTabsDemo,
    menu: ServerMenuDemo,
    chat: ServerChatDemo,
  }[component];
  return Demo ? <Demo key={component} /> : null;
}
