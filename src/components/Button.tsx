import { clsx } from "clsx";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export function Button({
  variant = "secondary",
  size = "md",
  leftIcon,
  rightIcon,
  className,
  disabled,
  children,
  ...props
}: Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl2 px-4 font-medium " +
    "transition-[box-shadow,transform,background,border-color,opacity] select-none " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 " +
    "focus-visible:ring-offset-bg disabled:opacity-50 disabled:pointer-events-none";

  const sizes: Record<Size, string> = {
    sm: "h-9 text-sm",
    md: "h-10 text-sm",
    lg: "h-11 text-base"
  };

  const variants: Record<Variant, string> = {
    primary:
      "text-white border border-white/10 bg-gradient-to-b from-accent/90 to-accent/75 shadow-soft " +
      "hover:shadow-[0_14px_34px_rgba(0,0,0,.16)]",
    secondary:
      "glass text-fg hover:border-white/10 shadow-[0_10px_24px_rgba(0,0,0,.10)] " +
      "hover:shadow-[0_14px_34px_rgba(0,0,0,.14)]",
    ghost: "text-fg/80 hover:text-fg hover:bg-white/6 dark:hover:bg-white/8",
    danger:
      "text-white border border-white/10 bg-gradient-to-b from-danger/90 to-danger/70 shadow-soft " +
      "hover:shadow-[0_14px_34px_rgba(0,0,0,.16)]"
  };

  const whileHover = disabled || reduceMotion ? undefined : { y: -1 };
  const whileTap = disabled || reduceMotion ? undefined : { scale: 0.98, y: 0 };

  return (
    <motion.button
      type={props.type ?? "button"}
      whileHover={whileHover}
      whileTap={whileTap}
      className={clsx(base, sizes[size], variants[variant], className)}
      disabled={disabled}
      {...props}
    >
      {leftIcon ? <span className="inline-flex">{leftIcon}</span> : null}
      <span>{children}</span>
      {rightIcon ? <span className="inline-flex">{rightIcon}</span> : null}
    </motion.button>
  );
}
