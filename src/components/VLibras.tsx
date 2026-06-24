import { useEffect } from "react";

declare global {
  interface Window {
    VLibras?: { Widget: new (url: string) => unknown };
  }
}

export function VLibras() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("vlibras-script")) return;

    const script = document.createElement("script");
    script.id = "vlibras-script";
    script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
    script.async = true;
    script.onload = () => {
      try {
        new window.VLibras!.Widget("https://vlibras.gov.br/app");
      } catch (e) {
        console.warn("VLibras failed to init", e);
      }
    };
    document.body.appendChild(script);
  }, []);

  return (
    <div
      className="enabled"
      ref={(el) => {
        if (!el) return;
        el.setAttribute("vw", "true");
        const btn = el.querySelector("[data-vw-access]");
        btn?.setAttribute("vw-access-button", "true");
        const wrap = el.querySelector("[data-vw-wrapper]");
        wrap?.setAttribute("vw-plugin-wrapper", "true");
      }}
    >
      <div data-vw-access className="active"></div>
      <div data-vw-wrapper>
        <div className="vw-plugin-top-wrapper"></div>
      </div>
    </div>
  );
}
