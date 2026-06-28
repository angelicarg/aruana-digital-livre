import { useEffect, useRef } from "react";

declare global {
  interface Window {
    VLibras?: { Widget: new (url: string) => unknown };
  }
}

export function VLibras() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Injetar HTML do VLibras diretamente
    if (ref.current) {
      ref.current.innerHTML = `
        <div vw="true" class="enabled">
          <div vw-access-button="true" class="active"></div>
          <div vw-plugin-wrapper="true">
            <div class="vw-plugin-top-wrapper"></div>
          </div>
        </div>
      `;
    }

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

  return <div ref={ref} />;
}