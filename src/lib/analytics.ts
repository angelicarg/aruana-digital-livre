declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type EventName =
  | "page_view"
  | "click_link"
  | "click_cta"
  | "form_start"
  | "form_field_focus"
  | "form_field_error"
  | "form_submit"
  | "scroll_depth"
  | "time_on_page"
  | "click_whatsapp"
  | "open_simulator"
  | "generate_lead"
  | "view_case_study";

export interface EventParams {
  [key: string]: string | number | boolean | undefined | null;
}

export function trackEvent(event: EventName, params: EventParams = {}) {
  if (typeof window === "undefined" || !window.dataLayer) return;

  // Usar dataLayer.push() com formato correto para GA4/GTM
  window.dataLayer.push({
    event,
    timestamp: new Date().toISOString(),
    ...params,
  });

  // Também chamar gtag() diretamente se disponível (redundância para garantir)
  if (typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }
}

export function setupAnalytics() {
  if (typeof window === "undefined") return;

  // Track page view
  trackEvent("page_view", {
    page_path: window.location.pathname,
    page_title: document.title,
  });

  // Track scroll depth
  let maxScroll = 0;
  function onScroll() {
    const scrollPercent = Math.round(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    );
    if (scrollPercent > maxScroll && scrollPercent % 20 === 0) {
      maxScroll = scrollPercent;
      trackEvent("scroll_depth", { depth_percent: scrollPercent });
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  // Track time on page (every 15 seconds)
  let timeSpent = 0;
  const timeInterval = setInterval(() => {
    timeSpent += 15;
    if (timeSpent % 60 === 0) {
      trackEvent("time_on_page", { seconds: timeSpent });
    }
  }, 15000);

  return () => {
    window.removeEventListener("scroll", onScroll);
    clearInterval(timeInterval);
  };
}

// Track all external and internal link clicks (auto-instrumentation)
export function setupLinkTracking() {
  if (typeof document === "undefined") return;

  document.addEventListener("click", (e) => {
    const target = (e.target as Element)?.closest("a");
    if (!target) return;

    const href = target.getAttribute("href");
    const text = target.textContent?.trim().slice(0, 50) || "unknown";
    const isExternal = href?.startsWith("http") && !href?.includes(window.location.hostname);

    trackEvent("click_link", {
      href,
      text,
      link_type: isExternal ? "external" : "internal",
    });
  });
}
