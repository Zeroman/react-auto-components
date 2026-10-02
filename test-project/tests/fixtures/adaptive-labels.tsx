import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AutoConfigProvider,
  AutoForm,
  AutoSearch,
  type Field,
} from "@zeroman.yang/react-auto-components";
const longFields: Field<{ name: string }>[] = [
  {
    name: "name",
    label: "Full organization name and the approver contact for this project",
  },
];
const translatedFields: Field<{ name: string }>[] = [
  { name: "name", lang: "name", label: "Name" },
];
function TranslationForm() {
  const [long, setLong] = useState(false);
  return (
    <section data-testid="translated-labels">
      <button onClick={() => setLong((v) => !v)}>Switch label language</button>
      <AutoConfigProvider
        config={{ t: () => (long ? "Translated project name" : "Name") }}
      >
        <AutoForm
          columns={1}
          fields={translatedFields}
          labelPosition="left"
          labelWidth="auto"
        />
      </AutoConfigProvider>
    </section>
  );
}
export function mount() {
  document.getElementById("root")!.style.display = "none";
  const node = document.createElement("div");
  node.style.cssText =
    "position:fixed;inset:0;overflow:auto;z-index:9999;background:white";
  document.body.append(node);
  createRoot(node).render(
    <div style={{ width: 320 }}>
      <section data-testid="auto-long-form">
        <AutoForm
          columns={1}
          fields={longFields}
          labelPosition="left"
          labelWidth="auto"
        />
      </section>
      <section data-testid="auto-long-search">
        <AutoSearch
          columns={1}
          fields={longFields}
          labelPosition="left"
          labelWidth="auto"
          onSearch={() => {}}
        />
      </section>
      <section data-testid="fixed-long-search">
        <AutoSearch
          columns={1}
          fields={longFields}
          labelPosition="left"
          labelWidth={80}
          onSearch={() => {}}
        />
      </section>
      <TranslationForm />
    </div>,
  );
}
