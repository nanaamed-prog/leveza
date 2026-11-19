import { forwardRef, type AnchorHTMLAttributes } from "react";
import { navigate } from "./router";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  prefetch?: boolean;
  replace?: boolean;
};

const Link = forwardRef<HTMLAnchorElement, Props>(function Link(
  { href, onClick, prefetch: _p, replace, target: _t, ...rest },
  ref,
) {
  void _p;
  void _t;
  return (
    <a
      ref={ref}
      href={"#"}
      data-href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        navigate(href, replace ? "replace" : "push");
      }}
      {...rest}
    />
  );
});

export default Link;
