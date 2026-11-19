import { back, navigate, useRoute } from "./router";

export function useRouter() {
  return {
    push: (h: string) => navigate(h, "push"),
    replace: (h: string) => navigate(h, "replace"),
    back,
    refresh: () => {},
    prefetch: () => {},
  };
}

export function usePathname() {
  return useRoute().path;
}

export function useSearchParams() {
  return new URLSearchParams(useRoute().search);
}
