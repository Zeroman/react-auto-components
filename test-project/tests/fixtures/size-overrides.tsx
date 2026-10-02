import { createRoot } from "react-dom/client";
import {
  AutoForm,
  AutoTabs,
  AutoTable,
} from "@zeroman.yang/react-auto-components";
export function mount() {
  const node = document.createElement("div");
  node.style.cssText =
    "position:fixed;inset:0;overflow:auto;z-index:9999;background:white";
  document.body.append(node);
  createRoot(node).render(
    <>
      {(["small", "medium"] as const).map((size) => (
        <div key={size}>
          <AutoForm
            size={size}
            fields={[{ name: "name", label: `baseline-${size}` }]}
          />
          <AutoTabs
            size="large"
            items={[
              {
                id: "outer",
                label: `outer-${size}`,
                content: (
                  <AutoForm
                    size={size}
                    fields={[{ name: "name", label: `nested-${size}` }]}
                  />
                ),
              },
            ]}
          />
        </div>
      ))}
      {(["small", "medium", "large"] as const).map((size) => (
        <AutoTable
          key={`table-${size}`}
          id={`sizing-${size}`}
          size={size}
          density="compact"
          virtual={false}
          rowKey="id"
          data={[{ id: "1", name: "One row" }]}
          columns={[{ key: "name", label: "Name" }]}
          pagination={false}
        />
      ))}
    </>,
  );
}
