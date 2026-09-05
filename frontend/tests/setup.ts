import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

Element.prototype.scrollIntoView = () => undefined;
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
}

afterEach(() => cleanup());
