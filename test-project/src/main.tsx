import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DemoLanguageProvider } from "./DemoLanguage";
import { App } from "./App";
import "@zeroman.yang/react-auto-components/style.css";
import "./styles.css";
if (import.meta.env.DEV) void import("./racDevtoolsClient");
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DemoLanguageProvider>
      <App />
    </DemoLanguageProvider>
  </StrictMode>,
);
