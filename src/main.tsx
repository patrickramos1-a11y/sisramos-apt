import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply theme immediately before React renders to prevent flash
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (savedTheme === "system") {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    root.classList.add(systemTheme);
  } else {
    root.classList.add(savedTheme);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
