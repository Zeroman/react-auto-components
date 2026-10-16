import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AutoDialogProvider,
  AutoSearch,
  useAutoDialog,
} from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";

function Search() {
  const [result, setResult] = useState("");
  return (
    <>
      <AutoSearch<{ owner?: string }>
        mode="manual"
        moreLayout="popover"
        fields={[
          {
            name: "owner",
            label: "Owner",
            required: true,
            search: { more: true },
          },
        ]}
        onSearch={(_, values) => setResult(values.owner ?? "")}
      />
      <output data-testid="search-result">{result}</output>
    </>
  );
}
function Fixture() {
  const dialog = useAutoDialog();
  return (
    <button
      type="button"
      onClick={() =>
        dialog.open({
          title: "Search dialog",
          content: <Search />,
          hideFooter: true,
        })
      }
    >
      Open modal
    </button>
  );
}
createRoot(document.getElementById("root")!).render(
  <AutoDialogProvider>
    <Fixture />
  </AutoDialogProvider>,
);
