import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

Element.prototype.scrollIntoView = () => undefined;

if (typeof globalThis.ResizeObserver === "undefined") {
  (globalThis as any).ResizeObserver = ObserverStub;
}
if (typeof globalThis.IntersectionObserver === "undefined") {
  (globalThis as any).IntersectionObserver = ObserverStub;
}

if (typeof window !== "undefined") {
  if (!window.CSS) {
    (window as any).CSS = {};
  }
  if (!window.CSS.escape) {
    window.CSS.escape = (s: string) => s;
  }
  if (!Element.prototype.getAnimations) {
    Element.prototype.getAnimations = () => [];
  }
  if (!window.matchMedia) {
    (window as any).matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    });
  }
}

afterEach(() => cleanup());
