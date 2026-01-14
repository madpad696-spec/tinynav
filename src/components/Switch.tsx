import { motion, useReducedMotion } from "framer-motion";
import { clsx } from "clsx";

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={clsx(
        "relative inline-flex h-6 w-9 items-center rounded-full border p-px transition-colors " +
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 " +
          "focus-visible:ring-offset-bg disabled:opacity-50 disabled:pointer-events-none",
        checked ? "bg-emerald-500/90 border-[#e5e7eb] dark:border-[#21252d]" : "bg-white/10 dark:bg-white/8 border-[#e5e7eb] dark:border-[#21252d]",
        className
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className={clsx("flex h-full w-full items-center", checked ? "justify-end" : "justify-start")}>
        <motion.span
          layout
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-[0_8px_18px_rgba(0,0,0,.20)]"
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 36 }}
        />
      </div>
    </button>
  );
}
