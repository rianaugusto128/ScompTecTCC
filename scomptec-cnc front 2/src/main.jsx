import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

// O build do Electron usa scomptec://app. HashRouter mantém a rota no hash e
// evita que um recarregamento tente encontrar, por exemplo, /maquinas no disco.
const Router = ["file:", "scomptec:"].includes(window.location.protocol) ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>
);
