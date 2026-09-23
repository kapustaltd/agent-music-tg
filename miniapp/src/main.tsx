import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { getColorScheme } from "./lib/telegram";
import "./styles/fonts.css";

import "./styles/glass.css";
import "./styles/generated-playlist.css";
import "./styles/anti-slop.css";
import "./styles/generation-loading.css";
import "./styles/clarify-flow.css";
import "./styles/artist-screen.css";

const storedScheme = typeof localStorage !== "undefined" ? localStorage.getItem("miniapp-scheme") : null;
document.documentElement.setAttribute(
  "data-scheme",
  storedScheme === "light" || storedScheme === "dark" ? storedScheme : getColorScheme(),
);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
