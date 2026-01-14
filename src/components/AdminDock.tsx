import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { Cog, LayoutGrid, Minus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./Button";

export type AdminDockTab = "nav" | "settings";

function useHoverCapability() {
  const [hoverCapable, setHoverCapable] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setHoverCapable(!!mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return hoverCapable;
}

export function AdminDock({
  activeTab,
  onChangeTab,
  hoverDelayMs = 520,
  hideDelayMs = 1000
}: {
  activeTab: AdminDockTab;
  onChangeTab: (tab: AdminDockTab) => void;
  hoverDelayMs?: number;
  hideDelayMs?: number;
}) {
  const reduceMotion = useReducedMotion();
  const hoverCapable = useHoverCapability();

  const tabs = useMemo(
    () =>
      [
        { key: "nav" as const, label: "导航" },
        { key: "settings" as const, label: "站点" }
      ] as const,
    []
  );

  const [expanded, setExpanded] = useState(!hoverCapable);
  const [hoveredIndex, setHoveredIndex] = useState(0);
  const [tabW, setTabW] = useState(140);
  const [tabStride, setTabStride] = useState(148);
  const [navIconTick, setNavIconTick] = useState(0);
  const [settingsIconTick, setSettingsIconTick] = useState(0);
  const [handleHidden, setHandleHidden] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const lastPointerY = useRef<number | null>(null);
  const pointerOverDock = useRef(false);
  const inBottomHotZone = useRef(false);

  const activeIndex = activeTab === "settings" ? 1 : 0;

  useEffect(() => {
    setHoveredIndex(activeIndex);
  }, [activeIndex]);

  useEffect(() => {
    setHandleHidden(expanded);
  }, [expanded]);

  useEffect(() => {
    if (!panelRef.current) return;
    const el = panelRef.current;
    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      const paddingPx = 6; // p-1.5
      const gapPx = 8; // gap-2
      const inner = Math.max(0, w - paddingPx * 2);
      const nextW = Math.max(120, (inner - gapPx) / 2);
      setTabW(nextW);
      setTabStride(nextW + gapPx);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Slider motion
  const x = useMotionValue(activeIndex * tabStride);
  useEffect(() => {
    x.set(activeIndex * tabStride);
  }, [activeIndex, tabStride, x]);

  const highlightX = useTransform(x, [0, tabStride], ["22%", "78%"]);
  const hoveringOpacity = useTransform(x, () => (hoveredIndex !== activeIndex ? 0.95 : 1));

  function clearTimers() {
    if (hoverTimer.current != null) window.clearTimeout(hoverTimer.current);
    if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
    hoverTimer.current = null;
    hideTimer.current = null;
  }

  function scheduleShow() {
    if (!hoverCapable) return;
    clearTimers();
    hoverTimer.current = window.setTimeout(() => setExpanded(true), hoverDelayMs);
  }

  function scheduleHide() {
    if (!hoverCapable) return;
    clearTimers();
    hideTimer.current = window.setTimeout(() => setExpanded(false), hideDelayMs);
  }

  useEffect(() => {
    return () => clearTimers();
  }, []);

  useEffect(() => {
    if (!hoverCapable) return;
    const thresholdPx = 84;
    const onPointerMove = (e: PointerEvent) => {
      lastPointerY.current = e.clientY;
      if (pointerOverDock.current) return;
      const nearBottom = e.clientY >= window.innerHeight - thresholdPx;
      if (nearBottom && !inBottomHotZone.current) {
        inBottomHotZone.current = true;
        if (!expanded) scheduleShow();
        return;
      }
      if (!nearBottom && inBottomHotZone.current) {
        inBottomHotZone.current = false;
        if (expanded) scheduleHide();
      }
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [expanded, hoverCapable, hoverDelayMs, hideDelayMs]);

  useEffect(() => {
    if (!hoverCapable) return;
    if (!expanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded, hoverCapable]);

  function snapToIndex(idx: 0 | 1, velocity = 0) {
    setHoveredIndex(idx);
    const target = idx * tabStride;
    const nextTab = tabs[idx].key;
    const willChange = nextTab !== activeTab;
    if (reduceMotion) {
      x.set(target);
      if (willChange) {
        if (nextTab === "settings") setSettingsIconTick((t) => t + 1);
        if (nextTab === "nav") setNavIconTick((t) => t + 1);
      }
      onChangeTab(nextTab);
      return;
    }
    animate(x, target, { type: "spring", stiffness: 520, damping: 40, mass: 0.7, velocity });
    if (willChange) {
      if (nextTab === "settings") setSettingsIconTick((t) => t + 1);
      if (nextTab === "nav") setNavIconTick((t) => t + 1);
    }
    onChangeTab(nextTab);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[45] pointer-events-none">
      {/* Small handle, always visible */}
      <div className="pointer-events-auto mx-auto flex h-4 max-w-[420px] items-end justify-center pb-1">
        <button
          type="button"
          aria-label={expanded ? "Hide dock" : "Show dock"}
          onClick={() => {
            setExpanded((v) => !v);
          }}
          onPointerEnter={() => {
            if (!hoverCapable) return;
            setHandleHidden(true);
            scheduleShow();
          }}
          onPointerLeave={() => {
            if (!hoverCapable) return;
            if (!expanded) setHandleHidden(false);
          }}
          className={[
            "h-2 w-14 rounded-full bg-black/10 dark:bg-white/10",
            "transition-opacity duration-200",
            handleHidden ? "opacity-0" : "opacity-100"
          ].join(" ")}
        />
      </div>

      <AnimatePresence>
        {expanded ? (
          <motion.div
            key="dock"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, filter: "blur(6px)" }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, filter: "blur(6px)" }}
            transition={reduceMotion ? { duration: 0.12 } : { type: "spring", stiffness: 520, damping: 40 }}
            className="pointer-events-auto mx-auto mb-4 w-fit max-w-[92vw] rounded-full border border-white/14 bg-white/16 px-2 py-2 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-white/8 dark:shadow-[0_26px_90px_rgba(0,0,0,0.58)]"
            onPointerEnter={() => {
              pointerOverDock.current = true;
              scheduleShow();
            }}
            onPointerLeave={() => {
              pointerOverDock.current = false;
              const y = lastPointerY.current;
              const thresholdPx = 84;
              const nearBottom = typeof y === "number" ? y >= window.innerHeight - thresholdPx : false;
              if (!nearBottom) scheduleHide();
            }}
          >
            <div ref={panelRef} className="relative flex items-center gap-2 p-1.5">
              {/* Droplet slider */}
              <motion.div
                aria-hidden
                className="absolute left-1.5 top-1.5 z-0 h-10 rounded-full border border-white/20 bg-white/20 shadow-[0_10px_24px_rgba(0,0,0,0.12)] backdrop-blur-md dark:border-white/14 dark:bg-white/8"
                style={{ x, width: tabW, opacity: hoveringOpacity, ["--hlX" as any]: highlightX }}
              >
                <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(120px 46px at var(--hlX) 45%, rgba(255,255,255,0.22), rgba(255,255,255,0) 68%), linear-gradient(to bottom, rgba(255,255,255,0.10), rgba(255,255,255,0))"
                    }}
                  />
                </div>
              </motion.div>

              {/* Tabs */}
              {tabs.map((t, idx) => {
                const selected = idx === hoveredIndex;
                return (
                  <button
                    key={t.key}
                    type="button"
                    className={
                      "relative z-10 flex h-10 w-[140px] items-center justify-center gap-2 rounded-full px-3 text-sm font-medium " +
                      (selected ? "text-fg" : "text-fg/70 hover:text-fg")
                    }
                    style={{ width: tabW }}
                    onClick={() => snapToIndex(idx as 0 | 1, 0)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowLeft") {
                        e.preventDefault();
                        snapToIndex(0);
                      }
                      if (e.key === "ArrowRight") {
                        e.preventDefault();
                        snapToIndex(1);
                      }
                    }}
                  >
                    <span className="inline-flex h-4 w-4 items-center justify-center shrink-0 leading-none">
                      {t.key === "settings" ? (
                        <motion.span
                          key={`cog-${settingsIconTick}`}
                          className="[&>svg]:block [&>svg]:h-4 [&>svg]:w-4"
                          animate={
                            reduceMotion
                              ? undefined
                              : {
                                  rotate: activeTab === "settings" ? [0, 360] : 0
                                }
                          }
                          transition={reduceMotion ? undefined : { duration: 0.55, ease: "easeInOut" }}
                        >
                          <Cog size={16} />
                        </motion.span>
                      ) : (
                        <motion.span
                          key={`grid-${navIconTick}`}
                          className="[&>svg]:block [&>svg]:h-4 [&>svg]:w-4"
                          animate={
                            reduceMotion
                              ? undefined
                              : {
                                  scale: activeTab === "nav" ? [1, 1.14, 1] : 1
                                }
                          }
                          transition={reduceMotion ? undefined : { duration: 0.22, ease: "easeOut" }}
                        >
                          <LayoutGrid size={16} />
                        </motion.span>
                      )}
                    </span>
                    <span className="leading-none">{t.label}</span>
                  </button>
                );
              })}

              {/* Draggable pill overlay (on top of the droplet) */}
              <motion.div
                className="absolute left-1.5 top-1.5 z-20 h-10 rounded-full cursor-grab active:cursor-grabbing touch-none select-none"
                style={{ x, width: tabW }}
                drag="x"
                dragConstraints={{ left: 0, right: tabStride }}
                dragElastic={0.25}
                dragMomentum={false}
                onPointerDown={(e) => e.preventDefault()}
                onDrag={() => {
                  const idx = x.get() > tabStride / 2 ? 1 : 0;
                  if (idx !== hoveredIndex) setHoveredIndex(idx);
                }}
                onDragEnd={(_, info) => {
                  const current = x.get();
                  const projected = reduceMotion ? current : current + info.velocity.x * 0.2;
                  const idx = projected > tabStride / 2 ? 1 : 0;
                  snapToIndex(idx as 0 | 1, info.velocity.x);
                }}
                aria-label="Drag to switch tab"
                role="slider"
                aria-valuemin={0}
                aria-valuemax={1}
                aria-valuenow={hoveredIndex}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    snapToIndex(0);
                  }
                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    snapToIndex(1);
                  }
                }}
              />
            </div>
            {!hoverCapable ? (
              <div className="mt-2 flex justify-center">
                <Button
                  variant="ghost"
                  className="h-8 px-3 text-xs"
                  leftIcon={<Minus size={16} />}
                  onClick={() => setExpanded(false)}
                >
                  收起
                </Button>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
