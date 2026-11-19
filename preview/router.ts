// Roteador em memória para a prévia de arquivo único (sem URL, funciona em iframes isolados).
import { useSyncExternalStore } from "react";

type State = { path: string; search: string; stack: string[] };
let state: State = { path: "/", search: "", stack: [] };
const listeners = new Set<() => void>();

function parse(href: string) {
  const [p = "/", q = ""] = href.split("?");
  const path = p.replace(/\/$/, "") || "/";
  return { path, search: q };
}

export function navigate(href: string, mode: "push" | "replace" = "push") {
  if (/^https?:/.test(href)) {
    window.open(href, "_blank");
    return;
  }
  const next = parse(href);
  const stack =
    mode === "push"
      ? [...state.stack, state.path + (state.search ? "?" + state.search : "")]
      : state.stack;
  state = { ...next, stack };
  listeners.forEach((l) => l());
  try {
    window.scrollTo(0, 0);
  } catch {
    /* ignore */
  }
}

export function back() {
  const prev = state.stack[state.stack.length - 1];
  if (!prev) return;
  const p = parse(prev);
  state = { ...p, stack: state.stack.slice(0, -1) };
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useRoute(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}
