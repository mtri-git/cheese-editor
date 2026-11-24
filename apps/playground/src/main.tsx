import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "cheese-editor/styles.css";
import "cheese-editor/prose.css";

import { App } from "./App";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
