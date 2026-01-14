import {
  closestCenter,
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronRight, GripVertical, Plus } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { LinkItem, Section } from "../../types";
import { Button } from "../Button";

const DEFAULT_SECTION_ID = "__default__";

type SectionKey = string; // real section id or "__default__"

type ActiveDrag =
  | { kind: "section"; sectionId: string }
  | { kind: "link"; linkId: string; fromSectionKey: SectionKey };

function sectionSortableId(sectionId: string) {
  return `section:${sectionId}`;
}
function linkSortableId(linkId: string) {
  return `link:${linkId}`;
}
function containerDroppableId(sectionKey: SectionKey) {
  return `container:${sectionKey}`;
}

function parseId(raw: string): { kind: "section" | "link" | "container"; id: string } | null {
  if (raw.startsWith("section:")) return { kind: "section", id: raw.slice("section:".length) };
  if (raw.startsWith("link:")) return { kind: "link", id: raw.slice("link:".length) };
  if (raw.startsWith("container:")) return { kind: "container", id: raw.slice("container:".length) };
  return null;
}

function removeAt<T>(arr: T[], index: number) {
  const next = arr.slice();
  next.splice(index, 1);
  return next;
}

function insertAt<T>(arr: T[], index: number, item: T) {
  const next = arr.slice();
  next.splice(Math.max(0, Math.min(arr.length, index)), 0, item);
  return next;
}

export function SectionedLinksPanel({
  groupId,
  groupName,
  sections,
  links,
  busy,
  onCreateSection,
  onEditSection,
  onDeleteSection,
  onCreateLink,
  onEditLink,
  onDeleteLink,
  onPersistReorder
}: {
  groupId: string;
  groupName: string;
  sections: Section[];
  links: LinkItem[];
  busy: boolean;
  onCreateSection: () => void;
  onEditSection: (section: Section) => void;
  onDeleteSection: (section: Section) => void;
  onCreateLink: (sectionId: string | null) => void;
  onEditLink: (link: LinkItem) => void;
  onDeleteLink: (link: LinkItem) => void;
  onPersistReorder: (payload: {
    sections: { id: string; order: number }[];
    links: { id: string; order: number; sectionId: string | null }[];
  }) => void | Promise<void>;
}) {
  const reduceMotion = useReducedMotion();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const collisionDetection: CollisionDetection = (args) => {
    const activeId = String(args.active.id);
    if (activeId.startsWith("section:")) {
      const droppableContainers = args.droppableContainers.filter((c) => String(c.id).startsWith("section:"));
      return closestCenter({ ...args, droppableContainers });
    }
    return closestCorners(args);
  };

  const realSections = useMemo(
    () => (sections ?? []).filter((s) => s.groupId === groupId).slice().sort((a, b) => a.order - b.order),
    [sections, groupId]
  );

  const sectionKeyList = useMemo(() => [...realSections.map((s) => s.id), DEFAULT_SECTION_ID], [realSections]);
  const sectionKeyToTitle = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of realSections) m.set(s.id, s.name);
    m.set(DEFAULT_SECTION_ID, "未分组");
    return m;
  }, [realSections]);

  const linkById = useMemo(() => new Map(links.map((l) => [l.id, l] as const)), [links]);
  const linkIdsBySectionFromProps = useMemo(() => {
    const by = new Map<SectionKey, string[]>();
    for (const key of sectionKeyList) by.set(key, []);
    for (const l of links.filter((l) => l.groupId === groupId)) {
      const key = l.sectionId?.trim() ? l.sectionId.trim() : DEFAULT_SECTION_ID;
      if (!by.has(key)) by.set(key, []);
      by.get(key)!.push(l.id);
    }
    for (const [key, ids] of by) {
      ids.sort((a, b) => (linkById.get(a)?.order ?? 0) - (linkById.get(b)?.order ?? 0));
      by.set(key, ids);
    }
    return by;
  }, [groupId, links, linkById, sectionKeyList]);

  const [sectionOrder, setSectionOrder] = useState<string[]>(realSections.map((s) => s.id));
  const [linksBySection, setLinksBySection] = useState<Record<string, string[]>>({});
  const [active, setActive] = useState<ActiveDrag | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuTriggerRef = useRef<HTMLDivElement | null>(null);
  const createMenuPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSectionOrder(realSections.map((s) => s.id));
    const obj: Record<string, string[]> = {};
    for (const key of sectionKeyList) obj[key] = linkIdsBySectionFromProps.get(key) ?? [];
    setLinksBySection(obj);
    setCollapsed((prev) => {
      const next: Record<string, boolean> = {};
      for (const key of sectionKeyList) next[key] = prev[key] ?? false;
      return next;
    });
  }, [groupId, realSections, sectionKeyList, linkIdsBySectionFromProps]);

  function isCollapsed(sectionKey: SectionKey) {
    return !!collapsed[sectionKey];
  }

  function toggleCollapsed(sectionKey: SectionKey) {
    setCollapsed((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  }

  useEffect(() => {
    if (!createMenuOpen) return;

    const onPointerDownCapture = (e: PointerEvent) => {
      const triggerEl = createMenuTriggerRef.current;
      const panelEl = createMenuPanelRef.current;
      if (!triggerEl || !panelEl) return;
      if (!(e.target instanceof Node)) return;
      if (triggerEl.contains(e.target)) return;
      if (panelEl.contains(e.target)) return;
      setCreateMenuOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCreateMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDownCapture, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [createMenuOpen]);

  function sectionForSortableId(raw: string) {
    const parsed = parseId(raw);
    if (!parsed || parsed.kind !== "section") return null;
    return realSections.find((s) => s.id === parsed.id) ?? null;
  }

  function linkForSortableId(raw: string) {
    const parsed = parseId(raw);
    if (!parsed || parsed.kind !== "link") return null;
    return linkById.get(parsed.id) ?? null;
  }

  function findSectionKeyForLink(linkId: string): SectionKey {
    for (const [k, ids] of Object.entries(linksBySection)) {
      if (ids.includes(linkId)) return k;
    }
    const l = linkById.get(linkId);
    return l?.sectionId?.trim() ? l.sectionId.trim() : DEFAULT_SECTION_ID;
  }

  function findSectionKeyForLinkInState(linkId: string, state: Record<string, string[]>): SectionKey {
    for (const [k, ids] of Object.entries(state)) {
      if (ids.includes(linkId)) return k;
    }
    const l = linkById.get(linkId);
    return l?.sectionId?.trim() ? l.sectionId.trim() : DEFAULT_SECTION_ID;
  }

  function onDragStart(e: DragStartEvent) {
    const raw = String(e.active.id);
    const parsed = parseId(raw);
    if (!parsed) return;
    if (parsed.kind === "section") {
      setActive({ kind: "section", sectionId: parsed.id });
      return;
    }
    if (parsed.kind === "link") {
      const from = findSectionKeyForLink(parsed.id);
      setActive({ kind: "link", linkId: parsed.id, fromSectionKey: from });
    }
  }

  function moveLinkBetweenSections(linkId: string, toSectionKey: SectionKey, overLinkId?: string) {
    setLinksBySection((prev) => {
      const fromKey = findSectionKeyForLinkInState(linkId, prev);
      if (!prev[fromKey] || !prev[toSectionKey]) return prev;

      const fromIds = prev[fromKey] ?? [];
      const toIds = prev[toSectionKey] ?? [];
      const fromIndex = fromIds.indexOf(linkId);
      if (fromIndex < 0) return prev;

      // Reorder within same container
      if (fromKey === toSectionKey) {
        if (!overLinkId) return prev;
        const toIndex = fromIds.indexOf(overLinkId);
        if (toIndex < 0) return prev;
        if (fromIndex === toIndex) return prev;
        return { ...prev, [fromKey]: arrayMove(fromIds, fromIndex, toIndex) };
      }

      // Move across containers
      const nextFrom = removeAt(fromIds, fromIndex);
      let insertIndex = toIds.length;
      if (overLinkId) {
        const overIndex = toIds.indexOf(overLinkId);
        if (overIndex >= 0) insertIndex = overIndex;
      }
      const nextTo = insertAt(toIds, insertIndex, linkId);
      return { ...prev, [fromKey]: nextFrom, [toSectionKey]: nextTo };
    });
  }

  function onDragOver(e: DragOverEvent) {
    if (!active || active.kind !== "link") return;
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    const parsed = parseId(overId);
    if (!parsed) return;

    const linkId = active.linkId;
    if (parsed.kind === "section") {
      const toKey = parsed.id || DEFAULT_SECTION_ID;
      if (!linksBySection[toKey]) return;
      moveLinkBetweenSections(linkId, toKey);
      return;
    }
    if (parsed.kind === "container") {
      const toKey = parsed.id || DEFAULT_SECTION_ID;
      if (!linksBySection[toKey]) return;
      moveLinkBetweenSections(linkId, toKey);
      return;
    }

    if (parsed.kind === "link") {
      const overLink = parsed.id;
      const toKey = findSectionKeyForLink(overLink);
      moveLinkBetweenSections(linkId, toKey, overLink);
    }
  }

  function buildReorderPayload(
    sectionOrderOverride: string[] = sectionOrder,
    linksBySectionOverride: Record<string, string[]> = linksBySection
  ) {
    const sectionsPayload = sectionOrderOverride.map((id, order) => ({ id, order }));
    const linksPayload: { id: string; order: number; sectionId: string | null }[] = [];
    for (const [sectionKey, ids] of Object.entries(linksBySectionOverride)) {
      for (let order = 0; order < ids.length; order++) {
        linksPayload.push({ id: ids[order]!, order, sectionId: sectionKey === DEFAULT_SECTION_ID ? null : sectionKey });
      }
    }
    return { sections: sectionsPayload, links: linksPayload };
  }

  async function onDragEnd(e: DragEndEvent) {
    const a = active;
    setActive(null);

    const fromRaw = e.active?.id ? String(e.active.id) : null;
    const overRaw = e.over?.id ? String(e.over.id) : null;
    if (!a || !fromRaw || !overRaw) return;

    if (a.kind === "section") {
      const overParsed = parseId(overRaw);
      if (!overParsed || overParsed.kind !== "section") return;
      const from = a.sectionId;
      const to = overParsed.id;
      if (from === to) return;
      const oldIndex = sectionOrder.indexOf(from);
      const newIndex = sectionOrder.indexOf(to);
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(sectionOrder, oldIndex, newIndex);
      setSectionOrder(next);
      await onPersistReorder(buildReorderPayload(next, linksBySection));
      return;
    }

    if (a.kind === "link") {
      await onPersistReorder(buildReorderPayload(sectionOrder, linksBySection));
    }
  }

  function onDragCancel() {
    setActive(null);
    const obj: Record<string, string[]> = {};
    for (const key of sectionKeyList) obj[key] = linkIdsBySectionFromProps.get(key) ?? [];
    setLinksBySection(obj);
    setSectionOrder(realSections.map((s) => s.id));
  }

  const overlayHandle = (
    <span aria-hidden className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/6 dark:bg-white/4">
      <GripVertical size={16} className="opacity-75 shrink-0" />
    </span>
  );

  const overlay = (() => {
    if (!active) return null;
    if (active.kind === "section") {
      const s = realSections.find((x) => x.id === active.sectionId);
      if (!s) return null;
      return <SectionCardOverlay title={s.name} />;
    }
    const l = linkById.get(active.linkId);
    if (!l) return null;
    return <LinkRowOverlay link={l} />;
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{groupName ? `链接 · ${groupName}` : "链接"}</div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={createMenuTriggerRef}>
            <Button
              variant="secondary"
              className="h-9 w-9 px-0"
              aria-label="Create"
              onClick={() => setCreateMenuOpen((v) => !v)}
              disabled={busy}
              leftIcon={<Plus size={18} />}
            />
            <AnimatePresence>
              {createMenuOpen ? (
                <motion.div
                  ref={createMenuPanelRef}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
                  transition={reduceMotion ? { duration: 0.12 } : { type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute right-0 mt-2 w-44 rounded-2xl glass-strong p-2 shadow-[0_30px_90px_rgba(0,0,0,.18)] dark:shadow-[0_30px_110px_rgba(0,0,0,.55)]"
                  role="menu"
                >
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      leftIcon={<Plus size={18} />}
                      onClick={() => {
                        setCreateMenuOpen(false);
                        onCreateSection();
                      }}
                      disabled={busy}
                      role="menuitem"
                    >
                      新增二级分类
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      leftIcon={<Plus size={18} />}
                      onClick={() => {
                        setCreateMenuOpen(false);
                        onCreateLink(null);
                      }}
                      disabled={busy}
                      role="menuitem"
                    >
                      新增链接
                    </Button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragCancel={onDragCancel}
        onDragEnd={(e) => {
          void onDragEnd(e);
        }}
      >
        <SortableContext items={sectionOrder.map(sectionSortableId)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {sectionOrder.map((sid) => {
              const s = realSections.find((x) => x.id === sid);
              if (!s) return null;
              const sectionKey = s.id;
              const linkIds = linksBySection[sectionKey] ?? [];
              return (
                <SortableSectionCard
                  key={s.id}
                  id={sectionSortableId(s.id)}
                  title={s.name}
                  handle={overlayHandle}
                  overlay={false}
                  onEdit={() => onEditSection(s)}
                  actions={
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        className="h-9 w-9 px-0"
                        aria-label={isCollapsed(sectionKey) ? "Expand section" : "Collapse section"}
                        onClick={() => toggleCollapsed(sectionKey)}
                        disabled={busy}
                        leftIcon={isCollapsed(sectionKey) ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                      />
                      <Button variant="ghost" className="h-9 w-9 px-0" onClick={() => onCreateLink(s.id)} disabled={busy} leftIcon={<Plus size={16} />} />
                    </div>
                  }
                >
                  <LinkList
                    sectionKey={sectionKey}
                    linkIds={linkIds}
                    linkById={linkById}
                    onEdit={onEditLink}
                    onDelete={onDeleteLink}
                    busy={busy}
                    collapsed={isCollapsed(sectionKey)}
                  />
                </SortableSectionCard>
              );
            })}

            <SectionCard
              title="未分组"
              subtitle="旧数据/未指定二级分类"
              actions={
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="h-9 w-9 px-0"
                    aria-label={isCollapsed(DEFAULT_SECTION_ID) ? "Expand ungrouped" : "Collapse ungrouped"}
                    onClick={() => toggleCollapsed(DEFAULT_SECTION_ID)}
                    disabled={busy}
                    leftIcon={isCollapsed(DEFAULT_SECTION_ID) ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  />
                  <Button
                    variant="secondary"
                    className="h-9 w-9 px-0"
                    aria-label="Add link to ungrouped"
                    onClick={() => onCreateLink(null)}
                    disabled={busy}
                    leftIcon={<Plus size={16} />}
                  />
                </div>
              }
            >
              <LinkList
                sectionKey={DEFAULT_SECTION_ID}
                linkIds={linksBySection[DEFAULT_SECTION_ID] ?? []}
                linkById={linkById}
                onEdit={onEditLink}
                onDelete={onDeleteLink}
                busy={busy}
                collapsed={isCollapsed(DEFAULT_SECTION_ID)}
              />
            </SectionCard>
          </div>
        </SortableContext>

        {createPortal(
          <div className="fixed inset-0 z-[9999] pointer-events-none">
            <DragOverlay dropAnimation={reduceMotion ? null : undefined}>{overlay}</DragOverlay>
          </div>,
          document.body
        )}
      </DndContext>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  actions,
  children
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-3 dark:bg-white/4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{title}</div>
          {subtitle ? <div className="text-xs text-muted">{subtitle}</div> : null}
        </div>
        {actions ? <div className="flex flex-none items-center gap-2">{actions}</div> : null}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function SectionCardOverlay({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 shadow-[0_30px_90px_rgba(0,0,0,.18)] backdrop-blur-md dark:bg-white/6 dark:shadow-[0_30px_110px_rgba(0,0,0,.55)]">
      <div className="text-sm font-semibold">{title}</div>
    </div>
  );
}

function SortableSectionCard({
  id,
  title,
  handle,
  onEdit,
  actions,
  children
}: {
  id: string;
  title: string;
  handle: React.ReactNode;
  onEdit?: () => void;
  overlay?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = { transform: isDragging ? undefined : CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-40" : undefined}>
      <div className="rounded-2xl border border-white/10 bg-white/6 p-3 dark:bg-white/4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <button
              ref={setActivatorNodeRef}
              type="button"
              aria-label="Drag section"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              className="touch-none select-none [-webkit-user-select:none] cursor-grab active:cursor-grabbing text-muted"
              style={{ WebkitTapHighlightColor: "transparent" }}
              {...attributes}
              {...listeners}
            >
              {handle}
            </button>
            <div className="truncate text-sm font-semibold" onDoubleClick={onEdit}>
              {title}
            </div>
          </div>
          {actions ? <div className="flex flex-none items-center gap-1">{actions}</div> : null}
        </div>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

function LinkList({
  sectionKey,
  linkIds,
  linkById,
  onEdit,
  onDelete,
  busy,
  collapsed
}: {
  sectionKey: string;
  linkIds: string[];
  linkById: Map<string, LinkItem>;
  onEdit: (link: LinkItem) => void;
  onDelete: (link: LinkItem) => void;
  busy: boolean;
  collapsed?: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: containerDroppableId(sectionKey) });
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false} mode="popLayout">
      {collapsed ? (
        <motion.div
          key="collapsed"
          ref={setNodeRef}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition={reduceMotion ? { duration: 0.12 } : { type: "spring", stiffness: 520, damping: 40 }}
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/4 p-3 text-xs text-muted dark:bg-white/3"
        >
          已收起{linkIds.length ? `（${linkIds.length}）` : ""}
        </motion.div>
      ) : (
        <motion.div
          key="open"
          ref={setNodeRef}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
          transition={reduceMotion ? { duration: 0.12 } : { type: "spring", stiffness: 520, damping: 40 }}
          className="overflow-hidden"
        >
          <div className="space-y-2 min-h-[12px]">
            <SortableContext items={linkIds.map(linkSortableId)} strategy={verticalListSortingStrategy}>
              {linkIds.map((id) => {
                const link = linkById.get(id);
                if (!link) return null;
                return (
                  <SortableLinkRow
                    key={id}
                    id={linkSortableId(id)}
                    link={link}
                    busy={busy}
                    onEdit={() => onEdit(link)}
                    onDelete={() => onDelete(link)}
                  />
                );
              })}
            </SortableContext>
            {!linkIds.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/4 p-4 text-xs text-muted dark:bg-white/3">暂无链接</div>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SortableLinkRow({
  id,
  link,
  busy,
  onEdit,
  onDelete
}: {
  id: string;
  link: LinkItem;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = { transform: isDragging ? undefined : CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-40" : undefined}>
      <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/6 p-3 dark:bg-white/4">
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label="Drag link"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          className="touch-none select-none [-webkit-user-select:none] cursor-grab active:cursor-grabbing text-muted"
          style={{ WebkitTapHighlightColor: "transparent" }}
          {...attributes}
          {...listeners}
        >
          <span aria-hidden className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/6 shadow-none dark:bg-white/4">
            <GripVertical size={16} className="opacity-75 shrink-0" />
          </span>
        </button>

        <div className="min-w-0 flex-1" onDoubleClick={onEdit}>
          <div className="truncate text-sm font-semibold">{link.title}</div>
          <div className="mt-1 truncate text-xs text-muted">{link.url}</div>
          {link.description ? <div className="mt-1 line-clamp-2 text-xs text-muted">{link.description}</div> : null}
        </div>

        <div className="ml-auto flex flex-none items-center gap-1" />
      </div>
    </div>
  );
}

function LinkRowOverlay({ link }: { link: LinkItem }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3 shadow-[0_30px_90px_rgba(0,0,0,.18)] backdrop-blur-md dark:bg-white/6 dark:shadow-[0_30px_110px_rgba(0,0,0,.55)]">
      <div className="truncate text-sm font-semibold">{link.title}</div>
      <div className="mt-1 truncate text-xs text-muted">{link.url}</div>
    </div>
  );
}
