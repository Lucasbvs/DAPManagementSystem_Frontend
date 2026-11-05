import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/700.css";
import "@fontsource/lora/400.css";
import "./styles/index.css";
import { App } from "./app/App";
function Root() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target;
      if (target instanceof HTMLInputElement && target.type === "number")
        target.blur();
    };
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);
  return <App />;
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
