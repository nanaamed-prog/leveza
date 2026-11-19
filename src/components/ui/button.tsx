import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-button font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 min-h-11 select-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-forest text-white hover:bg-forest-hover",
        accent: "bg-orange text-ink hover:brightness-95",
        secondary: "bg-sage-soft text-forest hover:bg-sage/60",
        outline: "border border-line bg-card text-ink hover:bg-canvas",
        ghost: "text-forest hover:bg-sage-soft",
        danger: "bg-error text-white hover:brightness-95",
      },
      size: {
        sm: "px-3 text-sm min-h-10",
        md: "px-4 text-[0.95rem]",
        lg: "px-5 text-base min-h-12",
        icon: "size-11 p-0",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, asChild, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...(asChild ? {} : { type: type ?? "button" })}
      {...props}
    />
  );
});

export { buttonVariants };
