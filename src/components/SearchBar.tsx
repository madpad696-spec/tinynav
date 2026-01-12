import { motion, useReducedMotion } from "framer-motion";
import { Search, X } from "lucide-react";

export function SearchBar({
  value,
  onChange,
  placeholder = "搜索标题/描述/URL…"
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="glass flex items-center gap-2 rounded-2xl px-4 py-3 shadow-[0_18px_44px_rgba(0,0,0,.10)]"
      layout
      transition={reduceMotion ? { duration: 0.12 } : { type: "spring", stiffness: 420, damping: 34 }}
    >
      <Search size={18} className="text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none text-sm placeholder:text-muted/80"
      />
      {value ? (
        <button
          aria-label="Clear"
          className="text-muted hover:text-fg transition-colors"
          onClick={() => onChange("")}
        >
          <X size={18} />
        </button>
      ) : null}
    </motion.div>
  );
}

