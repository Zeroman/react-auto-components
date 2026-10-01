import { createRoot } from "react-dom/client";
import { AutoTable } from "@zeroman/react-auto-components";

export function mount() {
  const node = document.createElement("div");
  node.style.cssText =
    "position:fixed;inset:0;overflow:auto;z-index:9999;background:white";
  document.body.append(node);
  createRoot(node).render(
    <AutoTable
      id="fixed-height-fixture"
      rowKey="id"
      height={440}
      columns={[{ key: "id", label: "ID" }]}
      data={Array.from({ length: 100 }, (_, id) => ({ id }))}
    />,
  );
}
