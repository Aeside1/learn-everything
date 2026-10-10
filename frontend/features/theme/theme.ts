export const THEME_STORAGE_KEY = "learn_everything_theme";
export const DARK_CLASS = "dark";
export const THEME_ATTRIBUTE = "data-theme";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export function readStoredTheme(storage: Pick<Storage, "getItem"> | null | undefined): Theme | null {
  if (!storage) return null;
  try {
    const value = storage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function readAppliedTheme(root: HTMLElement): ResolvedTheme {
  const attribute = root.getAttribute(THEME_ATTRIBUTE);
  if (attribute === "dark" || attribute === "light") return attribute;
  return root.classList.contains(DARK_CLASS) ? "dark" : "light";
}

export function storeTheme(storage: Pick<Storage, "setItem"> | null | undefined, theme: Theme): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // 存储不可用时仍允许当前会话切换主题
  }
}

export function resolveTheme(theme: Theme, prefersDark: boolean): ResolvedTheme {
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme;
}

export function applyTheme(root: HTMLElement, resolved: ResolvedTheme): void {
  root.classList.toggle(DARK_CLASS, resolved === "dark");
  root.setAttribute(THEME_ATTRIBUTE, resolved);
  root.style.colorScheme = resolved;
}

export function themeInitScript(): string {
  const key = JSON.stringify(THEME_STORAGE_KEY);
  const darkClass = JSON.stringify(DARK_CLASS);
  const attribute = JSON.stringify(THEME_ATTRIBUTE);
  return `(function(){try{var stored=localStorage.getItem(${key});var theme=stored==="dark"||stored==="light"||stored==="system"?stored:"light";var resolved=theme==="dark"||(theme==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light";var root=document.documentElement;if(resolved==="dark"){root.classList.add(${darkClass});}else{root.classList.remove(${darkClass});}root.setAttribute(${attribute},resolved);root.style.colorScheme=resolved;}catch(_){}})();`;
}
