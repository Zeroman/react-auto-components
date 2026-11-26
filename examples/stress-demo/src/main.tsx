import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  AutoConfigProvider,
  AutoDialogProvider,
} from "@zeroman.yang/react-auto-components";
import "@zeroman.yang/react-auto-components/style.css";
import { App } from "./App";
import "./styles.css";

/** No-op storage keeps stress runs deterministic across reloads. */
const storage = {
  get: () => undefined,
  set: () => {},
  remove: () => {},
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AutoConfigProvider config={{ storage, settings: undefined, namespace: "stress" }}>
      <AutoDialogProvider>
        <App />
      </AutoDialogProvider>
    </AutoConfigProvider>
  </StrictMode>,
);
